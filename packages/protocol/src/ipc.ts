import type { AgentState } from "./states.js";

/** Shared localhost WebSocket message schema (plugin ↔ companion). */

export const IPC_PROTOCOL_VERSION = 1;
export const DEFAULT_IPC_PORT = 19847;

export type IpcHealth = {
  companion: "up" | "down";
  chatgpt: "connected" | "waiting" | "error" | "unknown";
};

export type IpcHello = {
  type: "hello";
  v: typeof IPC_PROTOCOL_VERSION;
  role: "plugin" | "companion";
};

export type IpcStatus = {
  type: "status";
  v: typeof IPC_PROTOCOL_VERSION;
  slot: number;
  state: AgentState;
  color?: number;
};

export type IpcHealthMsg = {
  type: "health";
  v: typeof IPC_PROTOCOL_VERSION;
} & IpcHealth;

export type IpcFocus = {
  type: "focus";
  v: typeof IPC_PROTOCOL_VERSION;
  slot: number;
};

export type IpcError = {
  type: "error";
  v: typeof IPC_PROTOCOL_VERSION;
  message: string;
};

export type IpcMessage =
  | IpcHello
  | IpcStatus
  | IpcHealthMsg
  | IpcFocus
  | IpcError;

export function parseIpcMessage(raw: string): IpcMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.v !== IPC_PROTOCOL_VERSION) return null;
  switch (msg.type) {
    case "hello":
    case "status":
    case "health":
    case "focus":
    case "error":
      return msg as unknown as IpcMessage;
    default:
      return null;
  }
}

export function serializeIpc(msg: IpcMessage): string {
  return JSON.stringify(msg);
}
