import {
  MicroEmulator,
  type SlotStatus,
  type AgentState,
} from "@agentbuttons/protocol";

export type BridgeHealth = {
  companion: "up";
  chatgpt: "connected" | "waiting" | "error" | "unknown";
};

export type BridgeEvents = {
  slots: (slots: readonly SlotStatus[]) => void;
  health: (h: BridgeHealth) => void;
  log: (msg: string) => void;
};

/**
 * Companion bridge core: Micro emulator + slot fan-out.
 * Transports (ChatGPT link, IPC) attach externally.
 */
export class Bridge {
  readonly emulator = new MicroEmulator();
  private health: BridgeHealth = {
    companion: "up",
    chatgpt: "waiting",
  };
  private slotListeners: Array<BridgeEvents["slots"]> = [];
  private healthListeners: Array<BridgeEvents["health"]> = [];
  private logListeners: Array<BridgeEvents["log"]> = [];
  private lastSerialized = "";

  constructor() {
    this.emulator.on("lighting", (slots) => {
      this.setChatgpt("connected");
      this.emitSlots(slots);
    });
    this.emulator.on("log", (msg) => {
      for (const fn of this.logListeners) fn(msg);
    });
  }

  on<K extends keyof BridgeEvents>(event: K, fn: BridgeEvents[K]): void {
    if (event === "slots") this.slotListeners.push(fn as BridgeEvents["slots"]);
    else if (event === "health")
      this.healthListeners.push(fn as BridgeEvents["health"]);
    else if (event === "log") this.logListeners.push(fn as BridgeEvents["log"]);
  }

  getSlots(): readonly SlotStatus[] {
    return this.emulator.getSlots();
  }

  getHealth(): BridgeHealth {
    return this.health;
  }

  /** Feed host (ChatGPT) text into the Micro emulator. */
  feedHostText(chunk: string): void {
    this.emulator.feedHostText(chunk);
  }

  focusSlot(slot: number): void {
    this.emulator.focusSlot(slot);
  }

  setChatgpt(state: BridgeHealth["chatgpt"]): void {
    if (this.health.chatgpt === state) return;
    this.health = { ...this.health, chatgpt: state };
    for (const fn of this.healthListeners) fn(this.health);
  }

  /** Test helper: inject slot states without full thstatus RPC. */
  injectSlot(slot: number, state: AgentState, color?: number): void {
    this.emulator.handleRequestText(
      JSON.stringify({
        id: 900 + slot,
        method: "v.oai.thstatus",
        params: {
          slots: [{ i: slot, status: state, color }],
        },
      }),
    );
  }

  private emitSlots(slots: SlotStatus[]): void {
    const key = JSON.stringify(slots.map((s) => [s.slot, s.state, s.color]));
    if (key === this.lastSerialized) return;
    this.lastSerialized = key;
    for (const fn of this.slotListeners) fn(slots);
  }
}
