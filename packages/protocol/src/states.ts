/** Agent slot visual states shown on Stream Deck keys. */

export type AgentState =
  | "off"
  | "idle"
  | "working"
  | "complete"
  | "awaiting"
  | "error";

/** Packed RGB values used by ChatGPT / Micro status mapping. */
export const STATE_COLORS: Record<AgentState, number> = {
  off: 0x000000,
  idle: 0xffffff,
  working: 0x304ffe,
  complete: 0x00ff4c,
  awaiting: 0xff6d00,
  error: 0xff0033,
};

export function colorToHex(packed: number): string {
  return `#${(packed & 0xffffff).toString(16).padStart(6, "0")}`;
}

/**
 * Map app-reported status string or packed RGB into our AgentState enum.
 */
export function mapStatusToState(
  status?: string | null,
  packedRgb?: number | null,
): AgentState {
  if (status) {
    const s = status.toLowerCase();
    if (s === "off" || s === "unassigned" || s === "none") return "off";
    if (s === "idle") return "idle";
    if (s === "working" || s === "thinking" || s === "running") return "working";
    if (s === "unread" || s === "complete" || s === "done" || s === "finished")
      return "complete";
    if (s.startsWith("awaiting") || s === "needs_input" || s === "needs-input")
      return "awaiting";
    if (s === "error" || s === "failed" || s === "failure") return "error";
  }

  if (packedRgb != null) {
    const c = packedRgb & 0xffffff;
    for (const [state, color] of Object.entries(STATE_COLORS) as [
      AgentState,
      number,
    ][]) {
      if (color === c) return state;
    }
    // Nearest known color by channel distance
    let best: AgentState = "idle";
    let bestDist = Infinity;
    for (const [state, color] of Object.entries(STATE_COLORS) as [
      AgentState,
      number,
    ][]) {
      if (state === "off") continue;
      const dist = colorDistance(c, color);
      if (dist < bestDist) {
        bestDist = dist;
        best = state;
      }
    }
    return best;
  }

  return "off";
}

function colorDistance(a: number, b: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;
}
