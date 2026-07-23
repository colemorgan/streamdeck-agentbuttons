import WebSocket from "ws";
import {
  DEFAULT_IPC_PORT,
  IPC_PROTOCOL_VERSION,
  parseIpcMessage,
  serializeIpc,
  type AgentState,
  type IpcMessage,
} from "@agentbuttons/protocol";

export type IpcClientHandlers = {
  onStatus?: (slot: number, state: AgentState, color?: number) => void;
  onHealth?: (chatgpt: string, companion: string) => void;
  onConnection?: (connected: boolean) => void;
  onLog?: (msg: string) => void;
};

/**
 * WebSocket client to the macOS companion.
 * Uses the `ws` package — Stream Deck runs Node 20 without a global WebSocket.
 */
export class CompanionIpcClient {
  private ws: WebSocket | null = null;
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly port: number;

  constructor(
    private readonly handlers: IpcClientHandlers = {},
    port: number = DEFAULT_IPC_PORT,
  ) {
    this.port = port;
  }

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }

  focus(slot: number): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(
      serializeIpc({
        type: "focus",
        v: IPC_PROTOCOL_VERSION,
        slot,
      }),
    );
    return true;
  }

  private connect(): void {
    if (this.closed) return;
    try {
      this.handlers.onLog?.(`ipc connecting ws://127.0.0.1:${this.port}`);
      const ws = new WebSocket(`ws://127.0.0.1:${this.port}`);
      this.ws = ws;

      ws.on("open", () => {
        this.handlers.onLog?.("ipc open");
        this.handlers.onConnection?.(true);
        ws.send(
          serializeIpc({
            type: "hello",
            v: IPC_PROTOCOL_VERSION,
            role: "plugin",
          }),
        );
      });

      ws.on("message", (data) => {
        const text =
          typeof data === "string"
            ? data
            : Buffer.isBuffer(data)
              ? data.toString("utf8")
              : String(data);
        const msg = parseIpcMessage(text);
        if (!msg) return;
        this.dispatch(msg);
      });

      ws.on("close", () => {
        this.handlers.onLog?.("ipc close");
        this.handlers.onConnection?.(false);
        this.scheduleReconnect();
      });

      ws.on("error", (err) => {
        this.handlers.onLog?.(`ipc error: ${err.message}`);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      });
    } catch (e) {
      this.handlers.onLog?.(String(e));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
  }

  private dispatch(msg: IpcMessage): void {
    switch (msg.type) {
      case "status":
        this.handlers.onStatus?.(msg.slot, msg.state, msg.color);
        break;
      case "health":
        this.handlers.onHealth?.(msg.chatgpt, msg.companion);
        break;
      default:
        break;
    }
  }
}
