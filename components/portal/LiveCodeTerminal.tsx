"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

type ConnectionState = "idle" | "connecting" | "connected" | "closed" | "error";

export default function LiveCodeTerminal({
  socketUrl,
  socketToken,
  repository,
  snapshotRef,
  snapshotSha,
}: {
  socketUrl: string | null;
  socketToken: string | null;
  repository: string;
  snapshotRef: string;
  snapshotSha?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [connection, setConnection] = useState<ConnectionState>(socketUrl ? "connecting" : "idle");
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 6000,
      convertEol: false,
      allowTransparency: false,
      theme: {
        background: "#11100f",
        foreground: "#f5f1ea",
        cursor: "#ff7a00",
        cursorAccent: "#11100f",
        selectionBackground: "#5a3419",
        black: "#1b1917",
        red: "#ff6259",
        green: "#7bd88f",
        yellow: "#f7c66a",
        blue: "#82aaff",
        magenta: "#c792ea",
        cyan: "#89ddff",
        white: "#f5f1ea",
        brightBlack: "#736d66",
        brightRed: "#ff857f",
        brightGreen: "#a4e6b1",
        brightYellow: "#ffe0a3",
        brightBlue: "#a7c7ff",
        brightMagenta: "#dfb5f6",
        brightCyan: "#b6ecff",
        brightWhite: "#ffffff",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(hostRef.current);
    fit.fit();
    terminal.focus();

    terminalRef.current = terminal;
    fitRef.current = fit;
    terminal.writeln("\x1b[38;5;208mYTÜ CORE · LIVE TERMINAL\x1b[0m");
    terminal.writeln("\x1b[2mİzole snapshot workspace hazırlanıyor…\x1b[0m\r\n");

    let disposed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (!socketUrl || disposed) {
        setConnection("idle");
        terminal.writeln("\x1b[33mTerminal oturumu bağlantıya açık değil.\x1b[0m");
        return;
      }
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
      ) return;

      setConnection("connecting");
      const target = new URL(socketUrl);
      target.searchParams.set("cols",String(terminal.cols || 120));
      target.searchParams.set("rows",String(terminal.rows || 32));
      if (!socketToken) {
        setConnection("error");
        terminal.writeln("\x1b[31mTerminal bağlantı capability'si bulunamadı.\x1b[0m");
        return;
      }
      const socket = new WebSocket(target.toString(), ["core-terminal",socketToken]);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setConnection("connected");
        terminal.writeln("\x1b[32m● CORE Runner container bağlı\x1b[0m\r\n");
        terminal.focus();
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data || ""));
          if (message.type === "output") terminal.write(String(message.data || ""));
          if (message.type === "exit") {
            const code = Number(message.exitCode);
            setExitCode(Number.isFinite(code) ? code : null);
            terminal.writeln("\r\n\x1b[2m[CORE] shell kapandı · exit " + String(message.exitCode ?? "?") + "\x1b[0m");
          }
          if (message.type === "runner-error") {
            terminal.writeln("\r\n\x1b[31m[CORE] " + String(message.message || "terminal process error") + "\x1b[0m");
          }
        } catch {
          terminal.write(String(event.data || ""));
        }
      });
      socket.addEventListener("close", (event) => {
        if (disposed) return;
        setConnection("closed");
        terminal.writeln("\r\n\x1b[33m[CORE] terminal bağlantısı kapandı (" + event.code + ").\x1b[0m");
      });
      socket.addEventListener("error", () => {
        if (disposed) return;
        setConnection("error");
        terminal.writeln("\r\n\x1b[31m[CORE] WebSocket bağlantı hatası.\x1b[0m");
      });

      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type:"ping" }));
        }
      },15000);
    };

    const inputDisposable = terminal.onData((data) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type:"input",data }));
      }
    });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      try { fit.fit(); } catch {}
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type:"resize",
            cols:terminal.cols,
            rows:terminal.rows,
          }));
        }
      },80);
    });
    resizeObserver.observe(hostRef.current);

    connect();

    return () => {
      disposed = true;
      inputDisposable.dispose();
      resizeObserver.disconnect();
      if (heartbeat) clearInterval(heartbeat);
      if (resizeTimer) clearTimeout(resizeTimer);
      const socket = socketRef.current;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000,"page closed");
      terminal.dispose();
      terminalRef.current = null;
      socketRef.current = null;
    };
  },[socketUrl,socketToken]);

  const sendControl = (data: string) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type:"input",data }));
    terminalRef.current?.focus();
  };

  const copySelection = async () => {
    const selection = terminalRef.current?.getSelection() || "";
    if (!selection) return;
    try { await navigator.clipboard.writeText(selection); } catch {}
    terminalRef.current?.focus();
  };

  const connectionLabel: Record<ConnectionState,string> = {
    idle: "KAPALI",
    connecting: "BAĞLANIYOR",
    connected: "CANLI",
    closed: "KAPANDI",
    error: "HATA",
  };

  return (
    <section className="liveTerminalShell">
      <header className="liveTerminalToolbar">
        <div className="liveTerminalIdentity">
          <span className={"liveTerminalDot " + connection} />
          <div>
            <b>{repository}</b>
            <small>{snapshotRef} · {snapshotSha ? snapshotSha.slice(0,12) : "snapshot hazırlanıyor"}</small>
          </div>
        </div>
        <div className="liveTerminalState">
          <span>{connectionLabel[connection]}</span>
          {exitCode !== null ? <small>EXIT {exitCode}</small> : null}
        </div>
        <div className="liveTerminalTools">
          <button type="button" onClick={() => sendControl("\u0003")} disabled={connection !== "connected"}>CTRL+C</button>
          <button type="button" onClick={() => sendControl("\u000c")} disabled={connection !== "connected"}>CTRL+L</button>
          <button type="button" onClick={() => sendControl("\t")} disabled={connection !== "connected"}>TAB</button>
          <button type="button" onClick={copySelection}>KOPYALA</button>
          <button type="button" onClick={() => terminalRef.current?.clear()}>TEMİZLE</button>
          <button type="button" onClick={() => window.location.reload()}>YENİLE</button>
        </div>
      </header>
      <div className="liveTerminalCanvas" ref={hostRef} />
      <footer className="liveTerminalFooter">
        <span>EPHEMERAL WORKSPACE</span>
        <span>NETWORK DENY</span>
        <span>30 DK OTURUM</span>
        <span>STDIN / STDOUT STREAM</span>
      </footer>
    </section>
  );
}
