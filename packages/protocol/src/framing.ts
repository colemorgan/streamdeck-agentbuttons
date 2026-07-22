/** Codex Micro HID report framing (64-byte reports). */

export const REPORT_SIZE = 64;
export const REPORT_ID = 0x06;
export const CHANNEL_DEBUG = 1;
export const CHANNEL_RPC = 2;
export const MAX_PAYLOAD = 61;

/**
 * Encode a logical message into one or more 64-byte HID reports.
 * channel 2 = RPC; device→host messages should already include trailing `\n` if required by the app.
 */
export function encodeReports(
  payload: string | Uint8Array,
  channel: number = CHANNEL_RPC,
): Uint8Array[] {
  const bytes =
    typeof payload === "string" ? new TextEncoder().encode(payload) : payload;
  const reports: Uint8Array[] = [];
  let offset = 0;
  while (offset < bytes.length || (bytes.length === 0 && reports.length === 0)) {
    const chunkLen = Math.min(MAX_PAYLOAD, bytes.length - offset);
    const report = new Uint8Array(REPORT_SIZE);
    report[0] = REPORT_ID;
    report[1] = channel;
    report[2] = chunkLen;
    report.set(bytes.subarray(offset, offset + chunkLen), 3);
    reports.push(report);
    offset += chunkLen;
    if (bytes.length === 0) break;
  }
  return reports;
}

/**
 * Reassemble multi-report payloads for a single channel.
 * Does not interpret JSON — returns raw UTF-8 string chunks joined.
 */
export class ReportAssembler {
  private buffers = new Map<number, Uint8Array[]>();

  /**
   * Feed one 64-byte report. Returns complete payload string when a logical
   * message is finished. For host→device (no newline terminator), callers should
   * use {@link extractJsonObjects} on the accumulating stream instead.
   */
  push(report: Uint8Array): { channel: number; payload: Uint8Array } | null {
    if (report.length < 3 || report[0] !== REPORT_ID) {
      return null;
    }
    const channel = report[1]!;
    const len = report[2]!;
    if (len > MAX_PAYLOAD) return null;
    const chunk = report.subarray(3, 3 + len);

    // Single-report messages (common): return immediately when len < MAX_PAYLOAD
    // Multi-report: accumulate until a short final chunk.
    const existing = this.buffers.get(channel) ?? [];
    existing.push(chunk);
    this.buffers.set(channel, existing);

    if (len < MAX_PAYLOAD) {
      this.buffers.delete(channel);
      return { channel, payload: concat(existing) };
    }
    return null;
  }

  reset(): void {
    this.buffers.clear();
  }
}

/**
 * Extract complete JSON objects from a stream of host→device text.
 * ChatGPT sends bare JSON without newlines; complete by balanced braces.
 * Returns remaining unparsed tail.
 */
export function extractJsonObjects(buffer: string): {
  objects: string[];
  rest: string;
} {
  const objects: string[] = [];
  let i = 0;
  while (i < buffer.length) {
    while (i < buffer.length && /\s/.test(buffer[i]!)) i++;
    if (i >= buffer.length) break;
    if (buffer[i] !== "{") {
      // Skip garbage until next object
      i++;
      continue;
    }
    const start = i;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (; i < buffer.length; i++) {
      const c = buffer[i]!;
      if (inString) {
        if (escape) {
          escape = false;
        } else if (c === "\\") {
          escape = true;
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          objects.push(buffer.slice(start, i + 1));
          i++;
          break;
        }
      }
    }
    if (depth !== 0) {
      // Incomplete — return from start of this object
      return { objects, rest: buffer.slice(start) };
    }
  }
  return { objects, rest: buffer.slice(i) };
}

/**
 * Split device→host newline-delimited stream into complete lines.
 */
export function extractNewlineMessages(buffer: string): {
  lines: string[];
  rest: string;
} {
  const lines: string[] = [];
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf("\n")) !== -1) {
    const line = rest.slice(0, idx);
    rest = rest.slice(idx + 1);
    if (line.length > 0) lines.push(line);
  }
  return { lines, rest };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
