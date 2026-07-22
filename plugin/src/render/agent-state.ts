/** Mirrors protocol AgentState + offline UI state. */
export type AgentState =
  | "off"
  | "idle"
  | "working"
  | "complete"
  | "awaiting"
  | "error";
