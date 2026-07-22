import { describe, expect, it } from "vitest";
import {
  applySlotSettings,
  normalizeSlot,
  type InstanceState,
} from "./agent-slot.js";
import type { AgentState } from "../render/agent-state.js";
import { stateImageDataUrl } from "../render/state-image.js";

/**
 * Simulates the shipped onWillAppear → onDidReceiveSettings path:
 * instances map must track PI slot changes so status paint follows the new slot.
 */
describe("applySlotSettings (PI / onDidReceiveSettings path)", () => {
  it("rebinds context from slot 0 to slot 3 and uses that slot's last status", () => {
    const instances = new Map<string, InstanceState>();
    const lastStatus = new Map<number, AgentState>([
      [0, "idle"],
      [3, "working"],
    ]);
    const ctx = "key-context-1";

    // willAppear with default / slot 0
    const first = applySlotSettings(instances, ctx, 0, true, lastStatus);
    expect(first.slot).toBe(0);
    expect(first.state).toBe("idle");
    expect(instances.get(ctx)?.slot).toBe(0);

    // PI setSettings → onDidReceiveSettings with slot 3
    const second = applySlotSettings(instances, ctx, 3, true, lastStatus);
    expect(second.slot).toBe(3);
    expect(second.state).toBe("working");
    expect(instances.get(ctx)?.slot).toBe(3);
    expect(instances.get(ctx)?.state).toBe("working");

    // Face for new slot label must reflect A4 and working color (not A1/idle)
    const face = stateImageDataUrl(second.state, `A${second.slot + 1}`);
    expect(decodeURIComponent(face)).toContain("A4");
    expect(decodeURIComponent(face)).toContain("#304ffe");
    expect(decodeURIComponent(face)).not.toContain(">A1<");
  });

  it("shows offline when companion is down even after slot change", () => {
    const instances = new Map<string, InstanceState>();
    const lastStatus = new Map<number, AgentState>([[2, "complete"]]);
    const inst = applySlotSettings(instances, "c2", 2, false, lastStatus);
    expect(inst.slot).toBe(2);
    expect(inst.state).toBe("offline");
  });

  it("defaults unknown slot settings to 0 via normalizeSlot", () => {
    expect(normalizeSlot(undefined)).toBe(0);
    expect(normalizeSlot(99)).toBe(0);
    expect(normalizeSlot(5)).toBe(5);
  });
});
