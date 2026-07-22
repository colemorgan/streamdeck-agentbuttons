# Codex Agent Buttons

Stream Deck **Marketplace-shaped plugin** + **macOS companion** for live ChatGPT desktop Codex agent status keys — for people who don’t have a Codex Micro.

**Not affiliated with OpenAI, Work Louder, or Elgato.**

## Status

| Piece | State |
|-------|--------|
| Requirements / plan | ✅ `docs/brainstorms/…`, `docs/plans/…` |
| Protocol package (framing, emulator, IPC schema) | ✅ tests green |
| Companion bridge + ChatGPT detection | 🚧 next |
| Plugin live status + IPC | 🚧 next |
| Profiles / Marketplace pack | later |

## Architecture

```
ChatGPT desktop  ←→  macOS companion (Micro protocol)  ←→  Stream Deck plugin  ←→  Stream Deck
                              WebSocket localhost
```

Live colors only work when ChatGPT believes a **Codex Micro** is connected. The companion provides that presence; the plugin never injects into ChatGPT.

## Repo layout

- `packages/protocol` — HID framing, Micro JSON-RPC emulator, state map, IPC types
- `companion` — long-running bridge (GitHub release target)
- `plugin` — Elgato Stream Deck plugin (`com.colemorgan.codex-agent-buttons`)

## Develop

Requires **Node 24+** (Elgato CLI) and Stream Deck Software 7.1+.

```bash
nvm use 24
npm install
npm run test:protocol
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/plugin
```

Plugin UUID: `com.colemorgan.codex-agent-buttons`  
Action: **Agent Slot** (`slot` 0–5 → Micro `AG00`–`AG05`)

### Install plugin locally

```bash
npm run build -w @agentbuttons/plugin
streamdeck restart com.colemorgan.codex-agent-buttons
# or link/copy the .sdPlugin folder into Stream Deck plugins dir
```

Companion: `node companion/dist/cli.js --help` (bridge not fully implemented yet).

## MVP

Six agent slots with live state (idle / working / complete / awaiting / error) and press-to-focus. Command keys and dials come later.

## Docs

- Requirements: `docs/brainstorms/2026-07-22-streamdeck-codex-agent-buttons-requirements.md`
- Plan: `docs/plans/2026-07-22-001-feat-streamdeck-codex-agent-buttons-plan.md`

## License

MIT
