import { describe, expect, it } from "vitest";
import {
  encodeReports,
  extractJsonObjects,
  extractNewlineMessages,
  ReportAssembler,
  MAX_PAYLOAD,
  utf8Decode,
} from "../src/framing.js";

describe("encodeReports", () => {
  it("packs a short payload into one 64-byte report", () => {
    const reports = encodeReports('{"id":1}');
    expect(reports).toHaveLength(1);
    expect(reports[0]![0]).toBe(0x06);
    expect(reports[0]![1]).toBe(2);
    expect(reports[0]![2]).toBe(8);
  });

  it("splits payloads larger than MAX_PAYLOAD", () => {
    const big = "x".repeat(MAX_PAYLOAD + 10);
    const reports = encodeReports(big);
    expect(reports.length).toBeGreaterThan(1);
    expect(reports[0]![2]).toBe(MAX_PAYLOAD);
    expect(reports[1]![2]).toBe(10);
  });
});

describe("extractJsonObjects", () => {
  it("parses a single bare JSON object", () => {
    const { objects, rest } = extractJsonObjects('{"id":1,"method":"sys.version"}');
    expect(objects).toEqual(['{"id":1,"method":"sys.version"}']);
    expect(rest).toBe("");
  });

  it("parses back-to-back objects without newlines", () => {
    const { objects, rest } = extractJsonObjects(
      '{"id":1,"method":"a"}{"id":2,"method":"b"}',
    );
    expect(objects).toHaveLength(2);
    expect(JSON.parse(objects[0]!).id).toBe(1);
    expect(JSON.parse(objects[1]!).id).toBe(2);
    expect(rest).toBe("");
  });

  it("holds incomplete JSON until braces balance", () => {
    const first = extractJsonObjects('{"id":1,"method":"x"');
    expect(first.objects).toHaveLength(0);
    expect(first.rest.startsWith("{")).toBe(true);

    const second = extractJsonObjects(first.rest + "}");
    expect(second.objects).toHaveLength(1);
    expect(second.rest).toBe("");
  });

  it("handles braces inside strings", () => {
    const { objects } = extractJsonObjects('{"m":"x","p":{"s":"a}b"}}');
    expect(objects).toHaveLength(1);
    expect(JSON.parse(objects[0]!).p.s).toBe("a}b");
  });
});

describe("extractNewlineMessages", () => {
  it("splits device→host newline-delimited lines", () => {
    const { lines, rest } = extractNewlineMessages('{"id":1}\n{"id":2}\npartial');
    expect(lines).toEqual(['{"id":1}', '{"id":2}']);
    expect(rest).toBe("partial");
  });
});

describe("ReportAssembler", () => {
  it("reassembles multi-report messages", () => {
    const payload = "y".repeat(MAX_PAYLOAD + 5);
    const reports = encodeReports(payload);
    const asm = new ReportAssembler();
    expect(asm.push(reports[0]!)).toBeNull();
    const done = asm.push(reports[1]!);
    expect(done).not.toBeNull();
    expect(utf8Decode(done!.payload)).toBe(payload);
  });
});
