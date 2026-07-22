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

/** Normalize various host lighting param shapes into a list of slot objects. */
export function normalizeThreadLightingItems(params: unknown): unknown[] {
  // Real ChatGPT: params is minimized array [{id,c,b,e,s,...}]
  if (Array.isArray(params)) return params;

  if (!params || typeof params !== "object") return [];

  const p = params as Record<string, unknown>;
  const nested =
    (p.slots as unknown) ?? (p.threads as unknown) ?? (p.th as unknown);
  if (Array.isArray(nested)) return nested;

  // { "0": {...}, "1": {...} }
  const fromKeys: unknown[] = [];
  for (let slot = 0; slot < 6; slot++) {
    const entry = p[String(slot)] ?? p[slot as unknown as string];
    if (entry && typeof entry === "object") {
      fromKeys.push({ id: slot, ...(entry as object) });
    }
  }
  return fromKeys;
}

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
  private lightingListeners: Array<EmulatorEvents["lighting"]> = [];
  private outboundListeners: Array<EmulatorEvents["outbound"]> = [];
  private logListeners: Array<EmulatorEvents["log"]> = [];

  on<K extends keyof EmulatorEvents>(event: K, fn: EmulatorEvents[K]): void {
    if (event === "lighting")
      this.lightingListeners.push(fn as EmulatorEvents["lighting"]);
    else if (event === "outbound")
      this.outboundListeners.push(fn as EmulatorEvents["outbound"]);
    else if (event === "log")
      this.logListeners.push(fn as EmulatorEvents["log"]);
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
    // ChatGPT may send params as object OR array (v.oai.thstatus uses array)
    const params = req.params ?? req.p ?? {};

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
        this.emitLog(
          `thstatus params=${Array.isArray(params) ? `array[${params.length}]` : typeof params}`,
        );
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

  /**
   * Parse host → device thread lighting.
   *
   * Real ChatGPT/Work Louder format (params is an array):
   *   [{ id, c, b, e, s, sk?, sa? }, ...]
   * where c is packed RGB from status:
   *   working=0x304FFE, unread=0x00FF4C, idle=0xFFFFFF,
   *   awaiting-*=0xFF6D00, error=0xFF0033, off=0
   *
   * Also accepts test/demo shapes:
   *   { slots: [{ i|id, status, color }] } | { threads: [...] }
   */
  private applyThreadStatus(params: unknown): void {
    const updated: SlotStatus[] = [];
    const items = normalizeThreadLightingItems(params);

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const slot = Number(
        o.id ?? o.i ?? o.slot ?? o.index ?? o.ag ?? -1,
      );
      if (!Number.isInteger(slot) || slot < 0 || slot > 5) continue;

      // Real payload uses short keys: c=color, optional status string
      const colorRaw = o.c ?? o.color;
      const color =
        colorRaw != null && !Number.isNaN(Number(colorRaw))
          ? Number(colorRaw) & 0xffffff
          : null;

      const status =
        typeof o.status === "string"
          ? o.status
          : typeof o.state === "string"
            ? o.state
            : undefined;

      const state = mapStatusToState(status, color);
      const packed = color != null ? color : STATE_COLORS[state];
      this.slots[slot] = { slot, state, color: packed };
      updated.push(this.slots[slot]!);
    }

    if (updated.length > 0) {
      const snapshot = this.slots.map((s) => ({ ...s }));
      for (const fn of this.lightingListeners) fn(snapshot);
    }
  }

  private sendJson(value: unknown): void {
    const line = JSON.stringify(value);
    // device→host must be newline-delimited
    const out = line.endsWith("\n") ? line : `${line}\n`;
    for (const fn of this.outboundListeners) fn(out);
  }

  private emitLog(msg: string): void {
    for (const fn of this.logListeners) fn(msg);
  }
}
