import { MicroEmulator } from "@agentbuttons/protocol";

/**
 * In-memory host↔device transport for tests.
 * Fake host sends bare JSON (like ChatGPT); device replies are newline-delimited.
 */
export class LoopbackHost {
  private deviceBuffer = "";

  constructor(private readonly emulator: MicroEmulator) {
    emulator.on("outbound", (line) => {
      this.deviceBuffer += line;
    });
  }

  /** Host sends a complete request (no newline required). */
  send(request: unknown): void {
    this.emulator.feedHostText(JSON.stringify(request));
  }

  /** Drain complete newline-delimited device→host messages. */
  drainReplies(): unknown[] {
    const out: unknown[] = [];
    let idx: number;
    while ((idx = this.deviceBuffer.indexOf("\n")) !== -1) {
      const line = this.deviceBuffer.slice(0, idx);
      this.deviceBuffer = this.deviceBuffer.slice(idx + 1);
      if (line) out.push(JSON.parse(line));
    }
    return out;
  }
}
