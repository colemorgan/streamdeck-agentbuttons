# Marketplace listing draft — Codex Agent Buttons

**Title:** Codex Agent Buttons  

**Subtitle:** Live ChatGPT Codex agent status on Stream Deck  

**Category:** Productivity / Developer Tools (confirm Elgato taxonomy at submit)

**OS:** macOS 12+ (plugin); Companion requires macOS 13+  

**Price:** Free  

## Short description

Live ChatGPT Codex agent status keys on your Stream Deck — colors and one-tap focus without a Codex Micro. Requires the free macOS companion.

## Long description

Codex Agent Buttons brings ChatGPT desktop Codex agent status to Stream Deck.

**What you get**
- Up to six agent slots with live state: Idle, Busy, Done, Wait, Error, Off, Offline  
- Optional custom key labels (e.g. “Ship” instead of A3)  
- Press a key to focus that agent in ChatGPT  
- Property Inspector shows companion + ChatGPT connection health  

**Requirements**
- macOS  
- Stream Deck hardware + Stream Deck Software  
- ChatGPT desktop (Codex / agents)  
- **Agent Buttons Companion** (free, separate download from GitHub)  

**Setup (summary)**
1. Install this plugin  
2. Install and start Agent Buttons Companion (menu bar → Start Bridge)  
3. Companion → Launch ChatGPT with Agent Keys  
4. In ChatGPT Codex Micro settings, confirm Connected and assign chats to agent keys  
5. Add Agent Slot keys (slots 1–6) on your deck  

**Important**
- Not affiliated with OpenAI, Work Louder, or Elgato  
- Companion uses a local interoperability shim so ChatGPT sees a virtual Micro; ChatGPT app files are not modified  
- ChatGPT updates may require a companion update  
- Input Monitoring (for Micro key presses) is granted to **ChatGPT** in System Settings  

**Support:** [GitHub Issues](https://github.com/colemorgan/streamdeck-agentbuttons/issues)  
**Source / companion releases:** [github.com/colemorgan/streamdeck-agentbuttons](https://github.com/colemorgan/streamdeck-agentbuttons)  

## Screenshots checklist

- [ ] Six keys mixed states (Idle / Busy / Done)  
- [ ] Property Inspector with health Connected  
- [ ] Menu bar companion menu  
- [ ] ChatGPT Codex Micro Connected panel  
- [ ] XL layout with agent row  

## Icons

Ship final assets under `plugin/.../imgs/` (marketplace, category, action) before submit. Current placeholders are temporary.

## Version

- **Plugin pack:** `1.0.0.0` via `npm run plugin:pack` → `dist/release/com.colemorgan.codex-agent-buttons.streamDeckPlugin`  
- **Companion app:** `0.2.0` via `npm run companion:app`  
- Workspace plugin may stay at `1.0.0.0` with Debug enabled for day-to-day development; the pack script stages a copy with Debug disabled.
