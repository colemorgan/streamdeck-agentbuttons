import {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";

import { CompanionIpcClient } from "../ipc-client.js";
import type { AgentState } from "../render/agent-state.js";
import { stateImageDataUrl } from "../render/state-image.js";

export type AgentSlotSettings = {
  slot?: number;
};

export type InstanceState = {
  slot: number;
  state: AgentState | "offline";
};

/**
 * Normalize PI/settings slot to 0..5 (defaults to 0).
 * Coerces string numbers from property inspector JSON ("2" → 2).
 */
export function normalizeSlot(raw: number | string | undefined | null): number {
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= 5) return n;
    return 0;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 5) {
    return 0;
  }
  return raw;
}

/**
 * Update (or create) the instance for a key when it appears or PI settings change.
 * Rebinds which Micro agent slot this key follows and picks state from lastStatus.
 */
export function applySlotSettings(
  instances: Map<string, InstanceState>,
  contextId: string,
  rawSlot: number | string | undefined | null,
  connected: boolean,
  lastStatusBySlot: ReadonlyMap<number, AgentState>,
): InstanceState {
  const slot = normalizeSlot(rawSlot);
  const known = lastStatusBySlot.get(slot);
  const state: AgentState | "offline" = !connected
    ? "offline"
    : (known ?? "off");
  const inst: InstanceState = { slot, state };
  instances.set(contextId, inst);
  return inst;
}

/**
 * One physical key mapped to a Codex Micro agent slot (0–5).
 */
@action({ UUID: "com.colemorgan.codex-agent-buttons.agent-slot" })
export class AgentSlotAction extends SingletonAction<AgentSlotSettings> {
  private ipc: CompanionIpcClient | null = null;
  private connected = false;
  /** context → instance */
  private instances = new Map<string, InstanceState>();
  /** Latest status per Micro slot (0–5), from companion IPC */
  private lastStatusBySlot = new Map<number, AgentState>();

  private ensureIpc(): CompanionIpcClient {
    if (this.ipc) return this.ipc;
    this.ipc = new CompanionIpcClient({
      onConnection: (ok) => {
        this.connected = ok;
        if (!ok) {
          for (const [ctx, inst] of this.instances) {
            inst.state = "offline";
            void this.paint(ctx, inst);
          }
        } else {
          // Re-apply last known statuses when companion comes back
          for (const [ctx, inst] of this.instances) {
            const known = this.lastStatusBySlot.get(inst.slot);
            inst.state = known ?? "off";
            void this.paint(ctx, inst);
          }
        }
      },
      onStatus: (slot, state) => {
        this.lastStatusBySlot.set(slot, state);
        for (const [ctx, inst] of this.instances) {
          if (inst.slot === slot) {
            inst.state = this.connected ? state : "offline";
            void this.paint(ctx, inst);
          }
        }
      },
    });
    this.ipc.start();
    return this.ipc;
  }

  override async onWillAppear(
    ev: WillAppearEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      ev.payload.settings.slot,
      this.connected,
      this.lastStatusBySlot,
    );
    await this.paint(ev.action.id, inst);
  }

  /**
   * Property inspector changed settings (e.g. slot select).
   * Must rebind instances.Map — otherwise keys keep the willAppear-time slot.
   */
  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      ev.payload.settings.slot,
      this.connected,
      this.lastStatusBySlot,
    );
    await this.paint(ev.action.id, inst);
  }

  override onWillDisappear(
    ev: WillDisappearEvent<AgentSlotSettings>,
  ): void {
    this.instances.delete(ev.action.id);
  }

  override async onKeyDown(
    ev: KeyDownEvent<AgentSlotSettings>,
  ): Promise<void> {
    // Prefer live instance map (stays in sync after PI changes); fall back to event settings
    const fromMap = this.instances.get(ev.action.id)?.slot;
    const slot =
      fromMap !== undefined
        ? fromMap
        : normalizeSlot(ev.payload.settings.slot);
    const ipc = this.ensureIpc();
    const ok = ipc.focus(slot);
    if (!ok) {
      await ev.action.showAlert();
    }
  }

  private async paint(contextId: string, inst: InstanceState): Promise<void> {
    const action = this.actions.find((a) => a.id === contextId);
    if (!action || !action.isKey()) return;
    // Show slot number so PI changes are visually obvious
    const label = `A${inst.slot + 1}`;
    const title =
      inst.state === "offline" ? `${label}\noffline` : `${label}\n${inst.state}`;
    await action.setImage(stateImageDataUrl(inst.state, label));
    await action.setTitle(title);
  }
}
