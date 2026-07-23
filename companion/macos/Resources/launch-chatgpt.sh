#!/usr/bin/env bash
# App-embedded ChatGPT launcher — clean Launch Services env + shim preload.
# AGENTBUTTONS_PRELOAD may be set by the menu bar app; otherwise use sibling preload.cjs.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PRELOAD="${AGENTBUTTONS_PRELOAD:-$HERE/preload.cjs}"
SOCKET="${AGENTBUTTONS_SHIM_SOCKET:-${TMPDIR:-/tmp}/agentbuttons-codex-micro.sock}"

if [[ ! -f "$PRELOAD" ]]; then
  echo "error: shim not found at $PRELOAD" >&2
  exit 1
fi

APP="${CHATGPT_APP:-/Applications/ChatGPT.app}"
if [[ ! -d "$APP" ]]; then
  echo "error: ChatGPT.app not found at $APP" >&2
  exit 1
fi

echo "Stopping existing ChatGPT (if any)…"
osascript -e 'tell application "ChatGPT" to quit' 2>/dev/null || true
sleep 1
killall ChatGPT 2>/dev/null || true
sleep 1
while read -r pid; do
  [[ -n "${pid:-}" ]] || continue
  kill "$pid" 2>/dev/null || true
done < <(pgrep -x bare-modifier-monitor 2>/dev/null || true)
sleep 0.3

echo "Starting ChatGPT via Launch Services (clean env + shim)"
echo "  preload: $PRELOAD"
echo "  socket:  $SOCKET"

# Critical: env -i so agent shells cannot inject ELECTRON_RUN_AS_NODE=1
exec env -i \
  HOME="${HOME}" \
  USER="${USER:-$(id -un)}" \
  LOGNAME="${LOGNAME:-${USER:-$(id -un)}}" \
  TMPDIR="${TMPDIR:-/tmp}" \
  LANG="${LANG:-en_US.UTF-8}" \
  PATH="/usr/bin:/bin:/usr/sbin:/sbin" \
  /usr/bin/open -n -a "$APP" \
    --env "AGENTBUTTONS_SHIM_SOCKET=${SOCKET}" \
    --env "NODE_OPTIONS=--require ${PRELOAD}" \
    "$@"
