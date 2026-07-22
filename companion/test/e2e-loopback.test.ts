import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import {
  DEFAULT_IPC_PORT,
  IPC_PROTOCOL_VERSION,
  parseIpcMessage,
  serializeIpc,
  type IpcMessage,
} from "@agentbuttons/protocol";
import { Bridge } from "../src/bridge.js";
import { CompanionIpcServer } from "../src/ipc-server.js";
import { LoopbackHost } from "../src/transports/loopback.js";

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
}

class MessageInbox {
  private queue: string[] = [];
  private waiters: Array<(s: string) => void> = [];

  constructor(ws: WebSocket) {
    ws.on("message", (d) => {
      const text = typeof d === "string" ? d : d.toString("utf8");
      const w = this.waiters.shift();
      if (w) w(text);
      else this.queue.push(text);
    });
  }

  next(timeoutMs = 2000): Promise<string> {
    if (this.queue.length) return Promise.resolve(this.queue.shift()!);
    return new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("message timeout")),
        timeoutMs,
      );
      this.waiters.push((s) => {
        clearTimeout(t);
        resolve(s);
      });
    });
  }

  async waitFor(
    pred: (m: IpcMessage) => boolean,
    timeoutMs = 3000,
  ): Promise<IpcMessage> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const raw = await this.next(deadline - Date.now());
      const msg = parseIpcMessage(raw);
      if (msg && pred(msg)) return msg;
    }
    throw new Error("predicate timeout");
  }
}

describe("E2E loopback IPC", () => {
  let ipc: CompanionIpcServer | null = null;
  let ws: WebSocket | null = null;

  afterEach(() => {
    ws?.close();
    ipc?.stop();
    ws = null;
    ipc = null;
  });

  it("thstatus fans out status over IPC; focus returns hid events", async () => {
    const port = DEFAULT_IPC_PORT + 17;
    const bridge = new Bridge();
    const host = new LoopbackHost(bridge.emulator);
    ipc = new CompanionIpcServer(bridge, { port });
    ipc.start();

    ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const inbox = new MessageInbox(ws);
    await waitForOpen(ws);

    const hello = parseIpcMessage(await inbox.next());
    expect(hello?.type).toBe("hello");

    host.send({
      id: 10,
      method: "v.oai.thstatus",
      params: { slots: [{ i: 2, status: "awaiting" }] },
    });

    await inbox.waitFor(
      (m) => m.type === "status" && m.slot === 2 && m.state === "awaiting",
    );

    ws.send(
      serializeIpc({
        type: "focus",
        v: IPC_PROTOCOL_VERSION,
        slot: 2,
      }),
    );
    await new Promise((r) => setTimeout(r, 30));

    const replies = host
      .drainReplies()
      .filter((r) => (r as { m?: string }).m === "v.oai.hid");
    expect(
      replies.some((r) => (r as { p: { k: string } }).p.k === "AG02"),
    ).toBe(true);
  });
});
