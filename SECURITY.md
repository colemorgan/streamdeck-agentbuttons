# Security Policy

## Supported Versions

Security fixes are applied to the current 1.0.x release line. Older versions
are not supported; please update to the latest release.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Please report vulnerabilities through GitHub's private vulnerability reporting
for this repository:

https://github.com/colemorgan/streamdeck-agentbuttons/security/advisories/new

**Do not open a public issue** for security vulnerabilities.

This is a personal, spare-time open-source project, so there is no formal SLA,
but you can reasonably expect:

- An acknowledgement of your report within about a week.
- A good-faith effort to assess, fix, and disclose confirmed issues, with
  credit to the reporter if desired.

If you have not heard back after two weeks, a polite follow-up on the same
advisory is welcome.

## Security Model

The design keeps every component local to your machine:

- **Plugin ↔ companion IPC** is a JSON-over-WebSocket channel that binds only
  to `127.0.0.1` (port 19847 by default); it never listens on external
  interfaces. See `companion/src/ipc-server.ts`.
- **ChatGPT shim channel** is a Unix domain socket in the user tempdir
  (`$TMPDIR/agentbuttons-codex-micro.sock`, overridable via
  `AGENTBUTTONS_SHIM_SOCKET`), created with `0600` permissions so only your
  user can connect. See `companion/src/detection/socket-server.ts`.
- **The shim preload** (`companion/shim/preload.cjs`) is injected into ChatGPT
  desktop via `NODE_OPTIONS=--require` and only patches module loading in
  memory. It never modifies ChatGPT's files on disk.
- **`launch-chatgpt.sh`** launches ChatGPT through macOS Launch Services
  (`open --env`) with a deliberately clean environment (`env -i`), because a
  polluted agent shell environment (e.g. `ELECTRON_RUN_AS_NODE=1`) breaks
  macOS TCC / Input Monitoring. It never exec's the ChatGPT binary directly.
- **No credentials** are stored in this repository, and none are required by
  the plugin or companion at runtime.
