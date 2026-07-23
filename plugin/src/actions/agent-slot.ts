import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  type SendToPluginEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";

import { CompanionIpcClient } from "../ipc-client.js";
import type { AgentState } from "../render/agent-state.js";
import { stateImageDataUrl } from "../render/state-image.js";

export type AgentSlotSettings = {
  slot?: number | string;
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
  private instances = new Map<string, InstanceState>();
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
    const slot = normalizeSlot(ev.payload.settings?.slot);
    streamDeck.logger.info(
      `willAppear ctx=${ev.action.id} settings.slot=${JSON.stringify(ev.payload.settings)} → ${slot}`,
    );
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
    );
    // Ensure settings always contain a numeric slot
    await ev.action.setSettings({ slot });
    await this.paint(ev.action.id, inst);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    const slot = normalizeSlot(ev.payload.settings?.slot);
    streamDeck.logger.info(
      `didReceiveSettings ctx=${ev.action.id} slot=${slot} raw=${JSON.stringify(ev.payload.settings)}`,
    );
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
    );
    await this.paint(ev.action.id, inst);
    // Confirm back to PI
    if (ev.action.isKey()) {
      await ev.action.sendToPropertyInspector({
        message: `Plugin bound Slot ${slot + 1}`,
        settings: { slot },
      });
    }
  }

  /**
   * PI also sends sendToPlugin so slot changes work even if setSettings fails.
   */
  override async onSendToPlugin(
    ev: SendToPluginEvent<
      { event?: string; slot?: number | string },
      AgentSlotSettings
    >,
  ): Promise<void> {
    this.ensureIpc();
    const payload = ev.payload;
    if (!payload || payload.event !== "setSlot") return;

    const slot = normalizeSlot(payload.slot);
    streamDeck.logger.info(
      `sendToPlugin setSlot ctx=${ev.action.id} slot=${slot}`,
    );

    await ev.action.setSettings({ slot });
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
    );
    await this.paint(ev.action.id, inst);
    if (ev.action.isKey()) {
      await ev.action.sendToPropertyInspector({
        message: `Plugin bound Slot ${slot + 1}`,
        settings: { slot },
      });
    }
  }

  override onWillDisappear(
    ev: WillDisappearEvent<AgentSlotSettings>,
  ): void {
    this.instances.delete(ev.action.id);
  }

  override async onKeyDown(
    ev: KeyDownEvent<AgentSlotSettings>,
  ): Promise<void> {
    const fromMap = this.instances.get(ev.action.id)?.slot;
    const slot =
      fromMap !== undefined
        ? fromMap
        : normalizeSlot(ev.payload.settings?.slot);
    streamDeck.logger.info(`keyDown ctx=${ev.action.id} focus slot=${slot}`);
    const ipc = this.ensureIpc();
    const ok = ipc.focus(slot);
    if (!ok) {
      await ev.action.showAlert();
    }
  }

  private async paint(contextId: string, inst: InstanceState): Promise<void> {
    // Prefer lookup by id; also try iterating all visible actions of this type
    let keyAction = this.actions.find((a) => a.id === contextId);
    if (!keyAction) {
      for (const a of this.actions) {
        if (a.id === contextId) {
          keyAction = a;
          break;
        }
      }
    }
    if (!keyAction || !keyAction.isKey()) {
      streamDeck.logger.warn(`paint: no key action for ${contextId}`);
      return;
    }

    const label = `A${inst.slot + 1}`;
    // Bake slot into image (UserTitleEnabled is false in manifest)
    await keyAction.setImage(stateImageDataUrl(inst.state, label));
    // Also try title in case user enabled titles
    await keyAction.setTitle(`${label}\n${inst.state}`);
    streamDeck.logger.info(
      `paint ctx=${contextId} ${label} state=${inst.state}`,
    );
  }
}
