import {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";

type AgentSlotSettings = {
  slot?: number;
};

/**
 * One physical key mapped to a Codex Micro agent slot (0–5).
 * Live status + IPC focus land in U4.
 */
@action({ UUID: "com.colemorgan.codex-agent-buttons.agent-slot" })
export class AgentSlotAction extends SingletonAction<AgentSlotSettings> {
  override async onWillAppear(
    ev: WillAppearEvent<AgentSlotSettings>,
  ): Promise<void> {
    const slot = normalizeSlot(ev.payload.settings.slot);
    await ev.action.setTitle(`A${slot + 1}`);
  }

  override async onKeyDown(
    ev: KeyDownEvent<AgentSlotSettings>,
  ): Promise<void> {
    const slot = normalizeSlot(ev.payload.settings.slot);
    // U4: send focus via companion IPC
    await ev.action.showAlert();
    void slot;
  }
}

function normalizeSlot(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 5) {
    return 0;
  }
  return raw;
}
