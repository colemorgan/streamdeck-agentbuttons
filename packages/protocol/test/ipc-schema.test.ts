import { describe, expect, it } from "vitest";
import {
  IPC_PROTOCOL_VERSION,
  parseIpcMessage,
  serializeIpc,
} from "../src/ipc.js";

describe("IPC schema", () => {
  it("round-trips a focus message", () => {
    const raw = serializeIpc({
      type: "focus",
      v: IPC_PROTOCOL_VERSION,
      slot: 3,
    });
    const msg = parseIpcMessage(raw);
    expect(msg).toEqual({ type: "focus", v: 1, slot: 3 });
  });

  it("rejects wrong protocol version", () => {
    expect(parseIpcMessage(JSON.stringify({ type: "focus", v: 99, slot: 0 }))).toBeNull();
  });

  it("rejects invalid JSON", () => {
    expect(parseIpcMessage("not-json")).toBeNull();
  });
});
