#!/usr/bin/env bash
# Build Agent Buttons Companion.app (menu bar) with embedded Node bridge bundle.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPANION="$ROOT/companion"
MACOS="$COMPANION/macos"
OUT_DIR="${AGENTBUTTONS_APP_OUT:-$COMPANION/dist/macos}"
APP_NAME="Agent Buttons Companion.app"
APP="$OUT_DIR/$APP_NAME"
BIN_NAME="AgentButtonsCompanion"
VERSION="${AGENTBUTTONS_VERSION:-0.2.0}"

echo "== Build protocol + companion JS =="
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/companion
node "$COMPANION/scripts/bundle.mjs"

BUNDLE_JS="$COMPANION/dist/companion.bundle.cjs"
PRELOAD="$COMPANION/shim/preload.cjs"
LAUNCH="$MACOS/Resources/launch-chatgpt.sh"
[[ -f "$BUNDLE_JS" ]] || { echo "missing $BUNDLE_JS"; exit 1; }
[[ -f "$PRELOAD" ]] || { echo "missing $PRELOAD"; exit 1; }

echo "== Compile Swift menu bar app =="
mkdir -p "$OUT_DIR/build"
swiftc -O \
  -target arm64-apple-macos13.0 \
  -sdk "$(xcrun --show-sdk-path)" \
  -parse-as-library \
  -framework SwiftUI \
  -framework AppKit \
  -framework ServiceManagement \
  -o "$OUT_DIR/build/$BIN_NAME" \
  "$MACOS/Sources/AgentButtonsCompanion/main.swift"

echo "== Assemble .app bundle =="
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$OUT_DIR/build/$BIN_NAME" "$APP/Contents/MacOS/$BIN_NAME"
chmod +x "$APP/Contents/MacOS/$BIN_NAME"

# Info.plist with version substitution
sed "s/0.2.0/${VERSION}/g" "$MACOS/Info.plist" > "$APP/Contents/Info.plist"

cp "$BUNDLE_JS" "$APP/Contents/Resources/companion.bundle.cjs"
cp "$PRELOAD" "$APP/Contents/Resources/preload.cjs"
cp "$LAUNCH" "$APP/Contents/Resources/launch-chatgpt.sh"
chmod +x "$APP/Contents/Resources/launch-chatgpt.sh" "$APP/Contents/Resources/companion.bundle.cjs"

# PkgInfo
echo -n "APPL????" > "$APP/Contents/PkgInfo"

echo "== Ad-hoc sign (local run; replace with Developer ID for release) =="
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo ""
echo "Built: $APP"
echo "Run:   open \"$APP\""
echo "Install: cp -R \"$APP\" /Applications/"
echo ""
echo "Requires Node.js on PATH (Homebrew: /opt/homebrew/bin/node)."
echo "For notarized release see docs/user/companion-install.md"
