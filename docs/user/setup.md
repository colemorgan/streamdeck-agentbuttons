# Codex Agent Buttons — Setup guide

Live ChatGPT Codex agent status on Stream Deck without a Codex Micro.

**macOS only.** Not affiliated with OpenAI, Work Louder, or Elgato.

## What you need

- Stream Deck hardware + Stream Deck Software
- ChatGPT desktop (Codex / agent threads)
- **Agent Buttons Companion** (required for live colors)
- This plugin (dev install or Marketplace later)

## Cold start (about 5–10 minutes)

### 1. Install the plugin

**Developers:** build and load the `.sdPlugin` folder (see root `README.md`).

**Later Marketplace users:** install from Stream Deck Marketplace.

### 2. Start the companion

**Preferred — menu bar app:**

```bash
./companion/scripts/build-macos-app.sh
open "companion/dist/macos/Agent Buttons Companion.app"
# then: menu bar → Start Bridge
```

See [companion-install.md](./companion-install.md).

**CLI alternative:**

```bash
node companion/dist/cli.js --verbose --chatgpt
```

Keys show **offline** until the companion is up. Requires Node 20+.

### 3. Launch ChatGPT with the shim

From the menu bar: **Launch ChatGPT with Agent Keys**.

Or CLI:

```bash
./companion/scripts/launch-chatgpt.sh
```

Do **not** rely on Dock-only launch if you need live Micro status (no shim).  
Do **not** start ChatGPT from a shell that sets `ELECTRON_RUN_AS_NODE=1` without the clean launcher.

### 4. Confirm in ChatGPT

Open **Codex Micro** settings:

- **Connection** → Connected  
- **Input Monitoring** → granted (System Settings → Privacy → Input Monitoring → **ChatGPT**)

### 5. Assign chats to agent keys (threads)

In ChatGPT Micro settings under **Agent keys**:

- Choose how keys follow chats (e.g. most recent), **or** assign specific chats to keys 1–6.

**This is how you put a thread on a slot.** The Stream Deck plugin does not pick the chat.

### 6. Add keys on Stream Deck

1. Drag **Agent Slot** onto the deck (or import a profile from `profiles/`).
2. Select each key → set **Agent slot** to 1–6.
3. Optional: set **Display name** (e.g. `Ship`) instead of `A3` on the face.

### 7. Verify

1. Start an agent on a chat assigned to slot 1.  
2. That Stream Deck key should go **Busy** (blue).  
3. Press the key → ChatGPT focuses that agent.

## Reassigning

| Goal | Where |
|------|--------|
| Different **thread** on this key | ChatGPT → Codex Micro → Agent keys |
| This key should be **slot 3** instead of 1 | Stream Deck property inspector → Agent slot |
| Custom face text | Stream Deck PI → Display name |

## Key colors (legend)

| Face | Meaning |
|------|---------|
| Dim + dashed | Offline (companion down) |
| Dark + ring | Off (slot unused / no agent) |
| Light + Idle | Idle |
| Blue + Busy | Working / thinking |
| Green + Done | Complete |
| Orange + Wait | Needs input |
| Red + Err | Error |

## Next

- Troubleshooting: [troubleshooting.md](./troubleshooting.md)  
- Companion install: [companion-install.md](./companion-install.md)  
- Acceptance soak: [acceptance-checklist.md](./acceptance-checklist.md)  
- Companion CLI notes: [../../companion/README.md](../../companion/README.md)
