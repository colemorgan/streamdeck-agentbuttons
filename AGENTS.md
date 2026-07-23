# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

**Codex Agent Buttons** (`streamdeck-agentbuttons`) is an Elgato Stream Deck plugin plus a macOS companion process that show live ChatGPT desktop Codex agent status on Stream Deck keys — for users without a physical Codex Micro device. It is **not affiliated with OpenAI, Work Louder, or Elgato**; keep that disclaimer on all user-facing surfaces (README, property inspector, companion About, marketplace listing).

Data flow:

```
ChatGPT desktop  ←→  macOS companion (Codex Micro protocol)  ←→  Stream Deck plugin  ←→  Stream Deck
     (optional shim)            WebSocket localhost IPC
```

The companion emulates a **Codex Micro** HID device so ChatGPT desktop believes one is connected (VID `0x303A`, PID `0x8360`, usage page `0xFF00`, manufacturer contains `Work Louder`). The plugin never injects into ChatGPT itself. The companion can run in **demo** mode (fake cycling states, no ChatGPT) or **`--chatgpt`** mode (Unix-socket shim tunneled into ChatGPT's `node-hid` via an Electron `NODE_OPTIONS` preload, `companion/shim/preload.cjs`).

Key facts:

- Up to **6 agent slots** (0–5), mapped to Micro keys `AG00`–`AG05`.
- Slot states: `off`, `idle`, `working`, `complete`, `awaiting`, `error` (plus `offline` on the plugin side when the companion is not connected).
- Plugin ↔ companion IPC: JSON messages over WebSocket at `ws://127.0.0.1:19847` (`DEFAULT_IPC_PORT`), schema version 1 (`IPC_PROTOCOL_VERSION`), defined in `packages/protocol/src/ipc.ts`.
- Shim Unix socket default: `$TMPDIR/agentbuttons-codex-micro.sock` (override with `AGENTBUTTONS_SHIM_SOCKET`).

## Repository layout

npm workspaces monorepo (root `package.json` workspaces: `packages/*`, `companion`, `plugin`).

| Path | Role |
|------|------|
| `packages/protocol` | `@agentbuttons/protocol` — shared, dependency-free library: HID 64-byte report framing (`framing.ts`), Micro JSON-RPC emulator (`emulator.ts`), state/color mapping (`states.ts`), key codes (`keys.ts`), IPC message schema (`ipc.ts`). Built with `tsc`, consumed by both companion and plugin. |
| `companion` | `@agentbuttons/companion` — Node.js (ESM, NodeNext) bridge process: `src/bridge.ts` (Micro emulator + slot fan-out), `src/ipc-server.ts` (WebSocket server for the plugin), `src/detection/socket-server.ts` (ChatGPT shim socket), `src/transports/loopback.ts`, `src/cli.ts` (entry point). |
| `companion/shim/preload.cjs` | CommonJS preload injected into ChatGPT via `NODE_OPTIONS=--require`; injects a synthetic Micro into ChatGPT's `node-hid` and tunnels reports over the Unix socket. |
| `companion/macos` | SwiftUI menu bar app (`Sources/AgentButtonsCompanion/main.swift`, `Info.plist`) that wraps the bundled companion bridge. |
| `companion/scripts` | `build-macos-app.sh` (Swift + bundle → `.app`), `bundle.mjs`, `health-check.mjs`, `launch-chatgpt.sh` (launches ChatGPT via Launch Services with the shim). |
| `plugin` | `@agentbuttons/plugin` — Stream Deck plugin using `@elgato/streamdeck` SDK v2: `src/plugin.ts` (entry), `src/actions/agent-slot.ts` (single "Agent Slot" action), `src/ipc-client.ts` (WebSocket client to companion), `src/render/` (key-face image generation). |
| `plugin/com.colemorgan.codex-agent-buttons.sdPlugin` | The plugin bundle: `manifest.json` (plugin UUID `com.colemorgan.codex-agent-buttons`), `imgs/`, `ui/agent-slot.html` (property inspector), `bin/plugin.js` (rollup output, gitignored build artifact). |
| `scripts/sim-focus.mjs` | Dev utility: simulate a slot key press against a running companion. |
| `profiles/` | Stream Deck profile layout guidance. |
| `docs/` | `user/` (setup, troubleshooting, install, acceptance checklist), `plans/` (date-stamped execution plans), `brainstorms/` (requirements), `marketplace/` (listing, release notes). |

## Build and test commands

Requires Node 20.5.1+ per `engines` (docs recommend Node 24 for development). Install with `npm install` from the root.

```bash
npm test                          # all workspaces (vitest run, --if-present)
npm run build                     # build all workspaces that define a build script
npm run build -w @agentbuttons/protocol   # tsc — must run before building dependents
npm run build -w @agentbuttons/companion  # tsc → companion/dist/cli.js
npm run build -w @agentbuttons/plugin     # rollup → plugin/.../bin/plugin.js
```

**Build order matters:** `@agentbuttons/protocol` must be built first; the companion and plugin consume its `dist/` output, not its sources.

Companion:

```bash
node companion/dist/cli.js --verbose --demo      # demo states, no ChatGPT
node companion/dist/cli.js --verbose --chatgpt   # live: shim socket + IPC
npm run dev -w @agentbuttons/companion           # tsx src/cli.ts (no build)
npm run companion:app                            # build the Swift menu bar .app (macOS, needs Xcode CLT)
```

Plugin:

```bash
npm run plugin:build
streamdeck restart com.colemorgan.codex-agent-buttons   # reload in Stream Deck
npm run watch -w @agentbuttons/plugin          # rollup watch + auto streamdeck restart
npm run validate -w @agentbuttons/plugin       # streamdeck validate (needs streamdeck CLI)
```

Release packaging (local, from repo root):

```bash
npm run release:local   # npm test + companion:app + plugin:pack
npm run plugin:pack     # → dist/release/*.streamDeckPlugin (stages a copy with Debug disabled,
                        #   version from AGENTBUTTONS_PLUGIN_VERSION, default 1.0.0.0)
```

## Code style guidelines

- **TypeScript everywhere**, `strict: true`, `skipLibCheck: true`, `esModuleInterop: true`. No ESLint/Prettier config exists — match the surrounding code style.
- Protocol and companion are **ESM** (`"type": "module"`, NodeNext resolution); relative imports in TS use `.js` extensions (e.g. `import { Bridge } from "./bridge.js"`).
- The plugin uses ES2022 modules + bundler resolution, bundled to CJS by rollup for the Stream Deck Node 20 runtime. `experimentalDecorators` is on for the `@elgato/streamdeck` `@action` decorators; `useDefineForClassFields: false`.
- Keep `@agentbuttons/protocol` free of runtime dependencies — it is shared by all three consumers (companion, plugin, shim tests).
- Comments are used for protocol details and non-obvious decisions (see `framing.ts`, `states.ts`); follow that density rather than narrating code.
- Keep the non-affiliation disclaimer intact on user-facing surfaces.
- Plans in `docs/plans/` follow the `YYYY-MM-DD-NNN-feat|fix-slug.md` naming convention.

## Testing instructions

- Test runner is **vitest** (`vitest run`) in every workspace; there is no CI workflow (`.github` only has issue templates), so run tests locally before considering work done.
- Test locations differ per package:
  - `packages/protocol`: tests live in `test/*.test.ts` (see `vitest.config.ts` include).
  - `plugin`: tests are colocated in `src/**/*.test.ts`.
  - `companion`: tests live in `companion/test/*.test.ts`, including integration and end-to-end loopback tests (`e2e-loopback.test.ts`) that exercise the Micro protocol without ChatGPT.
- Targeted runs: `npm run test:protocol` (root) or `npm run test -w @agentbuttons/<workspace>`.
- Protocol framing/RPC bugs surface as ChatGPT "TIMEOUT" — run `npm test -w @agentbuttons/protocol` when touching framing or the emulator.
- `plugin/scripts/generate-icons.sh` regenerates key icons if assets change.

## Security considerations

- The IPC WebSocket is **localhost-only** (`127.0.0.1`); do not bind it to other interfaces. The shim socket is a user-tempdir Unix socket.
- `companion/shim/preload.cjs` is injected into ChatGPT desktop and requires its Electron `NodeOptionsEnvVar` fuse; it is personal-interoperability tooling and must never modify ChatGPT's files. Do not weaken its guard rails.
- `launch-chatgpt.sh` deliberately launches ChatGPT via Launch Services (`open --env`) with a **clean environment** (`env -i`) — forwarding the caller's environment (especially `ELECTRON_RUN_AS_NODE=1`, common in agent shells) breaks macOS TCC/Input Monitoring. Preserve this behavior.
- Never exec `ChatGPT.app/Contents/MacOS/ChatGPT` directly; same TCC reason.
- No secrets are stored in the repo. The release pack script stages a *copy* of the plugin with `Nodejs.Debug: "disabled"`; the workspace manifest keeps `Debug: "enabled"` for local development — do not commit a disabled-Debug workspace manifest or an enabled-Debug release.
