/** Codex Micro keycodes for v.oai.hid notifications. */

export type KeyAct = 0 | 1 | 2; // release | press | encoder tick

export function agentKeyCode(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot > 5) {
    throw new RangeError(`agent slot must be 0..5, got ${slot}`);
  }
  return `AG${String(slot).padStart(2, "0")}`;
}

/** Build press then release notifications for an agent key. */
export function agentFocusEvents(slot: number): Array<{
  m: "v.oai.hid";
  p: { k: string; act: KeyAct };
}> {
  const k = agentKeyCode(slot);
  return [
    { m: "v.oai.hid", p: { k, act: 1 } },
    { m: "v.oai.hid", p: { k, act: 0 } },
  ];
}

export const ACTION_KEYS = {
  /** Approximate Micro action map; MVP only needs agent keys. */
  ACT06: "ACT06",
  ACT07: "ACT07",
  ACT08: "ACT08",
  ACT09: "ACT09",
  ACT10: "ACT10", // PTT
  ACT11: "ACT11",
  ACT12: "ACT12", // submit
} as const;

export const ENCODER = {
  CW: "ENC_CW",
  CC: "ENC_CC",
  CLK: "ENC_CLK",
} as const;
