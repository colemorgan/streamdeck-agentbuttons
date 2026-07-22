#!/usr/bin/env node
import { DEFAULT_IPC_PORT } from "@agentbuttons/protocol";
import { Bridge } from "./bridge.js";
import { CompanionIpcServer } from "./ipc-server.js";
import {
  ShimSocketServer,
  defaultShimSocketPath,
} from "./detection/socket-server.js";

export type CliArgs = {
  help?: boolean;
  version?: boolean;
  port: number;
  verbose: boolean;
  demo: boolean;
  chatgpt: boolean;
  socket: string;
};

export function parseArgs(argv: string[]): CliArgs {
  let port = DEFAULT_IPC_PORT;
  let verbose = false;
  let demo = false;
  let chatgpt = false;
  let socket = defaultShimSocketPath();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { help: true, port, verbose, demo, chatgpt, socket };
    if (a === "--version" || a === "-v")
      return { version: true, port, verbose, demo, chatgpt, socket };
    if (a === "--verbose") verbose = true;
    if (a === "--demo") demo = true;
    if (a === "--chatgpt") chatgpt = true;
    if (a === "--port") {
      port = Number(argv[++i]);
      if (!Number.isFinite(port) || port <= 0) {
        throw new Error("Invalid --port");
      }
    }
    if (a === "--socket") {
      socket = String(argv[++i] || "");
      if (!socket) throw new Error("Invalid --socket");
    }
  }
  return { help: false, version: false, port, verbose, demo, chatgpt, socket };
}

export function helpText(port: number = DEFAULT_IPC_PORT): string {
  return `agentbuttons-companion — macOS bridge for ChatGPT Codex Micro protocol

Usage:
  agentbuttons-companion [--port <n>] [--verbose] [--demo] [--chatgpt]
  agentbuttons-companion --help
  agentbuttons-companion --version

Options:
  --port <n>     WebSocket IPC port for the Stream Deck plugin (default: ${port})
  --verbose      Extra logging
  --demo         Cycle demo agent states (no ChatGPT required)
  --chatgpt      Listen for ChatGPT shim on a Unix socket (virtual Micro)
  --socket <p>   Override shim Unix socket path

Install order:
  1. Build/install the Stream Deck plugin
  2. Start this companion (--demo and/or --chatgpt)
  3. For live ChatGPT status: run companion/scripts/launch-chatgpt.sh
  4. Assign Agent Slot actions; verify one key lights

Default IPC: ws://127.0.0.1:${port}
See companion/README.md for details.
`;
}

export const VERSION = "0.1.0";

/** Run companion server; returns stop() for clean shutdown. */
export function startCompanion(args: CliArgs): {
  stop: () => void;
  port: number;
  socketPath?: string;
} {
  const bridge = new Bridge();
  if (args.verbose) {
    bridge.on("log", (m) => console.error(`[emu] ${m}`));
    bridge.on("slots", (s) =>
      console.error(`[slots] ${s.map((x) => `${x.slot}:${x.state}`).join(" ")}`),
    );
    bridge.on("health", (h) =>
      console.error(`[health] chatgpt=${h.chatgpt}`),
    );
  }

  const ipc = new CompanionIpcServer(bridge, {
    port: args.port,
    verbose: args.verbose,
  });
  const listenPort = ipc.start();
  console.error(
    `agentbuttons-companion up — IPC ws://127.0.0.1:${listenPort}`,
  );

  let shim: ShimSocketServer | undefined;
  if (args.chatgpt) {
    shim = new ShimSocketServer(bridge, args.socket);
    const p = shim.start();
    console.error(`[chatgpt] shim socket listening at ${p}`);
    console.error(
      `[chatgpt] launch ChatGPT via companion/scripts/launch-chatgpt.sh`,
    );
  } else {
    console.error(
      `[chatgpt] waiting (use --chatgpt for shim socket, or --demo for fake status)`,
    );
  }

  let demoTimer: ReturnType<typeof setInterval> | undefined;
  if (args.demo) {
    const states = [
      "idle",
      "working",
      "complete",
      "awaiting",
      "error",
      "off",
    ] as const;
    let t = 0;
    demoTimer = setInterval(() => {
      for (let slot = 0; slot < 6; slot++) {
        const state = states[(t + slot) % states.length]!;
        bridge.injectSlot(slot, state);
      }
      t++;
    }, 2000);
    console.error("[demo] cycling slot states every 2s");
  }

  const stop = () => {
    if (demoTimer) clearInterval(demoTimer);
    shim?.stop();
    ipc.stop();
  };

  return { stop, port: listenPort, socketPath: shim?.path };
}

// CLI entry when executed directly
const isMain =
  process.argv[1]?.endsWith("cli.js") ||
  process.argv[1]?.endsWith("cli.ts") ||
  process.argv[1]?.includes("companion/dist/cli");

if (isMain) {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }

  if (args.help) {
    console.log(helpText(args.port));
    process.exit(0);
  }
  if (args.version) {
    console.log(VERSION);
    process.exit(0);
  }

  const { stop } = startCompanion(args);
  const shutdown = () => {
    stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
