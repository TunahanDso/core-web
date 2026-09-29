const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = 8081;
const ROOT = "/tmp/core-terminal";
const SESSION_RE = /^[a-f0-9-]{36}$/i;

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

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    json(res, 200, { ok: true, service: "core-terminal", transport: "container-websocket" });
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
  if (!terminal) {
    ws.close(1008, "invalid session");
    return;
  }

  const shell =
    "stty cols " + terminal.cols + " rows " + terminal.rows +
    "; printf '\\033[38;5;208mCORE LIVE TERMINAL\\033[0m  snapshot workspace hazır\\r\\n'" +
    "; exec bash --noprofile --norc -i";

  const child = spawn("script", ["-qefc", shell, "/dev/null"], {
    cwd: terminal.workspace,
    env: {
      ...process.env,
      HOME: terminal.workspace,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      CORE_RUNNER_NETWORK: "deny",
      PS1: "\\[\\033[38;5;208m\\]core\\[\\033[0m\\]:\\[\\033[36m\\]\\w\\[\\033[0m\\]$ ",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let closed = false;
  const safeSend = (value) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(value)); } catch {}
  };
  const stopChild = () => {
    if (closed) return;
    closed = true;
    try { child.kill("SIGTERM"); } catch {}
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
    }, 1500);
    timer.unref?.();
  };

  child.stdout.on("data", (chunk) => safeSend({ type: "output", data: chunk.toString("utf8") }));
  child.stderr.on("data", (chunk) => safeSend({ type: "output", data: chunk.toString("utf8") }));

  child.on("error", (error) => {
    safeSend({ type: "runner-error", message: String(error?.message || error || "terminal process error") });
    try { ws.close(1011, "terminal process failed"); } catch {}
  });

  child.on("exit", (code, signal) => {
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
      if (!child.stdin.destroyed) child.stdin.write(data);
      return;
    }
    if (message.type === "signal" && String(message.signal) === "SIGINT") {
      if (!child.stdin.destroyed) child.stdin.write("\u0003");
      return;
    }
    if (message.type === "ping") {
      safeSend({ type: "pong", at: Date.now() });
    }
  });

  ws.on("close", stopChild);
  ws.on("error", stopChild);
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write("[core-terminal] listening on 0.0.0.0:" + PORT + "\n");
});
