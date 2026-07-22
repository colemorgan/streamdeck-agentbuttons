import { afterEach, describe, expect, it } from "vitest";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { Bridge } from "../src/bridge.js";
import { ShimSocketServer } from "../src/detection/socket-server.js";
import { STATE_COLORS } from "@agentbuttons/protocol";

describe("ShimSocketServer", () => {
  let server: ShimSocketServer | null = null;
  const sockPath = path.join(
    process.env.TMPDIR || "/tmp",
    `agentbuttons-test-${process.pid}.sock`,
  );

  afterEach(() => {
    server?.stop();
    server = null;
    try {
      if (fs.existsSync(sockPath)) fs.unlinkSync(sockPath);
    } catch {
      /* ignore */
    }
  });

  it("accepts host JSON over socket and returns newline replies", async () => {
    const bridge = new Bridge();
    server = new ShimSocketServer(bridge, sockPath);
    server.start();

    const client = net.createConnection(sockPath);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });

    const replies: string[] = [];
    client.on("data", (d) => {
      replies.push(d.toString("utf8"));
    });

    client.write(JSON.stringify({ id: 5, method: "sys.version" }));

    await new Promise((r) => setTimeout(r, 50));
    const joined = replies.join("");
    expect(joined).toContain("\n");
    const line = joined.split("\n").find((l) => l.includes('"id":5'));
    expect(line).toBeTruthy();
    expect(JSON.parse(line!).id).toBe(5);

    client.write(
      JSON.stringify({
        id: 6,
        method: "v.oai.thstatus",
        params: { slots: [{ i: 1, status: "working" }] },
      }),
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(bridge.getSlots()[1]!.state).toBe("working");
    expect(bridge.getSlots()[1]!.color).toBe(STATE_COLORS.working);

    client.end();
  });
});
