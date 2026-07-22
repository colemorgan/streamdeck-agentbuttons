import { extractJsonObjects, encodeReports, CHANNEL_RPC } from "./framing.js";
import { agentFocusEvents } from "./keys.js";
import {
  type AgentState,
  mapStatusToState,
  STATE_COLORS,
} from "./states.js";

export type SlotStatus = {
  slot: number;
  state: AgentState;
  color: number;
};

export type EmulatorEvents = {
  lighting: (slots: SlotStatus[]) => void;
  outbound: (line: string) => void;
  log: (msg: string) => void;
};

type RpcRequest = {
  id?: number;
  method?: string;
  m?: string;
  params?: unknown;
  p?: unknown;
};

const FIRMWARE_VERSION = "agentbuttons-0.1.0";

/**
 * Transport-agnostic Codex Micro JSON-RPC state machine.
 * Feed host text via {@link feedHostText}; outbound lines are newline-terminated.
 */
export class MicroEmulator {
  private hostBuffer = "";
  private slots: SlotStatus[] = Array.from({ length: 6 }, (_, slot) => ({
    slot,
    state: "off" as AgentState,
    color: STATE_COLORS.off,
  }));
  private listeners: Partial<EmulatorEvents> = {};

  on<K extends keyof EmulatorEvents>(event: K, fn: EmulatorEvents[K]): void {
    this.listeners[event] = fn;
  }

  getSlots(): readonly SlotStatus[] {
    return this.slots;
  }

  /** Feed raw UTF-8 from host (ChatGPT). May contain partial JSON. */
  feedHostText(chunk: string): void {
    this.hostBuffer += chunk;
    const { objects, rest } = extractJsonObjects(this.hostBuffer);
    this.hostBuffer = rest;
    for (const obj of objects) {
      this.handleRequestText(obj);
    }
  }

  /** Convenience: feed one complete JSON request string. */
  handleRequestText(jsonText: string): void {
    let req: RpcRequest;
    try {
      req = JSON.parse(jsonText) as RpcRequest;
    } catch {
      this.emitLog(`invalid json: ${jsonText.slice(0, 80)}`);
      return;
    }
    this.handleRequest(req);
  }

  handleRequest(req: RpcRequest): void {
    const method = req.method ?? req.m ?? "";
    const id = req.id;
    const params = (req.params ?? req.p ?? {}) as Record<string, unknown>;

    let result: unknown = true;

    switch (method) {
      case "device.status":
        result = {
          version: FIRMWARE_VERSION,
          profile_index: 0,
          layer_index: 0,
          battery: 100,
          is_charging: true,
        };
        break;
      case "sys.version":
        result = FIRMWARE_VERSION;
        break;
      case "v.oai.rgbcfg":
      case "lights.preview":
        result = true;
        break;
      case "v.oai.thstatus":
        result = true;
        this.applyThreadStatus(params);
        break;
      default:
        // Always reply so the app queue does not wedge
        result = true;
        this.emitLog(`unknown method ${method}`);
    }

    if (id !== undefined && id !== null) {
      this.sendJson({ id, result });
    }
  }

  /** Send focus press/release for agent slot 0..5. */
  focusSlot(slot: number): void {
    for (const evt of agentFocusEvents(slot)) {
      this.sendJson(evt);
    }
  }

  /** Encode an outbound logical line into HID reports (for transports). */
  encodeOutboundLine(line: string): Uint8Array[] {
    const withNl = line.endsWith("\n") ? line : `${line}\n`;
    return encodeReports(withNl, CHANNEL_RPC);
  }

  private applyThreadStatus(params: Record<string, unknown>): void {
    // Accept several shapes:
    // { slots: [{ i, status, color }, ...] }
    // { threads: [...] }
    // { 0: { status }, 1: ... }
    const updated: SlotStatus[] = [];

    const list =
      (params.slots as unknown[]) ??
      (params.threads as unknown[]) ??
      (params.th as unknown[]) ??
      null;

    if (Array.isArray(list)) {
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const slot = Number(o.i ?? o.slot ?? o.index ?? o.ag ?? -1);
        if (slot < 0 || slot > 5) continue;
        const status = (o.status ?? o.state ?? o.s) as string | undefined;
        const color = o.color != null ? Number(o.color) : null;
        const state = mapStatusToState(status, color);
        const packed =
          color != null && !Number.isNaN(color)
            ? color & 0xffffff
            : STATE_COLORS[state];
        this.slots[slot] = { slot, state, color: packed };
        updated.push(this.slots[slot]!);
      }
    } else {
      for (let slot = 0; slot < 6; slot++) {
        const entry = params[String(slot)] ?? params[slot];
        if (!entry || typeof entry !== "object") continue;
        const o = entry as Record<string, unknown>;
        const status = (o.status ?? o.state) as string | undefined;
        const color = o.color != null ? Number(o.color) : null;
        const state = mapStatusToState(status, color);
        const packed =
          color != null && !Number.isNaN(color)
            ? color & 0xffffff
            : STATE_COLORS[state];
        this.slots[slot] = { slot, state, color: packed };
        updated.push(this.slots[slot]!);
      }
    }

    if (updated.length > 0) {
      this.listeners.lighting?.(this.slots.map((s) => ({ ...s })));
    }
  }

  private sendJson(value: unknown): void {
    const line = JSON.stringify(value);
    // device→host must be newline-delimited
    this.listeners.outbound?.(line.endsWith("\n") ? line : `${line}\n`);
  }

  private emitLog(msg: string): void {
    this.listeners.log?.(msg);
  }
}
