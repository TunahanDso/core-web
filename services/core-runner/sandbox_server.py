#!/usr/bin/env python3
import base64
import json
import mimetypes
import os
import shutil
import signal
import subprocess
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TASKS = {
    "python-test": [["python3", "-m", "pytest", "-q"]],
    "python-script": [["python3", "main.py"]],
    "js-test": [["vitest", "run"]],
    "js-script": [["node", "index.js"]],
    "ts-typecheck": [["tsc", "--noEmit"]],
    "ts-test": [["vitest", "run"]],
    "c-build": [
        ["cmake", "-S", ".", "-B", "build", "-G", "Ninja"],
        ["cmake", "--build", "build", "--parallel", "2"],
    ],
    "c-test": [
        ["cmake", "-S", ".", "-B", "build", "-G", "Ninja"],
        ["cmake", "--build", "build", "--parallel", "2"],
        ["ctest", "--test-dir", "build", "--output-on-failure"],
    ],
    "cpp-build": [
        ["cmake", "-S", ".", "-B", "build", "-G", "Ninja"],
        ["cmake", "--build", "build", "--parallel", "2"],
    ],
    "cpp-test": [
        ["cmake", "-S", ".", "-B", "build", "-G", "Ninja"],
        ["cmake", "--build", "build", "--parallel", "2"],
        ["ctest", "--test-dir", "build", "--output-on-failure"],
    ],
}

LANGUAGE = {
    "python-test": "python",
    "python-script": "python",
    "js-test": "javascript",
    "js-script": "javascript",
    "ts-typecheck": "typescript",
    "ts-test": "typescript",
    "c-build": "c",
    "c-test": "c",
    "cpp-build": "cpp",
    "cpp-test": "cpp",
}

MAX_BODY = 32 * 1024 * 1024
MAX_FILES = 1200
MAX_SNAPSHOT = 16 * 1024 * 1024
MAX_OUTPUT = 1_000_000
MAX_ARTIFACTS = 50
MAX_ARTIFACT_BYTES = 5 * 1024 * 1024
ARTIFACT_DIRS = ("coverage", "test-results", "reports", "artifacts", "build")
TEXT_ARTIFACT_EXT = {".txt", ".log", ".json", ".xml", ".lcov", ".html", ".md"}

def safe_relative_path(raw):
    value = str(raw or "").replace("\\", "/").lstrip("/")
    if not value or "\x00" in value:
        return None
    parts = value.split("/")
    if any(part in ("", ".", "..") for part in parts):
        return None
    return Path(*parts)

def materialize_files(files, workspace):
    if not isinstance(files, list) or len(files) > MAX_FILES:
        raise ValueError("Snapshot file limit exceeded.")
    if workspace.exists():
        shutil.rmtree(workspace, ignore_errors=True)
    workspace.mkdir(parents=True, exist_ok=True)

    total = 0
    for item in files:
        rel = safe_relative_path(item.get("path"))
        if rel is None:
            raise ValueError("Unsafe snapshot path.")
        data = base64.b64decode(str(item.get("contentBase64") or ""), validate=True)
        total += len(data)
        if total > MAX_SNAPSHOT:
            raise ValueError("Snapshot byte limit exceeded.")
        target = workspace / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return total

def clamp(data, limit=MAX_OUTPUT):
    if len(data) <= limit:
        return data
    suffix = b"\n\n[CORE RUNNER OUTPUT TRUNCATED]\n"
    return data[: max(0, limit - len(suffix))] + suffix

def collect_artifacts(workspace):
    artifacts = []
    total = 0
    seen = set()
    for directory in ARTIFACT_DIRS:
        root = workspace / directory
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if len(artifacts) >= MAX_ARTIFACTS:
                return artifacts
            if not path.is_file() or path.is_symlink():
                continue
            try:
                rel = path.relative_to(workspace)
                size = path.stat().st_size
            except OSError:
                continue
            if size <= 0 or size > 2 * 1024 * 1024:
                continue
            interesting = path.suffix.lower() in TEXT_ARTIFACT_EXT or os.access(path, os.X_OK)
            if not interesting:
                continue
            key = str(rel)
            if key in seen or total + size > MAX_ARTIFACT_BYTES:
                continue
            seen.add(key)
            try:
                data = path.read_bytes()
            except OSError:
                continue
            total += len(data)
            artifacts.append({
                "name": path.name,
                "path": key,
                "kind": "executable" if os.access(path, os.X_OK) else "report",
                "mimeType": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                "contentBase64": base64.b64encode(data).decode("ascii"),
                "size": len(data),
            })
    return artifacts

