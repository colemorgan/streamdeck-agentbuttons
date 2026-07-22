import type { AgentState } from "./agent-state.js";

export type RenderState = AgentState | "offline";

const COLORS: Record<RenderState, string> = {
  off: "#2a2a2a",
  idle: "#ffffff",
  working: "#304ffe",
  complete: "#00ff4c",
  awaiting: "#ff6d00",
  error: "#ff0033",
  offline: "#555555",
};

/**
 * Build an SVG data-URL for a Stream Deck key face.
 */
export function stateImageDataUrl(
  state: RenderState,
  label: string,
): string {
  const fill = COLORS[state] ?? COLORS.offline;
  const textColor =
    state === "idle" || state === "complete" ? "#111111" : "#ffffff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" rx="16" fill="${fill}"/>
  <text x="72" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="${textColor}">${escapeXml(label)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
