# Agent Buttons Companion — install

Menu bar app that runs the local bridge for Stream Deck **Codex Agent Buttons**.

**macOS 13+.** Not affiliated with OpenAI, Work Louder, or Elgato.

## Requirements

- macOS 13 or later  
- **Node.js 20+** installed (Homebrew recommended: `brew install node`)  
- ChatGPT desktop (for live status)  
- Stream Deck plugin installed  

> The app embeds the companion JS bridge but still invokes your system `node` binary. A fully standalone Node-less DMG is a later packaging step.

## Build from source (today)

```bash
cd streamdeck-agentbuttons
chmod +x companion/scripts/build-macos-app.sh
./companion/scripts/build-macos-app.sh
open companion/dist/macos/Agent\ Buttons\ Companion.app
```

Optional install:

```bash
cp -R "companion/dist/macos/Agent Buttons Companion.app" /Applications/
```

## First run

1. Click the menu bar circle icon (**Agent Buttons Companion**).  
2. **Start Bridge** — Stream Deck keys leave Offline.  
3. **Launch ChatGPT with Agent Keys** — clean Launch Services launch + shim (keeps Input Monitoring working).  
4. In ChatGPT: confirm Codex Micro **Connected**.  
5. Assign chats to agent keys; match Stream Deck slots.  

## Menu reference

| Item | Action |
|------|--------|
| Start / Stop Bridge | Node companion `--chatgpt` on `ws://127.0.0.1:19847` |
| Launch ChatGPT with Agent Keys | Quit ChatGPT if needed; relaunch with preload via `open --env` |
| Open Logs | `~/Library/Logs/agentbuttons-companion.log` |
| Setup Guide | User docs |
| Open at Login | `SMAppService` login item |
| About | Version + disclosure |

## Signing & notarization (release)

Personal/ad-hoc builds use `codesign -s -` (local only).

For GitHub Release / other Macs:

1. Enroll in Apple Developer Program.  
2. Create **Developer ID Application** certificate.  
3. Sign:

```bash
codesign --force --deep --options runtime \
  --sign "Developer ID Application: YOUR NAME (TEAMID)" \
  "Agent Buttons Companion.app"
```

4. Notarize (example with `notarytool`):

```bash
ditto -c -k --keepParent "Agent Buttons Companion.app" companion.zip
xcrun notarytool submit companion.zip --apple-id ... --team-id ... --password ... --wait
xcrun stapler staple "Agent Buttons Companion.app"
```

5. Ship a DMG or zip on GitHub Releases; link from the Stream Deck PI and listing.

### Checklist

- [ ] `CFBundleIdentifier` = `com.colemorgan.agentbuttons.companion`  
- [ ] Hardened runtime + notarization staple  
- [ ] Version matches release tag  
- [ ] Smoke: Start Bridge → plugin Connected; Launch ChatGPT → Micro Connected  

## Privacy / network

- Listens only on **127.0.0.1** (plugin IPC).  
- Shim uses a Unix socket under `$TMPDIR`.  
- No cloud accounts or telemetry.  
- ChatGPT Input Monitoring is ChatGPT’s TCC grant, not this app’s.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Node.js not found” | Install Node; ensure `/opt/homebrew/bin/node` or `/usr/local/bin/node` exists |
| Bridge won’t start | Check log; free port 19847; stop old CLI companion |
| Input Monitoring not granted after launch | Use **Launch ChatGPT with Agent Keys** only (not Dock alone for shim) |
| Gatekeeper blocks app | Sign/notarize, or right-click → Open once for ad-hoc local builds |
