import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  type PropertyInspectorDidAppearEvent,
  type SendToPluginEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";

import { CompanionIpcClient } from "../ipc-client.js";
import type { AgentState } from "../render/agent-state.js";
import {
  facePrimaryLabel,
  normalizeCustomLabel,
  stateImageDataUrl,
} from "../render/state-image.js";

export type AgentSlotSettings = {
  slot?: number | string;
  customLabel?: string;
};

export type InstanceState = {
  slot: number;
  customLabel?: string;
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
  rawCustomLabel?: string | null,
): InstanceState {
  const slot = normalizeSlot(rawSlot);
  const customLabel = normalizeCustomLabel(rawCustomLabel);
  const known = lastStatusBySlot.get(slot);
  const state: AgentState | "offline" = !connected
    ? "offline"
    : (known ?? "off");
  const inst: InstanceState = { slot, customLabel, state };
  instances.set(contextId, inst);
  return inst;
}

export type HealthSnapshot = {
  companion: string;
  chatgpt: string;
};

/**
 * One physical key mapped to a Codex Micro agent slot (0–5).
 */
@action({ UUID: "com.colemorgan.codex-agent-buttons.agent-slot" })
export class AgentSlotAction extends SingletonAction<AgentSlotSettings> {
  private ipc: CompanionIpcClient | null = null;
  private connected = false;
  private instances = new Map<string, InstanceState>();
  private lastStatusBySlot = new Map<number, AgentState>();
  private health: HealthSnapshot = {
    companion: "down",
    chatgpt: "unknown",
  };

  private ensureIpc(): CompanionIpcClient {
    if (this.ipc) return this.ipc;
    this.ipc = new CompanionIpcClient({
      onLog: (msg) => streamDeck.logger.debug(msg),
      onConnection: (ok) => {
        this.connected = ok;
        streamDeck.logger.info(`ipc connection=${ok}`);
        if (!ok) {
          this.health = { companion: "down", chatgpt: "unknown" };
          for (const [ctx, inst] of this.instances) {
            inst.state = "offline";
            void this.paint(ctx, inst);
          }
        } else {
          this.health = {
            companion: "up",
            chatgpt: this.health.chatgpt === "unknown" ? "waiting" : this.health.chatgpt,
          };
          for (const [ctx, inst] of this.instances) {
            const known = this.lastStatusBySlot.get(inst.slot);
            inst.state = known ?? "off";
            void this.paint(ctx, inst);
          }
        }
        void this.pushHealthToPi();
      },
      onHealth: (chatgpt, companion) => {
        this.health = {
          companion: companion || (this.connected ? "up" : "down"),
          chatgpt: chatgpt || "unknown",
        };
        if (companion === "up" || chatgpt) {
          this.connected = true;
        }
        streamDeck.logger.debug(
          `ipc health companion=${this.health.companion} chatgpt=${this.health.chatgpt}`,
        );
        void this.pushHealthToPi();
      },
      onStatus: (slot, state) => {
        this.lastStatusBySlot.set(slot, state);
        streamDeck.logger.debug(`ipc status slot=${slot} state=${state}`);
        for (const [ctx, inst] of this.instances) {
          if (inst.slot === slot) {
            this.connected = true;
            inst.state = state;
            void this.paint(ctx, inst);
          }
        }
      },
    });
    this.ipc.start();
    return this.ipc;
  }

  private async pushHealthToPi(): Promise<void> {
    try {
      await streamDeck.ui.sendToPropertyInspector({
        event: "health",
        companion: this.health.companion,
        chatgpt: this.health.chatgpt,
        connected: this.connected,
      });
    } catch {
      /* PI may not be open */
    }
  }

  override async onPropertyInspectorDidAppear(
    _ev: PropertyInspectorDidAppearEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    await this.pushHealthToPi();
  }

  override async onWillAppear(
    ev: WillAppearEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    const slot = normalizeSlot(ev.payload.settings?.slot);
    const customLabel = normalizeCustomLabel(ev.payload.settings?.customLabel);
    streamDeck.logger.debug(
      `willAppear ctx=${ev.action.id} slot=${slot} label=${customLabel ?? ""}`,
    );
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
      customLabel,
    );
    const settings: AgentSlotSettings = { slot };
    if (customLabel) settings.customLabel = customLabel;
    await ev.action.setSettings(settings);
    await this.paint(ev.action.id, inst);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<AgentSlotSettings>,
  ): Promise<void> {
    this.ensureIpc();
    const slot = normalizeSlot(ev.payload.settings?.slot);
    const customLabel = normalizeCustomLabel(ev.payload.settings?.customLabel);
    streamDeck.logger.debug(
      `didReceiveSettings ctx=${ev.action.id} slot=${slot} label=${customLabel ?? ""}`,
    );
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
      customLabel,
    );
    await this.paint(ev.action.id, inst);
  }

  /**
   * PI sends sendToPlugin for setSlot / setLabel / requestHealth.
   */
  override async onSendToPlugin(
    ev: SendToPluginEvent<
      {
        event?: string;
        slot?: number | string;
        customLabel?: string;
      },
      AgentSlotSettings
    >,
  ): Promise<void> {
    this.ensureIpc();
    const payload = ev.payload;
    if (!payload || typeof payload !== "object") return;

    if (payload.event === "requestHealth") {
      await this.pushHealthToPi();
      return;
    }

    if (payload.event !== "setSlot" && payload.event !== "setSettings") return;

    const slot = normalizeSlot(payload.slot);
    const customLabel = normalizeCustomLabel(payload.customLabel);
    streamDeck.logger.debug(
      `sendToPlugin ${payload.event} ctx=${ev.action.id} slot=${slot}`,
    );

    const settings: AgentSlotSettings = { slot };
    if (customLabel) settings.customLabel = customLabel;
    await ev.action.setSettings(settings);
    const inst = applySlotSettings(
      this.instances,
      ev.action.id,
      slot,
      this.connected,
      this.lastStatusBySlot,
      customLabel,
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
    const fromMap = this.instances.get(ev.action.id)?.slot;
    const slot =
      fromMap !== undefined
        ? fromMap
        : normalizeSlot(ev.payload.settings?.slot);
    streamDeck.logger.info(`keyDown focus slot=${slot}`);
    const ipc = this.ensureIpc();
    const ok = ipc.focus(slot);
    if (!ok) {
      await ev.action.showAlert();
    }
  }

  private async paint(contextId: string, inst: InstanceState): Promise<void> {
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

    await keyAction.setImage(
      stateImageDataUrl({
        state: inst.state,
        slot: inst.slot,
        customLabel: inst.customLabel,
      }),
    );
    // Image owns the face — clear Stream Deck title to avoid double text
    await keyAction.setTitle("");
    streamDeck.logger.debug(
      `paint ctx=${contextId} ${facePrimaryLabel(inst.slot, inst.customLabel)} state=${inst.state}`,
    );
  }
}
