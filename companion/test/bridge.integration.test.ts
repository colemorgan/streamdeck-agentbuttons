import { describe, expect, it } from "vitest";
import { Bridge } from "../src/bridge.js";
import { LoopbackHost } from "../src/transports/loopback.js";
import { STATE_COLORS } from "@agentbuttons/protocol";

describe("Bridge + loopback host", () => {
  it("handshake replies to device.status", () => {
    const bridge = new Bridge();
    const host = new LoopbackHost(bridge.emulator);
    host.send({ id: 1, method: "device.status" });
    const replies = host.drainReplies();
    expect(replies).toHaveLength(1);
    expect((replies[0] as { id: number }).id).toBe(1);
  });

  it("thstatus updates slot table", () => {
    const bridge = new Bridge();
    const host = new LoopbackHost(bridge.emulator);
    let seen = false;
    bridge.on("slots", (slots) => {
      if (slots[0]?.state === "working") seen = true;
    });
    host.send({
      id: 2,
      method: "v.oai.thstatus",
      params: { slots: [{ i: 0, status: "working" }] },
    });
    expect(seen).toBe(true);
    expect(bridge.getSlots()[0]?.color).toBe(STATE_COLORS.working);
  });

  it("focus emits AG press/release on outbound", () => {
    const bridge = new Bridge();
    const host = new LoopbackHost(bridge.emulator);
    bridge.focusSlot(4);
    const replies = host.drainReplies();
    expect(replies).toHaveLength(2);
    expect(replies[0]).toMatchObject({
      m: "v.oai.hid",
      p: { k: "AG04", act: 1 },
    });
    expect(replies[1]).toMatchObject({
      m: "v.oai.hid",
      p: { k: "AG04", act: 0 },
    });
  });

  it("duplicate identical status does not thrash listeners", () => {
    const bridge = new Bridge();
    let count = 0;
    bridge.on("slots", () => {
      count++;
    });
    bridge.injectSlot(0, "idle");
    bridge.injectSlot(0, "idle");
    expect(count).toBe(1);
  });
});
