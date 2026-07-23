# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-23

Initial public release. MIT licensed.

### Added

- Stream Deck plugin with a single **Agent Slot** action: live ChatGPT desktop Codex agent status on up to 6 slots (AG00–AG05), with key faces showing glyph, slot label (A1–A6 or custom), and state word
- Property Inspector with companion/ChatGPT health status, auto-saving settings, and setup guidance
- macOS companion bridge that emulates a Codex Micro HID device and fans slot state out to the plugin over localhost WebSocket IPC
- Companion CLI with `--chatgpt` (live, via Unix-socket shim tunneled into ChatGPT's `node-hid`) and `--demo` (fake cycling states, no ChatGPT required) modes
- SwiftUI menu bar app wrapping the companion: Start Bridge, Launch ChatGPT with Agent Keys, logs, login item
- Plugin↔companion IPC protocol (`@agentbuttons/protocol`): HID 64-byte report framing, Micro JSON-RPC emulator, state/color mapping, WebSocket schema v1
- Offline/Off/Idle visual distinction on keys when the companion is not connected
- User documentation: setup, troubleshooting, companion install, and acceptance checklist under `docs/user/`

[1.0.0]: https://github.com/colemorgan/streamdeck-agentbuttons/releases/tag/v1.0.0
