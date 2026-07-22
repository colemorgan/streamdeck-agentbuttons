#!/usr/bin/env bash
# Launch ChatGPT desktop with the agentbuttons HID shim so the app sees a
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

BINARY="$APP/Contents/MacOS/ChatGPT"
if [[ ! -x "$BINARY" ]]; then
  BINARY="$(find "$APP/Contents/MacOS" -type f -perm +111 2>/dev/null | head -1 || true)"
fi
if [[ -z "${BINARY:-}" || ! -x "$BINARY" ]]; then
  echo "error: could not find ChatGPT executable under $APP" >&2
  exit 1
fi

echo "Stopping existing ChatGPT (if any)…"
osascript -e 'tell application "ChatGPT" to quit' 2>/dev/null || true
sleep 1
killall ChatGPT 2>/dev/null || true
sleep 1

export AGENTBUTTONS_SHIM_SOCKET="$SOCKET"
export NODE_OPTIONS="--require ${PRELOAD}"

echo "Starting ChatGPT with agentbuttons shim"
echo "  binary: $BINARY"
echo "  socket: $SOCKET"
echo "  NODE_OPTIONS=$NODE_OPTIONS"
echo "Companion must be running: node companion/dist/cli.js --chatgpt --socket \"$SOCKET\""
echo ""
echo "In ChatGPT after it opens:"
echo "  1. Open Codex / threads sidebar"
echo "  2. Look for Codex Micro / Agent keys settings"
echo "  3. Assign threads to agent keys (slots 1–6)"
echo "  4. Match Stream Deck Agent Slot numbers to those keys"

exec "$BINARY" "$@"
