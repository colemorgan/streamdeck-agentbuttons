import type { AgentState } from "./agent-state.js";

export type RenderState = AgentState | "offline";

export type FaceOptions = {
  state: RenderState;
  /** 0-based slot index for default A1–A6 label */
  slot: number;
  /** Optional display name override (e.g. "Ship") */
  customLabel?: string | null;
};

const COLORS: Record<RenderState, { fill: string; text: string; accent: string }> =
  {
    off: { fill: "#1a1a1a", text: "#888888", accent: "#3a3a3a" },
    idle: { fill: "#f2f2f2", text: "#111111", accent: "#c8c8c8" },
    working: { fill: "#304ffe", text: "#ffffff", accent: "#7a8cff" },
    complete: { fill: "#00c853", text: "#0a1a0c", accent: "#69f0ae" },
    awaiting: { fill: "#ff6d00", text: "#ffffff", accent: "#ffab40" },
    error: { fill: "#d50000", text: "#ffffff", accent: "#ff5252" },
    offline: { fill: "#3d3d3d", text: "#bdbdbd", accent: "#616161" },
  };

const STATE_WORD: Record<RenderState, string> = {
  off: "Off",
  idle: "Idle",
  working: "Busy",
  complete: "Done",
  awaiting: "Wait",
  error: "Err",
  offline: "—",
};

/** Max characters for custom labels on a 144px key face. */
export const MAX_CUSTOM_LABEL_LEN = 10;

/**
 * Normalize optional custom label: trim, cap length, empty → undefined.
 */
export function normalizeCustomLabel(
  raw: string | undefined | null,
): string | undefined {
  if (raw == null) return undefined;
  const t = String(raw).trim();
  if (!t) return undefined;
  if (t.length <= MAX_CUSTOM_LABEL_LEN) return t;
  return t.slice(0, MAX_CUSTOM_LABEL_LEN - 1) + "…";
}

/**
 * Primary face text: custom label or A1–A6.
 */
export function facePrimaryLabel(
  slot: number,
  customLabel?: string | null,
): string {
  const custom = normalizeCustomLabel(customLabel);
  if (custom) return custom;
  const s = Number.isInteger(slot) && slot >= 0 && slot <= 5 ? slot : 0;
  return `A${s + 1}`;
}

/**
 * Short state word for secondary line.
 */
export function faceStateWord(state: RenderState): string {
  return STATE_WORD[state] ?? STATE_WORD.offline;
}

/**
 * Build an SVG data-URL for a Stream Deck key face (144×144).
 */
export function stateImageDataUrl(
  stateOrOpts: RenderState | FaceOptions,
  labelOrUnused?: string,
): string {
  let state: RenderState;
  let primary: string;
  let slot = 0;

  if (typeof stateOrOpts === "object" && stateOrOpts !== null && "state" in stateOrOpts) {
    state = stateOrOpts.state;
    slot = stateOrOpts.slot;
    primary = facePrimaryLabel(slot, stateOrOpts.customLabel);
  } else {
    // Legacy: stateImageDataUrl(state, label)
    state = stateOrOpts as RenderState;
    primary = labelOrUnused ?? "A1";
  }

  const palette = COLORS[state] ?? COLORS.offline;
  const word = faceStateWord(state);
  const c = palette.text;
  const glyph = glyphPath(state, c);

  // Offline: dashed border cue
  const border =
    state === "offline"
      ? `<rect x="6" y="6" width="132" height="132" rx="18" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-dasharray="8 6"/>`
      : state === "off"
        ? `<rect x="8" y="8" width="128" height="128" rx="16" fill="none" stroke="${palette.accent}" stroke-width="2"/>`
        : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="${palette.fill}"/>
  ${border}
  <g transform="translate(72 48)" opacity="0.95">${glyph}</g>
  <text x="72" y="92" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="700" fill="${c}">${escapeXml(primary)}</text>
  <text x="72" y="118" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="600" fill="${c}" opacity="0.85">${escapeXml(word)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Simple centered glyphs (origin at center of glyph zone). */
function glyphPath(state: RenderState, color: string): string {
  switch (state) {
    case "working":
      return `<circle cx="0" cy="0" r="12" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="20 40" stroke-linecap="round" transform="rotate(-40)"/>`;
    case "complete":
      return `<path d="M-10 0 L-3 8 L12 -10" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "awaiting":
      return `<text x="0" y="8" text-anchor="middle" font-size="28" font-weight="700" fill="${color}">?</text>`;
    case "error":
      return `<text x="0" y="8" text-anchor="middle" font-size="28" font-weight="700" fill="${color}">!</text>`;
    case "offline":
      return `<circle cx="0" cy="0" r="11" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="4 5"/>`;
    case "off":
      return `<circle cx="0" cy="0" r="11" fill="none" stroke="${color}" stroke-width="2"/>`;
    case "idle":
    default:
      return `<circle cx="0" cy="0" r="11" fill="${color}" opacity="0.35"/>`;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
