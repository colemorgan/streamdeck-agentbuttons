import { describe, expect, it } from "vitest";
import {
  applySlotSettings,
  normalizeSlot,
  type InstanceState,
} from "./agent-slot.js";
import type { AgentState } from "../render/agent-state.js";
import {
  facePrimaryLabel,
  normalizeCustomLabel,
  stateImageDataUrl,
} from "../render/state-image.js";

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

    const first = applySlotSettings(instances, ctx, 0, true, lastStatus);
    expect(first.slot).toBe(0);
    expect(first.state).toBe("idle");
    expect(instances.get(ctx)?.slot).toBe(0);

    const second = applySlotSettings(instances, ctx, 3, true, lastStatus);
    expect(second.slot).toBe(3);
    expect(second.state).toBe("working");
    expect(instances.get(ctx)?.slot).toBe(3);
    expect(instances.get(ctx)?.state).toBe("working");

    const face = stateImageDataUrl({
      state: second.state,
      slot: second.slot,
    });
    expect(decodeURIComponent(face)).toContain("A4");
    expect(decodeURIComponent(face)).toContain("#304ffe");
    expect(decodeURIComponent(face)).not.toContain(">A1<");
  });

  it("stores customLabel on instance", () => {
    const instances = new Map<string, InstanceState>();
    const lastStatus = new Map<number, AgentState>();
    const inst = applySlotSettings(
      instances,
      "c",
      1,
      true,
      lastStatus,
      "  Ship  ",
    );
    expect(inst.slot).toBe(1);
    expect(inst.customLabel).toBe("Ship");
    expect(facePrimaryLabel(inst.slot, inst.customLabel)).toBe("Ship");
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

  it("coerces string slot values from PI JSON", () => {
    expect(normalizeSlot("0")).toBe(0);
    expect(normalizeSlot("2")).toBe(2);
    expect(normalizeSlot("5")).toBe(5);
    expect(normalizeSlot("nope")).toBe(0);

    const instances = new Map<string, InstanceState>();
    const lastStatus = new Map<number, AgentState>([[2, "working"]]);
    const inst = applySlotSettings(instances, "ctx", "2", true, lastStatus);
    expect(inst.slot).toBe(2);
    expect(inst.state).toBe("working");
  });

  it("clears empty custom labels", () => {
    expect(normalizeCustomLabel("   ")).toBeUndefined();
  });
});
