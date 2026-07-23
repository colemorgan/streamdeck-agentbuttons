# GitHub Release notes draft — v1.0.0

**Tag suggestions**
- Plugin: `plugin-v1.0.0`
- Companion: `companion-v0.2.0`
- Or monorepo: `v1.0.0` with both artifacts

## Highlights

- Live ChatGPT Codex agent status on Stream Deck (up to 6 slots)
- Polished key faces + optional custom labels
- Property Inspector connection health and setup guidance
- macOS menu bar companion: Start Bridge, Launch ChatGPT with Agent Keys
- Clean ChatGPT launch preserves Input Monitoring TCC

## Assets to attach

1. `com.colemorgan.codex-agent-buttons.streamDeckPlugin`  
   Build: `npm run plugin:pack` → `dist/release/`
2. `Agent Buttons Companion.app` (zip)  
   Build: `npm run companion:app` → `companion/dist/macos/`  
   Prefer notarized zip for public download.

## Body (paste)

```markdown
## Codex Agent Buttons 1.0

Stream Deck plugin + macOS companion for live ChatGPT Codex agent status.

### Install
1. Double-click the `.streamDeckPlugin`
2. Install **Agent Buttons Companion** (requires Node 20+ on PATH for this release)
3. Companion → **Start Bridge** → **Launch ChatGPT with Agent Keys**
4. Assign chats in ChatGPT Codex Micro settings; map Agent Slot keys 1–6

Full guide: docs/user/setup.md

### Notes
- Not affiliated with OpenAI, Work Louder, or Elgato
- Companion is required and is **not** inside the plugin package
- ChatGPT updates may break the shim; open an issue if Micro stops connecting

### Checksums
(add `shasum -a 256` of release files)
```

## Commands (author)

```bash
npm test
npm run plugin:pack
npm run companion:app
ditto -c -k --keepParent \
  "companion/dist/macos/Agent Buttons Companion.app" \
  dist/release/Agent-Buttons-Companion-0.2.0-mac.zip
shasum -a 256 dist/release/*
# gh release create v1.0.0 dist/release/* --notes-file docs/marketplace/github-release-notes-1.0.md
```
