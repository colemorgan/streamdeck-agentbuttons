import { describe, expect, it, vi } from "vitest";
import { MicroEmulator } from "../src/emulator.js";
import { STATE_COLORS } from "../src/states.js";
import { agentKeyCode, agentFocusEvents } from "../src/keys.js";

describe("MicroEmulator", () => {
  it("replies to id requests with matching id", () => {
    const emu = new MicroEmulator();
    const outbound: string[] = [];
    emu.on("outbound", (line) => outbound.push(line));

    emu.handleRequestText(JSON.stringify({ id: 42, method: "sys.version" }));

    expect(outbound).toHaveLength(1);
    expect(outbound[0]!.endsWith("\n")).toBe(true);
    const msg = JSON.parse(outbound[0]!);
    expect(msg.id).toBe(42);
    expect(typeof msg.result).toBe("string");
  });

  it("always replies to unknown methods (no queue wedge)", () => {
    const emu = new MicroEmulator();
    const outbound: string[] = [];
    emu.on("outbound", (line) => outbound.push(line));

    emu.handleRequestText(JSON.stringify({ id: 7, method: "no.such.method" }));
    expect(outbound).toHaveLength(1);
    expect(JSON.parse(outbound[0]!).id).toBe(7);
  });

  it("emits lighting on v.oai.thstatus", () => {
    const emu = new MicroEmulator();
    const lighting = vi.fn();
    emu.on("lighting", lighting);

    emu.handleRequestText(
      JSON.stringify({
        id: 1,
        method: "v.oai.thstatus",
        params: {
          slots: [
            { i: 0, status: "working" },
            { i: 1, status: "idle" },
          ],
        },
      }),
    );

    expect(lighting).toHaveBeenCalled();
    const slots = lighting.mock.calls[0]![0];
    expect(slots[0].state).toBe("working");
    expect(slots[0].color).toBe(STATE_COLORS.working);
    expect(slots[1].state).toBe("idle");
  });

  it("feeds back-to-back host JSON without newlines", () => {
    const emu = new MicroEmulator();
    const outbound: string[] = [];
    emu.on("outbound", (line) => outbound.push(line));

    emu.feedHostText(
      '{"id":1,"method":"device.status"}{"id":2,"method":"sys.version"}',
    );
    expect(outbound).toHaveLength(2);
    expect(JSON.parse(outbound[0]!).id).toBe(1);
    expect(JSON.parse(outbound[1]!).id).toBe(2);
  });

  it("focusSlot emits AG press/release notifications", () => {
    const emu = new MicroEmulator();
    const outbound: string[] = [];
    emu.on("outbound", (line) => outbound.push(line));

    emu.focusSlot(2);
    expect(outbound).toHaveLength(2);
    const press = JSON.parse(outbound[0]!);
    const release = JSON.parse(outbound[1]!);
    expect(press.m).toBe("v.oai.hid");
    expect(press.p.k).toBe("AG02");
    expect(press.p.act).toBe(1);
    expect(release.p.act).toBe(0);
  });
});

describe("keys", () => {
  it("maps slots 0..5 to AG00..AG05", () => {
    expect(agentKeyCode(0)).toBe("AG00");
    expect(agentKeyCode(5)).toBe("AG05");
  });

  it("throws outside range", () => {
    expect(() => agentKeyCode(6)).toThrow();
  });

  it("agentFocusEvents produces press then release", () => {
    const events = agentFocusEvents(3);
    expect(events).toEqual([
      { m: "v.oai.hid", p: { k: "AG03", act: 1 } },
      { m: "v.oai.hid", p: { k: "AG03", act: 0 } },
    ]);
  });
});
