import { WebSocketServer, type WebSocket } from "ws";
import {
  DEFAULT_IPC_PORT,
  IPC_PROTOCOL_VERSION,
  parseIpcMessage,
  serializeIpc,
  type IpcMessage,
  type SlotStatus,
} from "@agentbuttons/protocol";
import type { Bridge } from "./bridge.js";

export type IpcServerOptions = {
  port?: number;
  verbose?: boolean;
};

/**
 * Localhost WebSocket server for Stream Deck plugin clients.
 */
export class CompanionIpcServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  constructor(
    private readonly bridge: Bridge,
    private readonly options: IpcServerOptions = {},
  ) {}

  start(): number {
    const port = this.options.port ?? DEFAULT_IPC_PORT;
    this.wss = new WebSocketServer({ host: "127.0.0.1", port });

    this.bridge.on("slots", (slots) => this.broadcastSlots(slots));
    this.bridge.on("health", (h) => {
      this.broadcast({
        type: "health",
        v: IPC_PROTOCOL_VERSION,
        companion: h.companion,
        chatgpt: h.chatgpt,
      });
    });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      this.send(
        ws,
        {
          type: "hello",
          v: IPC_PROTOCOL_VERSION,
          role: "companion",
        },
      );
      const health = this.bridge.getHealth();
      this.send(ws, {
        type: "health",
        v: IPC_PROTOCOL_VERSION,
        companion: health.companion,
        chatgpt: health.chatgpt,
      });
      this.broadcastSlots(this.bridge.getSlots(), ws);

      ws.on("message", (data) => {
        const text = typeof data === "string" ? data : data.toString("utf8");
        this.handleClientMessage(text);
      });
      ws.on("close", () => this.clients.delete(ws));
    });

    if (this.options.verbose) {
      console.error(`[ipc] listening on ws://127.0.0.1:${port}`);
    }
    return port;
  }

  stop(): void {
    for (const c of this.clients) c.close();
    this.clients.clear();
    this.wss?.close();
    this.wss = null;
  }

  private handleClientMessage(text: string): void {
    const msg = parseIpcMessage(text);
    if (!msg) return;
    if (msg.type === "focus") {
      try {
        this.bridge.focusSlot(msg.slot);
      } catch (e) {
        this.broadcast({
          type: "error",
          v: IPC_PROTOCOL_VERSION,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  private broadcastSlots(
    slots: readonly SlotStatus[],
    only?: WebSocket,
  ): void {
    for (const s of slots) {
      const msg: IpcMessage = {
        type: "status",
        v: IPC_PROTOCOL_VERSION,
        slot: s.slot,
        state: s.state,
        color: s.color,
      };
      if (only) this.send(only, msg);
      else this.broadcast(msg);
    }
  }

  private broadcast(msg: IpcMessage): void {
    const raw = serializeIpc(msg);
    for (const c of this.clients) {
      if (c.readyState === c.OPEN) c.send(raw);
    }
  }

  private send(ws: WebSocket, msg: IpcMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(serializeIpc(msg));
  }
}
