import { describe, expect, it } from "vitest";
import {
  mapStatusToState,
  STATE_COLORS,
  colorToHex,
  type AgentState,
} from "../src/states.js";

const ALL_STATES: AgentState[] = [
  "off",
  "idle",
  "working",
  "complete",
  "awaiting",
  "error",
];

describe("mapStatusToState", () => {
  it("maps every user-facing status string to a distinct state", () => {
    const cases: Array<[string, AgentState]> = [
      ["off", "off"],
      ["unassigned", "off"],
      ["none", "off"],
      ["idle", "idle"],
      ["working", "working"],
      ["thinking", "working"],
      ["running", "working"],
      ["unread", "complete"],
      ["complete", "complete"],
      ["done", "complete"],
      ["awaiting-input", "awaiting"],
      ["needs_input", "awaiting"],
      ["needs-input", "awaiting"],
      ["error", "error"],
      ["failed", "error"],
    ];
    for (const [status, expected] of cases) {
      expect(mapStatusToState(status), status).toBe(expected);
    }
  });

  it("maps packed RGB from STATE_COLORS to the matching state", () => {
    for (const state of ALL_STATES) {
      expect(mapStatusToState(null, STATE_COLORS[state])).toBe(state);
    }
  });

  it("keeps off and idle as different colors and states", () => {
    expect(STATE_COLORS.off).not.toBe(STATE_COLORS.idle);
    expect(mapStatusToState("off")).toBe("off");
    expect(mapStatusToState("idle")).toBe("idle");
    expect(mapStatusToState(null, STATE_COLORS.off)).toBe("off");
    expect(mapStatusToState(null, STATE_COLORS.idle)).toBe("idle");
  });

  it("returns off when status and color are missing", () => {
    expect(mapStatusToState()).toBe("off");
    expect(mapStatusToState(null, null)).toBe("off");
  });

  it("colorToHex formats packed RGB", () => {
    expect(colorToHex(STATE_COLORS.working)).toBe("#304ffe");
  });
});
