const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = 8081;
const ROOT = "/tmp/core-terminal";
const SESSION_RE = /^[a-f0-9-]{36}$/i;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const HARD_TIMEOUT_MS = 30 * 60 * 1000;
const activeSessions = new Map();

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function audit(event, details = {}) {
  try {
    process.stdout.write(JSON.stringify({
      service:"core-terminal",
      event,
      at:new Date().toISOString(),
      ...details,
    }) + "\n");
  } catch {}
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    json(res, 200, {
      ok: true,
      service: "core-terminal",
      transport: "container-websocket",
      activeSessions: activeSessions.size,
    });
    return;
  }
  json(res, 404, { error: "not_found" });
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 64 * 1024,
});

server.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "/", "http://container");
    if (url.pathname !== "/internal/terminal") {
      socket.destroy();
      return;
    }

    const sessionId = String(request.headers["x-core-terminal-session"] || "");
    if (!SESSION_RE.test(sessionId)) {
      socket.destroy();
      return;
    }

    if (activeSessions.has(sessionId)) {
      audit("duplicate_connection_rejected", { sessionId });
      socket.write("HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const workspace = path.join(ROOT, sessionId);
    if (!fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) {
      socket.destroy();
      return;
    }

    request.coreTerminal = {
      sessionId,
      workspace,
      cols: clamp(url.searchParams.get("cols"), 40, 240, 120),
      rows: clamp(url.searchParams.get("rows"), 12, 100, 32),
    };

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } catch {
    socket.destroy();
  }
});

wss.on("connection", (ws, request) => {
  const terminal = request.coreTerminal;
  if (!terminal || activeSessions.has(terminal.sessionId)) {
    ws.close(1008, "invalid or duplicate session");
    return;
  }

  const startedAt = Date.now();
  let inputBytes = 0;
  let outputBytes = 0;
  let closed = false;
  let closeReason = "socket_closed";
  let idleTimer = null;
  let hardTimer = null;

  activeSessions.set(terminal.sessionId, ws);
  audit("session_open", {
    sessionId:terminal.sessionId,
    cols:terminal.cols,
    rows:terminal.rows,
  });

  const shell =
    "umask 077" +
    "; ulimit -n 64" +
    "; ulimit -u 128 2>/dev/null || true" +
    "; stty cols " + terminal.cols + " rows " + terminal.rows +
    "; printf '\\033[38;5;208mCORE LIVE TERMINAL\\033[0m  izole snapshot workspace hazır\\r\\n'" +
    "; exec bash --noprofile --norc -i";

  const child = spawn("script", ["-qefc", shell, "/dev/null"], {
    cwd: terminal.workspace,
    env: {
      PATH: "/usr/local/bin:/usr/bin:/bin",
      HOME: terminal.workspace,
      TMPDIR: path.join(terminal.workspace, ".tmp"),
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      CORE_RUNNER_NETWORK: "deny",
      PS1: "\\[\\033[38;5;208m\\]core\\[\\033[0m\\]:\\[\\033[36m\\]\\w\\[\\033[0m\\]$ ",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const safeSend = (value) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(value)); } catch {}
  };

  const armIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      closeReason = "idle_timeout";
      safeSend({ type:"runner-error", message:"Terminal 10 dakika kullanıcı etkinliği olmadığı için kapatıldı." });
      try { ws.close(1000, "idle timeout"); } catch {}
    }, IDLE_TIMEOUT_MS);
    idleTimer.unref?.();
  };

  const stopChild = () => {
    if (closed) return;
    closed = true;
    if (idleTimer) clearTimeout(idleTimer);
    if (hardTimer) clearTimeout(hardTimer);
    activeSessions.delete(terminal.sessionId);
    try { child.kill("SIGTERM"); } catch {}
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
    }, 1500);
    timer.unref?.();
    audit("session_close", {
      sessionId:terminal.sessionId,
      reason:closeReason,
      durationMs:Date.now() - startedAt,
      inputBytes,
      outputBytes,
    });
  };

  const sendOutput = (chunk) => {
    outputBytes += chunk.length;
    safeSend({ type: "output", data: chunk.toString("utf8") });
  };

  child.stdout.on("data", sendOutput);
  child.stderr.on("data", sendOutput);

  child.on("error", (error) => {
    closeReason = "process_error";
    safeSend({ type: "runner-error", message: String(error?.message || error || "terminal process error") });
    try { ws.close(1011, "terminal process failed"); } catch {}
  });

  child.on("exit", (code, signal) => {
    closeReason = "process_exit";
    safeSend({
      type: "exit",
      exitCode: Number.isInteger(code) ? code : null,
      signal: signal || null,
    });
    try { ws.close(1000, "terminal process ended"); } catch {}
  });

  ws.on("message", (raw) => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch { return; }
    if (!message || typeof message !== "object") return;

    if (message.type === "input") {
      const data = String(message.data || "").slice(0, 32 * 1024);
      inputBytes += Buffer.byteLength(data);
      armIdleTimer();
      if (!child.stdin.destroyed) child.stdin.write(data);
      return;
    }

    if (message.type === "signal" && String(message.signal) === "SIGINT") {
      inputBytes += 1;
      armIdleTimer();
      if (!child.stdin.destroyed) child.stdin.write("\u0003");
      return;
    }

    if (message.type === "ping") {
      safeSend({ type: "pong", at: Date.now() });
    }
  });

  ws.on("close", () => {
    if (closeReason === "socket_closed") closeReason = "client_disconnect";
    stopChild();
  });
  ws.on("error", () => {
    closeReason = "socket_error";
    stopChild();
  });

  armIdleTimer();
  hardTimer = setTimeout(() => {
    closeReason = "hard_timeout";
    safeSend({ type:"runner-error", message:"Terminal 30 dakikalık mutlak oturum sınırına ulaştı." });
    try { ws.close(1000, "session lifetime reached"); } catch {}
  }, HARD_TIMEOUT_MS);
  hardTimer.unref?.();
});

server.listen(PORT, "0.0.0.0", () => {
  audit("listening", {
    bind:"0.0.0.0",
    port:PORT,
    boundary:"Cloudflare container private port; public access requires RunnerContainer gate",
  });
});
