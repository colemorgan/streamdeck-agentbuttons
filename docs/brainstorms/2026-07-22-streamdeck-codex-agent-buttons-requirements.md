---
date: 2026-07-22
topic: streamdeck-codex-agent-buttons
---

# Stream Deck Codex Agent Buttons — Requirements

## Summary

Ship a **Stream Deck Marketplace plugin** plus a **required macOS companion** that lets people without a Codex Micro control ChatGPT desktop Codex agents from a Stream Deck. The companion makes ChatGPT treat the setup as a Codex Micro so **live agent status** reaches the deck. **MVP: agent status keys only** — up to six slots with live state colors and press-to-focus — with layouts that adapt across Stream Deck models.

## Problem Frame

OpenAI’s Work Louder Codex Micro gives physical agent slots with live RGB status and one-tap focus, but it is expensive, limited-run, and often sold out. Many developers already own a Stream Deck. Without a Micro, they cannot get the same live thread status from ChatGPT: the app only pushes agent lighting over the Codex Micro HID/RPC path. Generic Stream Deck hotkey profiles can fire shortcuts but do not light keys from real agent state. This product exists so Stream Deck owners get Micro-like agent awareness without buying the Micro.

## Key Decisions

- **Marketplace plugin is the product surface.** Users discover and install via the Elgato Stream Deck Marketplace. The plugin owns button layouts, property inspector settings, and key rendering on the deck.
- **Companion is required for live status.** ChatGPT only drives agent colors through the Codex Micro protocol. A macOS companion presents a virtual Micro (or equivalent detection path) and bridges status/events to the plugin. The plugin alone cannot deliver true Micro status lights.
- **Companion ships as a separate GitHub release.** Marketplace plugin + docs link to the download; the companion is not bundled inside the `.streamDeckPlugin` for v1.
- **Target ChatGPT desktop Codex only for v1.** Not Codex CLI, not multi-agent hubs.
- **MVP is agent status keys only.** Prove slot assignment, live colors, and focus. Command keys (approve/reject/mic), dials, and joystick come after.
- **First ship target is personal macOS use, shaped for Marketplace.** Install and reliability on the author’s machine come first; packaging, docs, and Marketplace submission constraints guide design from day one.
- **Multi-model layouts.** Design for Stream Deck XL / Neo and other models with adaptive slot/layout mapping, not a single fixed grid.

## Actors

- A1. **Operator** — Stream Deck owner running ChatGPT desktop Codex on macOS who wants agent status without a Codex Micro.
- A2. **Stream Deck plugin** — Marketplace-installed process that owns keys, layouts, and user-facing settings in Stream Deck Software.
- A3. **Companion** — Local macOS process that speaks the Codex Micro device protocol toward ChatGPT and status/events toward the plugin.
- A4. **ChatGPT desktop (Codex)** — Source of truth for agent/thread state and focus behavior when a Micro is present.

## Key Flows

- F1. First-run setup
  - **Trigger:** Operator installs the Marketplace plugin and starts the companion for the first time.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** Install plugin; install/start companion; launch ChatGPT so it detects a Codex Micro; open Stream Deck profile/actions for agent keys; confirm at least one slot reflects a known agent state.
  - **Outcome:** Operator has a working status surface without owning Micro hardware.

- F2. Live status on agent keys
  - **Trigger:** A followed Codex agent changes state (idle, thinking/working, complete, needs input, error).
  - **Actors:** A4, A3, A2
  - **Steps:** ChatGPT pushes status for Micro agent slots; companion receives and maps status; plugin updates key appearance for the corresponding slot.
  - **Outcome:** Operator can read agent state from the Stream Deck without looking at the ChatGPT window.

- F3. Focus agent from key press
  - **Trigger:** Operator presses an assigned agent key.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** Plugin reports press; companion forwards Micro key event for that agent slot; ChatGPT focuses/selects that agent/thread per Micro behavior.
  - **Outcome:** Operator switches agents from the desk without mouse hunting.

- F4. Recovery when the link drops
  - **Trigger:** Companion stops, ChatGPT restarts without detection, or Stream Deck disconnects.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** Plugin shows a clear offline/disconnected state on agent keys or profile; operator can restart companion / relaunch ChatGPT per documented recovery; status resumes when the link is healthy.
  - **Outcome:** Failures are obvious and recoverable without silent blank keys.

## Requirements

**Product shape**

- R1. The product is distributed as an **Elgato Stream Deck Marketplace plugin** (or is built to Marketplace packaging/validation rules from the start).
- R2. A **macOS companion** is a required dependency for live agent status and Micro-compatible control; the plugin documents and surfaces that dependency in setup.
- R3. The system targets **ChatGPT desktop Codex** as the only agent backend in v1.

**Agent status keys (MVP)**

- R4. The deck exposes **up to six agent slots**, matching Codex Micro agent-key cardinality.
- R5. Each assigned slot shows **live visual state** for idle, thinking/working, complete, needs input, and error (or the app’s equivalent status set mapped into those user-facing states).
- R6. Unassigned or off slots are visually distinct from assigned idle slots.
- R7. Pressing an assigned agent key **focuses/selects that agent** in ChatGPT consistent with Micro single-tap behavior.
- R8. Layouts **adapt across Stream Deck models** (including XL and Neo); models with fewer than six keys may page, map a subset of slots, or use multi-page profiles without losing status for mapped slots.

**Setup, reliability, and operator experience**

