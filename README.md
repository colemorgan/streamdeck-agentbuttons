# Codex Agent Buttons

Stream Deck **Marketplace-shaped plugin** + **macOS companion** for live ChatGPT desktop Codex agent status keys — for people who don’t have a Codex Micro.

**Not affiliated with OpenAI, Work Louder, or Elgato.**

## What you get (MVP)

- Up to **six agent slots** with live states: `off`, `idle`, `working`, `complete`, `awaiting`, `error`
- **Offline** key face when the companion is not connected (distinct from idle)
- **Press** a slot → companion emits Micro `AG0N` press/release (focus)
- Companion can run **demo** (no ChatGPT) or **`--chatgpt`** (shim socket for live Micro protocol)

## Architecture

```
ChatGPT desktop  ←→  macOS companion (Micro protocol)  ←→  Stream Deck plugin  ←→  Stream Deck
     (optional shim)         WebSocket localhost IPC
```

Live colors from ChatGPT only work when the app believes a **Codex Micro** is connected. The companion provides that presence; the plugin never injects into ChatGPT.

## Install order (cold-start)

1. **Build the plugin** and load it in Stream Deck Software  
2. **Start the companion** (`--demo` and/or `--chatgpt`)  
3. For live ChatGPT status: **launch ChatGPT with the shim** (`companion/scripts/launch-chatgpt.sh`)  
4. Add **Agent Slot** actions (slots 1–6); assign tasks in ChatGPT Micro settings if live  
5. Verify one key changes color; press focuses that agent when ChatGPT is linked  

Default IPC: **`ws://127.0.0.1:19847`**

## Develop

Requires **Node 24+** and Stream Deck Software 7.1+ (for the plugin).

```bash
nvm use 24
npm install
npm test
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/companion
npm run build -w @agentbuttons/plugin
```

### Companion

**Menu bar app (recommended):**

```bash
./companion/scripts/build-macos-app.sh
open "companion/dist/macos/Agent Buttons Companion.app"
# Start Bridge → Launch ChatGPT with Agent Keys
```

**CLI:**

```bash
# Demo status only (no ChatGPT)
node companion/dist/cli.js --verbose --demo

# Live path: shim socket + optional demo
node companion/dist/cli.js --verbose --chatgpt
# then in another terminal:
chmod +x companion/scripts/launch-chatgpt.sh
./companion/scripts/launch-chatgpt.sh
```

Install notes: [docs/user/companion-install.md](docs/user/companion-install.md)

### Plugin

```bash
npm run build -w @agentbuttons/plugin
# Install/link plugin/com.colemorgan.codex-agent-buttons.sdPlugin into Stream Deck
# or: streamdeck restart com.colemorgan.codex-agent-buttons
```

Plugin UUID: `com.colemorgan.codex-agent-buttons`  
Action: **Agent Slot** (`slot` 0–5 → Micro `AG00`–`AG05`)

### Release pack (local)

```bash
npm test
npm run plugin:pack          # → dist/release/*.streamDeckPlugin (v1.0.0.0, Debug off)
npm run companion:app        # → companion/dist/macos/Agent Buttons Companion.app
```

Double-click the `.streamDeckPlugin` to install. Companion is **not** inside the plugin package.

## Repo layout

| Path | Role |
|------|------|
| `packages/protocol` | HID framing, Micro JSON-RPC, state map, IPC types |
| `companion` | Bridge, IPC server, ChatGPT shim socket, CLI |
| `companion/shim/preload.cjs` | Injected into ChatGPT via `NODE_OPTIONS` |
| `plugin` | Elgato Stream Deck plugin |

## Docs

- **User setup:** [docs/user/setup.md](docs/user/setup.md) · [troubleshooting](docs/user/troubleshooting.md)
- Profiles: [profiles/README.md](profiles/README.md)
- Requirements: `docs/brainstorms/2026-07-22-streamdeck-codex-agent-buttons-requirements.md`
- Execution plan: `docs/plans/2026-07-23-003-feat-marketplace-polish-completion-plan.md`
- Companion: `companion/README.md`

## License

MIT
