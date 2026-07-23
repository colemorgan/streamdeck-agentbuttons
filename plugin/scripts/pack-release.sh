#!/usr/bin/env bash
# Build plugin, pack a release copy with Debug=disabled (workspace stays dev-friendly).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/plugin/com.colemorgan.codex-agent-buttons.sdPlugin"
OUT_DIR="${AGENTBUTTONS_PACK_OUT:-$ROOT/dist/release}"
VERSION="${AGENTBUTTONS_PLUGIN_VERSION:-1.0.0.0}"
STAGE="$OUT_DIR/stage/com.colemorgan.codex-agent-buttons.sdPlugin"

mkdir -p "$OUT_DIR"

echo "== Build protocol + plugin =="
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/plugin

echo "== Stage release copy (Debug disabled, version $VERSION) =="
rm -rf "$OUT_DIR/stage"
mkdir -p "$OUT_DIR/stage"
# Exclude logs and junk from package
rsync -a \
  --exclude 'logs/' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  "$SRC/" "$STAGE/"

STAGE_MANIFEST="$STAGE/manifest.json" VERSION="$VERSION" node --input-type=module <<'EOF'
import fs from "node:fs";
const p = process.env.STAGE_MANIFEST;
const version = process.env.VERSION;
const m = JSON.parse(fs.readFileSync(p, "utf8"));
m.Version = version;
m.Nodejs = m.Nodejs || {};
m.Nodejs.Version = "20";
m.Nodejs.Debug = "disabled";
if (!m.Description?.includes("companion")) {
  m.Description =
    "Live ChatGPT Codex agent status keys on Stream Deck. Requires the free macOS companion from GitHub.";
}
fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
console.error("staged manifest", m.Version, "debug", m.Nodejs.Debug);
EOF

echo "== streamdeck validate =="
streamdeck validate "$STAGE" --no-update-check

echo "== streamdeck pack =="
streamdeck pack "$STAGE" \
  --force \
  --output "$OUT_DIR" \
  --version "$VERSION" \
  --no-update-check

echo ""
echo "Release artifacts:"
ls -la "$OUT_DIR"/*.streamDeckPlugin 2>/dev/null || ls -la "$OUT_DIR"
echo ""
echo "Workspace plugin left unchanged (Debug can stay enabled for local dev)."
