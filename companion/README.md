# Agent Buttons Companion

macOS companion process that:

1. Speaks the **Codex Micro** HID/RPC protocol toward ChatGPT desktop (via shim socket)
2. Exposes **localhost WebSocket IPC** for the Stream Deck plugin (`ws://127.0.0.1:19847`)

## Install order

1. Build/install the Stream Deck plugin (`npm run build -w @agentbuttons/plugin`)
2. Start this companion
3. For live status: start with `--chatgpt` and launch ChatGPT via `scripts/launch-chatgpt.sh`
4. Place Agent Slot keys; verify one slot lights

## Run

```bash
# from repo root, Node 24+
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/companion

# Demo: cycles agent states so the plugin lights without ChatGPT
node companion/dist/cli.js --verbose --demo

# Live: Unix socket for ChatGPT shim (+ IPC for plugin)
node companion/dist/cli.js --verbose --chatgpt

# Both demo and chatgpt socket
node companion/dist/cli.js --verbose --demo --chatgpt
```

CLI:

```
node companion/dist/cli.js --help
node companion/dist/cli.js --version
```

### Options

| Flag | Meaning |
|------|---------|
| `--port <n>` | Plugin IPC port (default **19847**) |
| `--demo` | Cycle fake slot states every 2s |
| `--chatgpt` | Listen on shim Unix socket for virtual Micro |
| `--socket <path>` | Override shim socket path |
| `--verbose` | Log slots / health / emu |

Default shim socket: `$TMPDIR/agentbuttons-codex-micro.sock` (or `AGENTBUTTONS_SHIM_SOCKET`).

## ChatGPT detection (shim)

1. Start companion with `--chatgpt`
2. Run `./companion/scripts/launch-chatgpt.sh`  
   - Sets `NODE_OPTIONS=--require companion/shim/preload.cjs`  
   - Injects a synthetic Codex Micro (VID `0x303A` / PID `0x8360`) into ChatGPT’s `node-hid`  
   - Tunnels reports over the Unix socket to this companion  
3. Assign agent keys in ChatGPT’s Codex Micro settings  

**Caveats:** Requires Electron fuse `NodeOptionsEnvVar` enabled; ChatGPT updates can break the shim. Personal interoperability use only. No ChatGPT files are modified.

If ChatGPT is missing or injection fails, use **`--demo`** — loopback protocol tests still cover Micro status/focus.

### Discovery identity

| Field | Value |
|-------|--------|
| VID | `0x303A` |
| PID | `0x8360` |
| Usage page | `0xFF00` |
| Manufacturer | contains `Work Louder` |

## Troubleshooting

| Symptom | Try |
|---------|-----|
| Plugin keys stuck offline | Start companion first; check `ws://127.0.0.1:19847` |
| ChatGPT never sees Micro | Companion with `--chatgpt`; launch via `launch-chatgpt.sh` not Dock |
| ChatGPT TIMEOUT | Framing/reply bugs — `npm test -w @agentbuttons/protocol` |
| Demo works, live doesn’t | App fuse/update; check `$TMPDIR/agentbuttons-shim.log` |
