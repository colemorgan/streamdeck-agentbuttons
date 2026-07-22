#!/usr/bin/env bash
# Launch ChatGPT desktop with the agentbuttons node-hid shim so the app sees a
# virtual Codex Micro. Companion must already be running with --chatgpt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRELOAD="$ROOT/shim/preload.cjs"
SOCKET="${AGENTBUTTONS_SHIM_SOCKET:-${TMPDIR:-/tmp}/agentbuttons-codex-micro.sock}"

if [[ ! -f "$PRELOAD" ]]; then
  echo "error: shim not found at $PRELOAD" >&2
  exit 1
fi

APP="${CHATGPT_APP:-/Applications/ChatGPT.app}"
if [[ ! -d "$APP" ]]; then
  echo "error: ChatGPT.app not found at $APP" >&2
  echo "Set CHATGPT_APP to your ChatGPT desktop bundle path." >&2
  exit 1
fi

# Prefer direct binary so NODE_OPTIONS propagates (open(1) may not).
BINARY="$APP/Contents/MacOS/ChatGPT"
if [[ ! -x "$BINARY" ]]; then
  # Some builds nest the binary
  BINARY="$(find "$APP/Contents/MacOS" -type f -perm +111 | head -1 || true)"
fi
if [[ -z "${BINARY:-}" || ! -x "$BINARY" ]]; then
  echo "error: could not find ChatGPT executable under $APP" >&2
  exit 1
fi

# Quit existing instance so it reloads with the shim
if pgrep -f "ChatGPT" >/dev/null 2>&1; then
  echo "Quitting existing ChatGPT…"
  osascript -e 'tell application "ChatGPT" to quit' 2>/dev/null || true
  sleep 1
fi

export AGENTBUTTONS_SHIM_SOCKET="$SOCKET"
export NODE_OPTIONS="${NODE_OPTIONS:-} --require $PRELOAD"

echo "Starting ChatGPT with agentbuttons shim"
echo "  binary: $BINARY"
echo "  socket: $SOCKET"
echo "  NODE_OPTIONS=$NODE_OPTIONS"
echo "Companion must be running: node companion/dist/cli.js --chatgpt"
exec "$BINARY" "$@"
