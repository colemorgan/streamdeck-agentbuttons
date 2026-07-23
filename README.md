# Codex Agent Buttons

Live ChatGPT desktop Codex agent status on your Stream Deck — for people who don't have a Codex Micro.

> **Not affiliated with OpenAI, Work Louder, or Elgato.**

Codex Agent Buttons is an Elgato Stream Deck plugin plus a small macOS companion process. The companion emulates a Codex Micro HID device so ChatGPT desktop shares live agent states; the plugin renders those states on Stream Deck keys. macOS only.

## Features

- Up to **6 agent slots** (mapped to Micro keys `AG00`–`AG05`) with live states: `off`, `idle`, `working`, `complete`, `awaiting`, `error`
- Distinct **offline** key face when the companion isn't connected
- **Press a key to focus** that agent in ChatGPT desktop
- **Demo mode** — fake cycling states, no ChatGPT required, for trying the plugin out
- Menu bar companion app or plain CLI, your choice

## How it works

```
ChatGPT desktop  ←→  macOS companion (Codex Micro protocol)  ←→  Stream Deck plugin  ←→  Stream Deck
     (optional shim)            WebSocket localhost IPC
```

ChatGPT desktop only publishes live agent colors when it believes a **Codex Micro** is connected. The companion provides that presence (an optional shim injects a synthetic Micro into ChatGPT's `node-hid` via an Electron `NODE_OPTIONS` preload). The plugin talks to the companion over a localhost-only WebSocket (`ws://127.0.0.1:19847`) and never injects into ChatGPT itself.

## Install

1. **Install the plugin.** Download the `.streamDeckPlugin` file from [GitHub Releases](https://github.com/colemorgan/streamdeck-agentbuttons/releases) and double-click it, or install from the Stream Deck Marketplace.
2. **Run the companion.** Build and open the menu bar app (recommended):

   ```bash
   ./companion/scripts/build-macos-app.sh
   open "companion/dist/macos/Agent Buttons Companion.app"
   # menu bar → Start Bridge
   ```

   Or run the CLI (requires Node 20.5.1+):

   ```bash
   node companion/dist/cli.js --verbose --chatgpt   # or --demo for fake states
   ```

   Keys show **offline** until the companion is running.
3. **Launch ChatGPT with the shim** so it sees the emulated Micro: from the menu bar app choose **Launch ChatGPT with Agent Keys**, or run `./companion/scripts/launch-chatgpt.sh`.
4. **Add keys on Stream Deck.** Drag the **Agent Slot** action onto the deck and set each key's slot (1–6). Assign chats to agent keys in ChatGPT's Codex Micro settings.

Full walkthrough: [docs/user/setup.md](docs/user/setup.md).

## Development

Requires Node 20.5.1+ (Node 24 recommended) and, for the plugin, Stream Deck Software.

```bash
npm install
npm test          # vitest across all workspaces
npm run build     # build all workspaces (protocol first — dependents consume its dist/)
```

Common targeted commands:

```bash
npm run build -w @agentbuttons/protocol    # tsc — must run before dependents
npm run build -w @agentbuttons/companion   # tsc → companion/dist/cli.js
npm run build -w @agentbuttons/plugin      # rollup → plugin/.../bin/plugin.js
npm run dev -w @agentbuttons/companion     # tsx src/cli.ts (no build)
npm run companion:app                      # build the Swift menu bar .app
npm run plugin:pack                        # → dist/release/*.streamDeckPlugin
npm run release:local                      # test + companion app + plugin pack
streamdeck restart com.colemorgan.codex-agent-buttons   # reload plugin in Stream Deck
```

## Repo layout

| Path | Role |
|------|------|
| `packages/protocol` | Shared, dependency-free library: HID report framing, Micro JSON-RPC emulator, state/color mapping, IPC message schema |
| `companion` | Node.js bridge process: Micro emulator, WebSocket IPC server, ChatGPT shim socket, CLI |
| `companion/shim/preload.cjs` | Preload injected into ChatGPT via `NODE_OPTIONS` to provide the synthetic Micro |
| `companion/macos` | SwiftUI menu bar app wrapping the companion bridge |
| `plugin` | Stream Deck plugin (`@elgato/streamdeck` SDK): single "Agent Slot" action, key-face rendering |
| `docs/` | User guides, plans, brainstorms, marketplace material |

## Documentation

- User docs: [setup](docs/user/setup.md) · [companion install](docs/user/companion-install.md) · [troubleshooting](docs/user/troubleshooting.md) · [acceptance checklist](docs/user/acceptance-checklist.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [Companion README](companion/README.md) · [Stream Deck profiles](profiles/README.md)

## License

[MIT](LICENSE)
