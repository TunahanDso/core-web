const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const pty = require("node-pty");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = 8081;
const ROOT = "/tmp/core-terminal";
const SESSION_RE = /^[a-f0-9-]{36}$/i;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_SESSION_MS = 30 * 60 * 1000;
const activeSessions = new Set();

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
  handleProtocols(protocols) {
    return protocols.has("core-terminal") ? "core-terminal" : false;
  },
});

server.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "/", "http://container");
    if (url.pathname !== "/internal/terminal") {
      socket.destroy();
      return;
    }

    const protocolHeader = String(request.headers["sec-websocket-protocol"] || "");
    if (!protocolHeader.split(",").map((value) => value.trim()).includes("core-terminal")) {
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

    const expiresHeader = String(request.headers["x-core-terminal-expires-at"] || "");
    const expiresAt = Date.parse(expiresHeader);
    const hardLifetime = Number.isFinite(expiresAt)
      ? Math.max(1_000, Math.min(MAX_SESSION_MS, expiresAt - Date.now()))
      : MAX_SESSION_MS;

    request.coreTerminal = {
      sessionId,
      workspace,
      cols: clamp(url.searchParams.get("cols"), 40, 240, 120),
      rows: clamp(url.searchParams.get("rows"), 12, 100, 32),
      hardLifetime,
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
  if (activeSessions.has(terminal.sessionId)) {
    ws.close(1013, "session already connected");
    return;
  }
  activeSessions.add(terminal.sessionId);

  const env = {
    ...process.env,
    HOME: terminal.workspace,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    CORE_RUNNER_NETWORK: "deny",
    PS1: "\\[\\033[38;5;208m\\]core\\[\\033[0m\\]:\\[\\033[36m\\]\\w\\[\\033[0m\\]$ ",
  };

  let shell;
  try {
    shell = pty.spawn("/bin/bash", ["--noprofile", "--norc", "-i"], {
      name: "xterm-256color",
      cols: terminal.cols,
      rows: terminal.rows,
      cwd: terminal.workspace,
      env,
    });
  } catch (error) {
    activeSessions.delete(terminal.sessionId);
    try { ws.close(1011, "terminal process failed"); } catch {}
    return;
  }

  let closed = false;
  let idleTimer = null;
  let hardTimer = null;

  const safeSend = (value) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(value)); } catch {}
  };

  const stopShell = () => {
    if (closed) return;
    closed = true;
    if (idleTimer) clearTimeout(idleTimer);
    if (hardTimer) clearTimeout(hardTimer);
    activeSessions.delete(terminal.sessionId);
    try { shell.kill(); } catch {}
  };

  const armIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      safeSend({ type:"runner-error", message:"Terminal idle timeout nedeniyle kapatıldı." });
      try { ws.close(4001, "idle timeout"); } catch {}
      stopShell();
    }, IDLE_TIMEOUT_MS);
    idleTimer.unref?.();
  };

  hardTimer = setTimeout(() => {
    safeSend({ type:"runner-error", message:"Terminal oturum süresi doldu." });
    try { ws.close(4002, "session expired"); } catch {}
    stopShell();
  }, terminal.hardLifetime);
  hardTimer.unref?.();
  armIdleTimer();

  safeSend({ type:"output", data:"\x1b[38;5;208mCORE LIVE TERMINAL\x1b[0m  snapshot workspace hazır\r\n" });

  const dataDisposable = shell.onData((data) => {
    armIdleTimer();
    safeSend({ type:"output", data });
  });
  const exitDisposable = shell.onExit(({ exitCode, signal }) => {
    safeSend({
      type:"exit",
      exitCode:Number.isInteger(exitCode) ? exitCode : null,
      signal:signal || null,
    });
    try { ws.close(1000, "terminal process ended"); } catch {}
    stopShell();
  });

  ws.on("message", (raw) => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch { return; }
    if (!message || typeof message !== "object") return;

    if (message.type === "input") {
      const data = String(message.data || "").slice(0, 32 * 1024);
      if (data) {
        armIdleTimer();
        shell.write(data);
      }
      return;
    }
    if (message.type === "resize") {
      const cols = clamp(message.cols,40,240,terminal.cols);
      const rows = clamp(message.rows,12,100,terminal.rows);
      armIdleTimer();
      try { shell.resize(cols,rows); } catch {}
      return;
    }
    if (message.type === "signal" && String(message.signal) === "SIGINT") {
      armIdleTimer();
      shell.write("\u0003");
      return;
    }
    if (message.type === "ping") {
      safeSend({ type:"pong", at:Date.now() });
    }
  });

  ws.on("close", () => {
    try { dataDisposable.dispose(); } catch {}
    try { exitDisposable.dispose(); } catch {}
    stopShell();
  });
  ws.on("error", stopShell);
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write("[core-terminal] listening on 0.0.0.0:" + PORT + "\n");
});
