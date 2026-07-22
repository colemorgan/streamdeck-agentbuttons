import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import {
  DEFAULT_IPC_PORT,
  IPC_PROTOCOL_VERSION,
  serializeIpc,
  parseIpcMessage,
} from "@agentbuttons/protocol";
import { CompanionIpcClient } from "./ipc-client.js";
import { stateImageDataUrl } from "./render/state-image.js";

describe("CompanionIpcClient (shipped client)", () => {
  let wss: WebSocketServer | null = null;
  const port = DEFAULT_IPC_PORT + 91;

  afterEach(() => {
    wss?.close();
    wss = null;
  });

  it("receives status and sends focus to companion", async () => {
    const received: string[] = [];
    wss = new WebSocketServer({ host: "127.0.0.1", port });
    wss.on("connection", (ws) => {
      ws.send(
        serializeIpc({
          type: "hello",
          v: IPC_PROTOCOL_VERSION,
          role: "companion",
        }),
      );
      ws.send(
        serializeIpc({
          type: "status",
          v: IPC_PROTOCOL_VERSION,
          slot: 0,
          state: "working",
          color: 0x304ffe,
        }),
      );
      ws.on("message", (d) => {
        received.push(typeof d === "string" ? d : d.toString("utf8"));
      });
    });

    const statuses: Array<{ slot: number; state: string }> = [];
    let connected = false;
    const client = new CompanionIpcClient(
      {
        onConnection: (ok) => {
          connected = ok;
        },
        onStatus: (slot, state) => statuses.push({ slot, state }),
      },
      port,
    );
    client.start();

    await new Promise((r) => setTimeout(r, 100));
    expect(connected).toBe(true);
    expect(statuses.some((s) => s.slot === 0 && s.state === "working")).toBe(
      true,
    );

    const ok = client.focus(4);
    expect(ok).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    const focus = received
      .map((r) => parseIpcMessage(r))
      .find((m) => m?.type === "focus");
    expect(focus).toMatchObject({ type: "focus", slot: 4 });

    client.stop();
  });
});

describe("offline vs idle paint", () => {
  it("offline face differs from idle face", () => {
    const idle = stateImageDataUrl("idle", "A1");
    const offline = stateImageDataUrl("offline", "A1");
    const off = stateImageDataUrl("off", "A1");
    expect(idle).not.toEqual(offline);
    expect(off).not.toEqual(offline);
    expect(off).not.toEqual(idle);
  });
});
