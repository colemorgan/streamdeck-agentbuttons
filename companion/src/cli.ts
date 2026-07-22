#!/usr/bin/env node
import { DEFAULT_IPC_PORT } from "@agentbuttons/protocol";
import { Bridge } from "./bridge.js";
import { CompanionIpcServer } from "./ipc-server.js";

function parseArgs(argv: string[]) {
  let port = DEFAULT_IPC_PORT;
  let verbose = false;
  let demo = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { help: true } as const;
    if (a === "--version" || a === "-v") return { version: true } as const;
    if (a === "--verbose") verbose = true;
    if (a === "--demo") demo = true;
    if (a === "--port") {
      port = Number(argv[++i]);
      if (!Number.isFinite(port) || port <= 0) {
        console.error("Invalid --port");
        process.exit(2);
      }
    }
  }
  return { help: false, version: false, port, verbose, demo } as const;
}

const args = parseArgs(process.argv.slice(2));

if ("help" in args && args.help) {
  console.log(`agentbuttons-companion — macOS bridge for ChatGPT Codex Micro protocol

Usage:
  agentbuttons-companion [--port <n>] [--verbose] [--demo]
  agentbuttons-companion --help
  agentbuttons-companion --version

Options:
  --port <n>   WebSocket IPC port for the Stream Deck plugin (default: ${DEFAULT_IPC_PORT})
  --verbose    Extra logging
  --demo       Cycle demo agent states (no ChatGPT required)

ChatGPT detection (shim) is not fully wired in this build; use --demo to drive
the Stream Deck plugin, or feed protocol via tests. See companion/README.md.
`);
  process.exit(0);
}

if ("version" in args && args.version) {
  console.log("0.1.0");
  process.exit(0);
}

const { port, verbose, demo } = args as {
  port: number;
  verbose: boolean;
  demo: boolean;
};

const bridge = new Bridge();
if (verbose) {
  bridge.on("log", (m) => console.error(`[emu] ${m}`));
  bridge.on("slots", (s) =>
    console.error(
      `[slots] ${s.map((x) => `${x.slot}:${x.state}`).join(" ")}`,
    ),
  );
}

const ipc = new CompanionIpcServer(bridge, { port, verbose });
const listenPort = ipc.start();
console.error(
  `agentbuttons-companion up — IPC ws://127.0.0.1:${listenPort} (chatgpt: waiting)`,
);

if (demo) {
  const states = [
    "idle",
    "working",
    "complete",
    "awaiting",
    "error",
    "off",
  ] as const;
  let t = 0;
  setInterval(() => {
    for (let slot = 0; slot < 6; slot++) {
      const state = states[(t + slot) % states.length]!;
      bridge.injectSlot(slot, state);
    }
    t++;
  }, 2000);
  console.error("[demo] cycling slot states every 2s");
}

process.on("SIGINT", () => {
  ipc.stop();
  process.exit(0);
});