- R9. First-run documentation covers install order: plugin, companion, ChatGPT detection path, and verification of one live status key.
- R10. When companion or ChatGPT link is down, the plugin presents a **clear disconnected/offline indication** rather than stale “healthy” colors.
- R11. Personal daily use on a single Mac is the **primary success target** before broad Marketplace promotion.

**Out of MVP but allowed as later extensions**

- R12. Command keys (approve, reject, push-to-talk, branch, submit), reasoning dial, and joystick are **not required for MVP** but must not be designed out of the architecture if cheap to leave hooks for.

## Acceptance Examples

- AE1. Live thinking state
  - **Covers:** R5, R2, R3
  - **Given:** Companion is running, ChatGPT has detected a Micro, and slot 1 follows an agent that starts working.
  - **When:** That agent enters thinking/working.
  - **Then:** Slot 1’s Stream Deck key updates to the thinking visual within a short interactive delay (on the order of a second, not minutes).

- AE2. Focus from deck
  - **Covers:** R7
  - **Given:** Slots 1 and 2 follow different agents; ChatGPT focus is on agent 1.
  - **When:** Operator presses agent key 2.
  - **Then:** ChatGPT selects/focuses agent 2 without requiring a mouse click in the ChatGPT UI.

- AE3. Companion stopped
  - **Covers:** R10
  - **Given:** Status was previously live on assigned keys.
  - **When:** Companion is quit or the Micro link fails.
  - **Then:** Keys do not continue to show fresh “healthy” agent colors; operator sees disconnected/offline or equivalent.

- AE4. Fewer physical keys than slots
  - **Covers:** R4, R8
  - **Given:** A Stream Deck model with fewer than six buttons is used.
  - **When:** Operator configures agent keys.
  - **Then:** They can still work with a defined subset or paged mapping of the six logical slots without the product claiming impossible simultaneous six-key hardware on that model.

## Success Criteria

- S1. On the author’s Mac, with ChatGPT desktop Codex running, **at least one agent slot** shows real state changes end-to-end for a full run (idle → working → complete or needs input).
- S2. Press-to-focus works for assigned slots in daily use without falling back to mouse for agent switching.
- S3. A cold-start checklist in the README/plugin docs is short enough that the author can recover from reboot in under a few minutes.
- S4. Plugin packaging validates against Stream Deck CLI/Marketplace rules even if companion install remains a separate step for MVP.

## Scope Boundaries

**In scope (v1 / MVP)**

- Stream Deck Marketplace-shaped plugin
- macOS companion required for Micro protocol / status
- ChatGPT desktop Codex only
- Agent status keys: live colors + focus
- Adaptive layouts across Stream Deck models
- Clear offline/recovery behavior and first-run docs

**Deferred for later**

- Command keys: approve, reject, PTT, branch, submit
- Reasoning depth dial and joystick workflows
- Double-tap foreground behavior parity with Micro (if distinct from single-tap focus)
- Windows companion
- Multi-agent backends (Codex CLI, Claude Code, etc.)
- Polished one-click Marketplace onboarding that fully hides companion complexity
- Official Elgato review submission until personal reliability is proven

**Outside this product’s identity**

- Selling or shipping Codex Micro hardware
- A pure hotkey profile pack with no live status path
- Replacing ChatGPT/Codex as the agent runtime

## Dependencies / Assumptions

- D1. ChatGPT desktop continues to support Codex Micro discovery and the Micro HID/RPC status + key event protocol.
- D2. Presenting a virtual Micro to ChatGPT on macOS remains feasible (shim and/or virtual HID entitlement path). App updates may break detection; maintenance is expected.
- D3. Stream Deck Software and the Elgato plugin SDK support custom key imagery/state updates at interactive rates for multi-key layouts.
- D4. Slot-to-task assignment (recent / priority / pinned / custom) is primarily owned by ChatGPT’s Micro settings; the plugin may mirror or configure only what the protocol and UX allow.
- D5. Companion is distributed as a **separate GitHub release** (signed macOS app/binary). The Marketplace plugin links setup/docs to that download rather than bundling the companion inside the plugin package.
- A1. “Works without a Micro” means **emulating Micro presence to ChatGPT**, not a separate public OpenAI Stream Deck API.
- A2. Marketplace review may require clear disclosure of the companion and any ChatGPT launch/detection steps.

## Outstanding Questions

**Deferred to planning**

- Q1. ChatGPT detection path for v1: process shim only, virtual HID helper, or shim primary with HID stretch goal — spike both and pick with evidence.
- Q2. Exact visual design for states (colors, labels, icons, animation/pulse) and property inspector settings surface.
- Q3. IPC mechanism between companion and plugin (local socket, HTTP, etc.).
- Q4. How much protocol reimplementation vs careful study of existing interoperability projects (without improper asset/code reuse).
- Q5. Stream Deck model matrix and default profiles for Mini / MK.2 / Plus / XL / Neo.

## Sources / Research

- Work Louder Codex Micro product behavior: agent keys with idle / thinking / complete / needs input / error; command keys; dial; joystick ([worklouder.cc/codex-micro](https://worklouder.cc/codex-micro)).
- Community Stream Deck recreations via hotkeys and third-party status plugins (no Micro protocol) vs full Micro emulators that inject virtual device presence for ChatGPT.
- Open-source interoperability projects document Micro discovery (VID/PID/usage), HID framing, JSON-RPC methods (`v.oai.thstatus`, `v.oai.hid`, etc.), and macOS shim vs virtual HID entitlement trade-offs — useful as protocol research, not as a product fork decision.
- Elgato Stream Deck SDK / CLI: Node-based plugins, `streamdeck create` / `validate` / `pack`, Stream Deck 7.1+ plugin environment.
