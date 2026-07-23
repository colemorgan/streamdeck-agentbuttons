# Changelog

## 1.0.0.0 (pack target)

First Marketplace-shaped release train.

### Plugin
- Agent Slot keys with polished faces (glyph + A1–A6 / custom label + state word)
- Property Inspector: companion/ChatGPT health, auto-save, setup guidance, legal footer
- Offline / Off / Idle distinct; quiet production logging in release pack
- macOS-only; requires external companion

### Companion
- CLI `--chatgpt` / `--demo` bridge
- Menu bar app (`build-macos-app.sh`) with Start Bridge, Launch ChatGPT with Agent Keys, logs, login item, About
- Clean Launch Services ChatGPT launch (avoids `ELECTRON_RUN_AS_NODE` breaking Input Monitoring)

### Docs
- `docs/user/setup.md`, troubleshooting, companion-install, acceptance checklist
- `docs/marketplace/listing.md`

## 0.2.0.0

- Daily-driver polish: faces, PI health, custom labels
- Companion menu bar app packaging

## 0.1.0.0

- Initial MVP: IPC status + focus, shim socket, Agent Slot action
