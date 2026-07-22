# Agent Buttons Companion

macOS companion process that:

1. Speaks the **Codex Micro** HID/RPC protocol toward ChatGPT desktop (detection backends in progress)
2. Exposes **localhost WebSocket IPC** for the Stream Deck plugin

## Run

```bash
# from repo root, Node 24+
npm run build -w @agentbuttons/protocol
npm run build -w @agentbuttons/companion
node companion/dist/cli.js --verbose --demo
```

`--demo` cycles agent slot states so you can verify the Stream Deck plugin without ChatGPT.

Default IPC: `ws://127.0.0.1:19847`

## ChatGPT detection

See `src/detection/shim-notes.ts`. Real shim / Virtual HID backends are the next spike after demo IPC is solid.

Discovery identity (for implementers):

| Field | Value |
|-------|--------|
| VID | `0x303A` |
| PID | `0x8360` |
| Usage page | `0xFF00` |

## Troubleshooting

- Plugin keys stuck offline → start companion first
- ChatGPT TIMEOUT on device → framing/reply bugs; run `npm test -w @agentbuttons/protocol`
