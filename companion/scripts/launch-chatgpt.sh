#!/usr/bin/env bash
# Launch ChatGPT desktop with the agentbuttons HID shim so the app sees a
# virtual Codex Micro. Companion must already be running with --chatgpt.
#
# Launch via Launch Services (`open --env`), not by exec'ing the binary.
# Direct exec / polluted agent shells break macOS TCC (Input Monitoring
# shows "Not granted") even though Dock launches of ChatGPT.app are fine.
#
# Critical: do NOT forward the caller environment into ChatGPT. Coding agents
# often set ELECTRON_RUN_AS_NODE=1; if that reaches ChatGPT, Electron/Codex
# behavior and Input Monitoring checks go wrong while the Micro shim may still
# appear "Connected".
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

BUNDLE_ID="$(
  defaults read "$APP/Contents/Info" CFBundleIdentifier 2>/dev/null || echo "com.openai.codex"
)"

echo "Stopping existing ChatGPT (if any)…"
osascript -e 'tell application "ChatGPT" to quit' 2>/dev/null || true
sleep 1
killall ChatGPT 2>/dev/null || true
sleep 1
# Orphan bare-modifier-monitor processes from prior sessions
while read -r pid; do
  [[ -n "${pid:-}" ]] || continue
  kill "$pid" 2>/dev/null || true
done < <(pgrep -x bare-modifier-monitor 2>/dev/null || true)
sleep 0.5

# Only the vars ChatGPT needs for the shim. Never inherit ELECTRON_RUN_AS_NODE,
# NODE_OPTIONS from the agent, or a developer shell PATH.
CLEAN_HOME="${HOME}"
CLEAN_USER="${USER}"
CLEAN_LOGNAME="${LOGNAME:-$USER}"
CLEAN_TMPDIR="${TMPDIR:-/tmp}"
CLEAN_LANG="${LANG:-en_US.UTF-8}"
CLEAN_PATH="/usr/bin:/bin:/usr/sbin:/sbin"

echo "Starting ChatGPT via Launch Services (clean env + shim)"
echo "  app:     $APP"
echo "  bundle:  $BUNDLE_ID"
echo "  socket:  $SOCKET"
echo "  preload: $PRELOAD"
echo "  stripped: ELECTRON_RUN_AS_NODE (and other agent env)"
echo "Companion must be running: node companion/dist/cli.js --chatgpt --socket \"$SOCKET\""
echo ""
echo "In ChatGPT after it opens:"
echo "  1. Codex Micro → Connection should be Connected"
echo "  2. Input Monitoring should stay granted (same as Dock launch)"
echo "  3. Assign threads to agent keys (slots 1–6)"

# env -i: no agent pollution. open --env: only our shim variables.
# -n: force a new instance so --env is applied.
exec env -i \
  HOME="$CLEAN_HOME" \
  USER="$CLEAN_USER" \
  LOGNAME="$CLEAN_LOGNAME" \
  TMPDIR="$CLEAN_TMPDIR" \
  LANG="$CLEAN_LANG" \
  PATH="$CLEAN_PATH" \
  /usr/bin/open -n -a "$APP" \
    --env "AGENTBUTTONS_SHIM_SOCKET=${SOCKET}" \
    --env "NODE_OPTIONS=--require ${PRELOAD}" \
    "$@"
