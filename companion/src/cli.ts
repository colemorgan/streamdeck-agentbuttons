#!/usr/bin/env node
/**
 * Codex Agent Buttons companion CLI (stub until U3).
 */
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`agentbuttons-companion — macOS bridge for ChatGPT Codex Micro protocol

Usage:
  agentbuttons-companion [--port <n>] [--verbose]
  agentbuttons-companion --help
  agentbuttons-companion --version

Options:
  --port <n>   WebSocket IPC port for the Stream Deck plugin (default: 19847)
  --verbose    Extra logging
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log("0.1.0");
  process.exit(0);
}

console.error(
  "Companion bridge not implemented yet (U3). Protocol package is available; run npm test -w @agentbuttons/protocol",
);
process.exit(1);
