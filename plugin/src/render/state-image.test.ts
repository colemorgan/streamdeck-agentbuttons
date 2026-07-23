import { describe, expect, it } from "vitest";
import {
  facePrimaryLabel,
  faceStateWord,
  normalizeCustomLabel,
  stateImageDataUrl,
} from "./state-image.js";

describe("normalizeCustomLabel", () => {
  it("trims and drops empty", () => {
    expect(normalizeCustomLabel("  ")).toBeUndefined();
    expect(normalizeCustomLabel(null)).toBeUndefined();
    expect(normalizeCustomLabel("Ship")).toBe("Ship");
  });

  it("caps long labels", () => {
    const long = "ABCDEFGHIJKLMNOP";
    const n = normalizeCustomLabel(long)!;
    expect(n.length).toBeLessThanOrEqual(10);
    expect(n.endsWith("…")).toBe(true);
  });
});

describe("facePrimaryLabel", () => {
  it("uses A1–A6 by default", () => {
    expect(facePrimaryLabel(0)).toBe("A1");
    expect(facePrimaryLabel(5)).toBe("A6");
  });

  it("prefers custom label", () => {
    expect(facePrimaryLabel(2, "Ship")).toBe("Ship");
  });
});

describe("stateImageDataUrl", () => {
  it("produces distinct images for idle vs off vs offline", () => {
    const idle = stateImageDataUrl({ state: "idle", slot: 0 });
    const off = stateImageDataUrl({ state: "off", slot: 0 });
    const offline = stateImageDataUrl({ state: "offline", slot: 0 });
    expect(idle).toContain("data:image/svg+xml");
    expect(idle).not.toEqual(off);
    expect(off).not.toEqual(offline);
    const idleSvg = decodeURIComponent(idle);
    expect(idleSvg).toMatch(/f2f2f2|ffffff/i);
    expect(idleSvg).toContain("A1");
    expect(idleSvg).toContain("Idle");
  });

  it("uses working blue and Busy word", () => {
    const working = stateImageDataUrl({ state: "working", slot: 1 });
    const svg = decodeURIComponent(working);
    expect(svg).toContain("#304ffe");
    expect(svg).toContain("A2");
    expect(svg).toContain("Busy");
  });

  it("shows custom label instead of A-slot", () => {
    const face = stateImageDataUrl({
      state: "idle",
      slot: 2,
      customLabel: "Ship",
    });
    const svg = decodeURIComponent(face);
    expect(svg).toContain("Ship");
    expect(svg).not.toContain(">A3<");
  });

  it("supports legacy (state, label) call shape", () => {
    const legacy = stateImageDataUrl("complete", "A4");
    const svg = decodeURIComponent(legacy);
    expect(svg).toContain("A4");
    expect(svg).toContain("Done");
  });
});

describe("faceStateWord", () => {
  it("maps states to short words", () => {
    expect(faceStateWord("working")).toBe("Busy");
    expect(faceStateWord("offline")).toBe("—");
  });
});
