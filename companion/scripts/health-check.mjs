#!/usr/bin/env node
/**
 * One-shot health probe for the menu bar app / scripts.
 * Prints a single JSON line: { companion, chatgpt, ok }
 */
import WebSocket from "ws";
import { DEFAULT_IPC_PORT, IPC_PROTOCOL_VERSION } from "@agentbuttons/protocol";

const port = Number(process.env.AGENTBUTTONS_PORT || DEFAULT_IPC_PORT);
const timeoutMs = Number(process.env.AGENTBUTTONS_HEALTH_TIMEOUT || 1500);

const result = {
  ok: false,
  companion: "down",
  chatgpt: "unknown",
};

const ws = new WebSocket(`ws://127.0.0.1:${port}`);
const timer = setTimeout(() => {
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}, timeoutMs);

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "hello",
      v: IPC_PROTOCOL_VERSION,
      role: "health-check",
    }),
  );
});

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(String(data));
    if (msg.type === "hello") {
      result.companion = "up";
      result.ok = true;
    }
    if (msg.type === "health") {
      result.companion = msg.companion || "up";
      result.chatgpt = msg.chatgpt || "unknown";
      result.ok = true;
      clearTimeout(timer);
      console.log(JSON.stringify(result));
      ws.close();
      process.exit(0);
    }
  } catch {
    /* ignore */
  }
});

ws.on("error", () => {
  /* timeout handler exits */
});
