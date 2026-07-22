import { describe, expect, it } from "vitest";
import { stateImageDataUrl } from "./state-image.js";

describe("stateImageDataUrl", () => {
  it("produces distinct images for idle vs off vs offline", () => {
    const idle = stateImageDataUrl("idle", "A1");
    const off = stateImageDataUrl("off", "A1");
    const offline = stateImageDataUrl("offline", "A1");
    expect(idle).toContain("data:image/svg+xml");
    expect(idle).not.toEqual(off);
    expect(off).not.toEqual(offline);
    expect(idle).toContain("ffffff");
  });

  it("uses working blue for thinking state", () => {
    const working = stateImageDataUrl("working", "A2");
    expect(decodeURIComponent(working)).toContain("#304ffe");
  });
});