def execute_job(payload):
    job_id = str(payload.get("jobId") or "")
    task_id = str(payload.get("task") or "")
    language = str(payload.get("language") or "")
    files = payload.get("files") or []
    limits = payload.get("limits") or {}
    timeout = max(5, min(int(limits.get("timeoutSeconds") or 120), 300))

    if not job_id or task_id not in TASKS or LANGUAGE.get(task_id) != language:
        raise ValueError("Invalid fixed task contract.")
    workspace = Path(tempfile.gettempdir()) / "core-runner" / job_id
    materialize_files(files, workspace)

    stdout_chunks = []
    stderr_chunks = []
    exit_code = 0
    timed_out = False
    started = time.monotonic()
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(workspace),
        "TMPDIR": str(workspace / ".tmp"),
        "CI": "1",
        "TERM": "dumb",
        "CORE_RUNNER_NETWORK": "deny",
    }
    Path(env["TMPDIR"]).mkdir(exist_ok=True)

    for argv in TASKS[task_id]:
        elapsed = time.monotonic() - started
        remaining = timeout - elapsed
        if remaining <= 0:
            timed_out = True
            exit_code = 124
            break
        stdout_chunks.append(("$ " + " ".join(argv) + "\n").encode())
        try:
            process = subprocess.Popen(
                argv,
                cwd=workspace,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                start_new_session=True,
            )
            try:
                out, err = process.communicate(timeout=remaining)
            except subprocess.TimeoutExpired:
                timed_out = True
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                out, err = process.communicate()
                exit_code = 124
            stdout_chunks.append(out or b"")
            stderr_chunks.append(err or b"")
            if timed_out:
                break
            exit_code = int(process.returncode or 0)
            if exit_code != 0:
                break
        except FileNotFoundError as exc:
            exit_code = 127
            stderr_chunks.append((str(exc) + "\n").encode())
            break

    duration_ms = int((time.monotonic() - started) * 1000)
    stdout = clamp(b"".join(stdout_chunks)).decode("utf-8", errors="replace")
    stderr = clamp(b"".join(stderr_chunks)).decode("utf-8", errors="replace")
    status = "timed_out" if timed_out else "passed" if exit_code == 0 else "failed"
    artifacts = collect_artifacts(workspace)

    shutil.rmtree(workspace, ignore_errors=True)
    return {
        "status": status,
        "exitCode": exit_code,
        "durationMs": duration_ms,
        "stdout": stdout,
        "stderr": stderr,
        "artifacts": artifacts,
    }

def prepare_terminal(payload):
    session_id = str(payload.get("sessionId") or "")
    files = payload.get("files") or []
    if not session_id or len(session_id) > 80 or any(ch not in "0123456789abcdefABCDEF-" for ch in session_id):
        raise ValueError("Invalid terminal session.")
    workspace = Path(tempfile.gettempdir()) / "core-terminal" / session_id
    total = materialize_files(files, workspace)
    tmpdir = workspace / ".tmp"
    tmpdir.mkdir(exist_ok=True)
    return {
        "ok": True,
        "workspace": str(workspace),
        "fileCount": len(files),
        "sizeBytes": total,
    }

class Handler(BaseHTTPRequestHandler):
    server_version = "CORE-RUNNER/1"

    def _json(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True, "sandbox": "container", "network": "deny"})
        else:
            self._json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path not in ("/run", "/prepare-terminal"):
            self._json(404, {"error": "not_found"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size <= 0 or size > MAX_BODY:
            self._json(413, {"error": "payload_too_large"})
            return
        try:
            payload = json.loads(self.rfile.read(size))
            if self.path == "/prepare-terminal":
                self._json(200, prepare_terminal(payload))
                return
            result = execute_job(payload)
            self._json(200, result)
        except Exception as exc:
            if self.path == "/prepare-terminal":
                self._json(400, {"ok": False, "error": str(exc)[:12000]})
                return
            self._json(400, {
                "status": "failed",
                "exitCode": None,
                "stdout": "",
                "stderr": str(exc)[:12000],
                "artifacts": [],
            })

    def log_message(self, fmt, *args):
        return

if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    server.serve_forever()
