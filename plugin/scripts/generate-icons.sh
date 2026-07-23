#!/usr/bin/env bash
# Regenerate plugin marketplace / category / action / key PNGs (ImageMagick).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IMGS="$ROOT/plugin/com.colemorgan.codex-agent-buttons.sdPlugin/imgs"
FONT_BOLD="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG="/System/Library/Fonts/Supplemental/Arial.ttf"

if ! command -v magick >/dev/null 2>&1; then
  echo "error: ImageMagick 'magick' required" >&2
  exit 1
fi
[[ -f "$FONT_BOLD" ]] || { echo "error: missing $FONT_BOLD" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

magick -size 512x512 xc:none \
  -fill '#1c1c1e' -draw 'roundrectangle 32,32 480,480 96,96' \
  -fill '#304ffe' -draw 'circle 256,200 256,120' \
  -fill '#00c853' -draw 'circle 340,300 340,268' \
  -fill white -font "$FONT_BOLD" -pointsize 140 -gravity center -annotate +0+48 'A' \
  marketplace@2x.png

magick marketplace@2x.png -resize 256x256 marketplace.png
magick marketplace@2x.png -resize 144x144 category-icon@2x.png
magick marketplace@2x.png -resize 72x72 category-icon.png
magick marketplace@2x.png -resize 72x72 action-icon@2x.png
magick marketplace@2x.png -resize 36x36 action-icon.png

magick -size 144x144 xc:none \
  -fill '#f2f2f2' -draw 'roundrectangle 8,8 136,136 20,20' \
  -fill '#111111' -font "$FONT_BOLD" -pointsize 36 -gravity center -annotate +0-10 'A1' \
  -fill '#333333' -font "$FONT_REG" -pointsize 16 -gravity center -annotate +0+26 'Idle' \
  key@2x.png
magick key@2x.png -resize 72x72 key.png

mkdir -p "$IMGS/plugin" "$IMGS/actions/agent-slot"
cp marketplace.png marketplace@2x.png category-icon.png category-icon@2x.png "$IMGS/plugin/"
cp action-icon.png "$IMGS/actions/agent-slot/icon.png"
cp action-icon@2x.png "$IMGS/actions/agent-slot/icon@2x.png"
cp key.png key@2x.png "$IMGS/actions/agent-slot/"

echo "Wrote icons under $IMGS"
