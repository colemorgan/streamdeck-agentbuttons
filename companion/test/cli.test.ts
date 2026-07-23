import { describe, expect, it } from "vitest";
import { helpText, parseArgs, VERSION } from "../src/cli.js";
import { DEFAULT_IPC_PORT } from "@agentbuttons/protocol";

describe("parseArgs / helpText", () => {
  it("parses demo and chatgpt flags", () => {
    const a = parseArgs(["--demo", "--chatgpt", "--port", "19999", "--verbose"]);
    expect(a.demo).toBe(true);
    expect(a.chatgpt).toBe(true);
    expect(a.port).toBe(19999);
    expect(a.verbose).toBe(true);
  });

  it("parses --probe", () => {
    const a = parseArgs(["--probe", "--port", "19847"]);
    expect(a.probe).toBe(true);
    expect(a.port).toBe(19847);
  });

  it("help documents install order and IPC port", () => {
    const h = helpText(DEFAULT_IPC_PORT);
    expect(h).toContain("--demo");
    expect(h).toContain("--chatgpt");
    expect(h).toContain("--probe");
    expect(h).toContain(String(DEFAULT_IPC_PORT));
    expect(h.toLowerCase()).toContain("install order");
    expect(h).toContain("plugin");
  });

  it("exports a non-empty version", () => {
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
