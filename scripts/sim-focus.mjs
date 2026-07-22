#!/usr/bin/env node
/**
 * Simulate a Stream Deck Agent Slot press (Micro AG0N press+release).
 * Usage: node scripts/sim-focus.mjs [slot 0-5] [--port 19847]
 */
import { WebSocket } from "ws";

const args = process.argv.slice(2);
let slot = 0;
let port = 19847;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port") port = Number(args[++i]);
  else if (!args[i].startsWith("-")) slot = Number(args[i]);
}
if (!Number.isInteger(slot) || slot < 0 || slot > 5) {
  console.error("slot must be 0..5 (Stream Deck shows Slot 1..6)");
  process.exit(2);
}

const ws = new WebSocket(`ws://127.0.0.1:${port}`);
ws.on("error", (e) => {
  console.error("IPC error — is companion running?", e.message);
  process.exit(1);
});
ws.on("open", () => {
  ws.send(JSON.stringify({ type: "focus", v: 1, slot }));
  console.log(
    `focus slot=${slot} → Stream Deck Slot ${slot + 1} / Micro AG${String(slot).padStart(2, "0")}`,
  );
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 150);
});
