import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import type { Bridge } from "../bridge.js";

export function defaultShimSocketPath(): string {
  if (process.env.AGENTBUTTONS_SHIM_SOCKET) {
    return process.env.AGENTBUTTONS_SHIM_SOCKET;
  }
  return path.join(
    process.env.TMPDIR || "/tmp",
    "agentbuttons-codex-micro.sock",
  );
}

/**
 * Unix domain socket: ChatGPT shim ↔ Micro emulator.
 * Shim writes host→device UTF-8; we write device→host newline JSON.
 */
export class ShimSocketServer {
  private server: net.Server | null = null;
  private sockets = new Set<net.Socket>();
  private readonly socketPath: string;
  private unboundOutbound = false;

  constructor(
    private readonly bridge: Bridge,
    socketPath: string = defaultShimSocketPath(),
  ) {
    this.socketPath = socketPath;
  }

  start(): string {
    this.cleanupSocketFile();

    // Fan emulator replies to all connected shims
    if (!this.unboundOutbound) {
      this.bridge.emulator.on("outbound", (line) => {
        for (const sock of this.sockets) {
          if (!sock.destroyed) sock.write(line);
        }
      });
      this.unboundOutbound = true;
    }

    this.server = net.createServer((sock) => {
      this.sockets.add(sock);
      this.bridge.setChatgpt("connected");

      sock.on("data", (chunk) => {
        this.bridge.feedHostText(chunk.toString("utf8"));
      });

      const onClose = () => {
        this.sockets.delete(sock);
        if (this.sockets.size === 0) this.bridge.setChatgpt("waiting");
      };
      sock.on("close", onClose);
      sock.on("error", onClose);
    });

    this.server.listen(this.socketPath);
    try {
      fs.chmodSync(this.socketPath, 0o600);
    } catch {
      /* ignore */
    }
    return this.socketPath;
  }

  get path(): string {
    return this.socketPath;
  }

  stop(): void {
    for (const s of this.sockets) s.destroy();
    this.sockets.clear();
    this.server?.close();
    this.server = null;
    this.cleanupSocketFile();
  }

  private cleanupSocketFile(): void {
    try {
      if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath);
    } catch {
      /* ignore */
    }
  }
}
