#!/bin/sh
set -eu

python3 /opt/core-runner/sandbox_server.py &
SANDBOX_PID=$!

node /opt/core-runner/terminal_server.cjs &
TERMINAL_PID=$!

cleanup() {
  kill "$SANDBOX_PID" "$TERMINAL_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

while kill -0 "$SANDBOX_PID" 2>/dev/null && kill -0 "$TERMINAL_PID" 2>/dev/null; do
  sleep 1
done

wait "$SANDBOX_PID" "$TERMINAL_PID" || true
exit 1
