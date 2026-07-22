import { describe, expect, it, vi } from "vitest";
import { MicroEmulator } from "../src/emulator.js";
import { STATE_COLORS, type AgentState } from "../src/states.js";
import { agentKeyCode } from "../src/keys.js";

const SIX: AgentState[] = [
  "off",
  "idle",
  "working",
  "complete",
  "awaiting",
  "error",
];

describe("MicroEmulator thstatus → six states", () => {
  it("applies all six Micro-compatible states across slots 0–5", () => {
    const emu = new MicroEmulator();
    const lighting = vi.fn();
    emu.on("lighting", lighting);

    emu.handleRequestText(
      JSON.stringify({
        id: 1,
        method: "v.oai.thstatus",
        params: {
          slots: SIX.map((status, i) => ({ i, status })),
        },
      }),
    );

    expect(lighting).toHaveBeenCalled();
    const slots = emu.getSlots();
    for (let i = 0; i < 6; i++) {
      expect(slots[i]!.state).toBe(SIX[i]);
      expect(slots[i]!.color).toBe(STATE_COLORS[SIX[i]!]);
    }
    // off ≠ idle
    expect(slots[0]!.state).toBe("off");
    expect(slots[1]!.state).toBe("idle");
    expect(slots[0]!.color).not.toBe(slots[1]!.color);
  });

  it("accepts color-only slot updates", () => {
    const emu = new MicroEmulator();
    emu.handleRequestText(
      JSON.stringify({
        id: 2,
        method: "v.oai.thstatus",
        params: {
          slots: [{ i: 3, color: STATE_COLORS.awaiting }],
        },
      }),
    );
    expect(emu.getSlots()[3]!.state).toBe("awaiting");
  });

  it("parses real ChatGPT minimized array params [{id,c,b,e,s}]", () => {
    const emu = new MicroEmulator();
    const lighting = vi.fn();
    emu.on("lighting", lighting);

    // Shape from RPCApiOAI.sendThreadsLighting after W() mapping
    emu.handleRequestText(
      JSON.stringify({
        id: 99,
        method: "v.oai.thstatus",
        params: [
          { id: 0, c: 0, b: 0, e: 0, s: 0 }, // off
          { id: 1, c: 0xffffff, b: 1, e: 1, s: 0 }, // idle
          { id: 2, c: 0x304ffe, b: 1, e: 1, s: 0 }, // working
          { id: 3, c: 0x00ff4c, b: 1, e: 1, s: 0 }, // unread/complete
          { id: 4, c: 0xff6d00, b: 1, e: 1, s: 0 }, // awaiting
          { id: 5, c: 0xff0033, b: 1, e: 1, s: 0 }, // error
        ],
      }),
    );

    expect(lighting).toHaveBeenCalled();
    const slots = emu.getSlots();
    expect(slots[0]!.state).toBe("off");
    expect(slots[1]!.state).toBe("idle");
    expect(slots[2]!.state).toBe("working");
    expect(slots[3]!.state).toBe("complete");
    expect(slots[4]!.state).toBe("awaiting");
    expect(slots[5]!.state).toBe("error");
  });
});

describe("MicroEmulator focus AG00–AG05", () => {
  it("emits press then release for every agent slot", () => {
    for (let slot = 0; slot < 6; slot++) {
      const emu = new MicroEmulator();
      const outbound: string[] = [];
      emu.on("outbound", (line) => outbound.push(line));
      emu.focusSlot(slot);
      expect(outbound).toHaveLength(2);
      const press = JSON.parse(outbound[0]!);
      const release = JSON.parse(outbound[1]!);
      expect(press.m).toBe("v.oai.hid");
      expect(press.p).toEqual({ k: agentKeyCode(slot), act: 1 });
      expect(release.p).toEqual({ k: agentKeyCode(slot), act: 0 });
      expect(outbound[0]!.endsWith("\n")).toBe(true);
    }
  });
});
