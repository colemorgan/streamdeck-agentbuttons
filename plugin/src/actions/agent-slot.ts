import {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";

import { CompanionIpcClient } from "../ipc-client.js";
import type { AgentState } from "../render/agent-state.js";
import { stateImageDataUrl } from "../render/state-image.js";

type AgentSlotSettings = {
  slot?: number;
};

type InstanceState = {
  slot: number;
  state: AgentState | "offline";
};

/**
 * One physical key mapped to a Codex Micro agent slot (0–5).
 */
@action({ UUID: "com.colemorgan.codex-agent-buttons.agent-slot" })
export class AgentSlotAction extends SingletonAction<AgentSlotSettings> {
  private ipc: CompanionIpcClient | null = null;
  private connected = false;
  /** context → instance */
  private instances = new Map<string, InstanceState>();

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
        }
      },
      onStatus: (slot, state) => {
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
    const slot = normalizeSlot(ev.payload.settings.slot);
    const inst: InstanceState = {
      slot,
      state: this.connected ? "off" : "offline",
    };
    this.instances.set(ev.action.id, inst);
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
    const slot = normalizeSlot(ev.payload.settings.slot);
    const ipc = this.ensureIpc();
    const ok = ipc.focus(slot);
    if (!ok) {
      await ev.action.showAlert();
    }
  }

  private async paint(contextId: string, inst: InstanceState): Promise<void> {
    const action = this.actions.find((a) => a.id === contextId);
    if (!action || !action.isKey()) return;
    const label = `A${inst.slot + 1}`;
    await action.setImage(stateImageDataUrl(inst.state, label));
    await action.setTitle("");
  }
}

function normalizeSlot(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 5) {
    return 0;
  }
  return raw;
}
