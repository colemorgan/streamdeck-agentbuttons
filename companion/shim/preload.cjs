/**
 * Inject into ChatGPT desktop via NODE_OPTIONS=--require <this file>.
 * Patches node-hid so devices() includes a synthetic Codex Micro that
 * tunnels HID reports over a Unix socket to agentbuttons-companion.
 *
 * Personal interoperability use only. No app files are modified.
 */
"use strict";

const Module = require("module");
const path = require("path");
const net = require("net");
const fs = require("fs");

const VID = 0x303a;
const PID = 0x8360;
const USAGE_PAGE = 0xff00;
const REPORT_SIZE = 64;
const REPORT_ID = 0x06;
const CHANNEL_RPC = 2;

const SOCKET_PATH =
  process.env.AGENTBUTTONS_SHIM_SOCKET ||
  path.join(process.env.TMPDIR || "/tmp", "agentbuttons-codex-micro.sock");

const FAKE_DEVICE = {
  vendorId: VID,
  productId: PID,
  path: "agentbuttons-virtual-codex-micro",
  serialNumber: "AGENTBUTTONS-0",
  manufacturer: "Work Louder",
  product: "Codex Micro",
  release: 0x0000,
  interface: 0,
  usagePage: USAGE_PAGE,
  usage: 1,
};

function encodeReports(utf8Payload) {
  const bytes = Buffer.from(utf8Payload, "utf8");
  const reports = [];
  let offset = 0;
  const MAX = 61;
  do {
    const chunkLen = Math.min(MAX, Math.max(0, bytes.length - offset));
    const report = Buffer.alloc(REPORT_SIZE);
    report[0] = REPORT_ID;
    report[1] = CHANNEL_RPC;
    report[2] = chunkLen;
    if (chunkLen > 0) bytes.copy(report, 3, offset, offset + chunkLen);
    reports.push(report);
    offset += chunkLen;
  } while (offset < bytes.length);
  return reports;
}

function decodeReportPayload(data) {
  if (!data || data.length < 3) return null;
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf[0] !== REPORT_ID) return null;
  const len = buf[2];
  return buf.subarray(3, 3 + len).toString("utf8");
}

class VirtualHidDevice {
  constructor() {
    this._listeners = { data: [], error: [] };
    this._sock = null;
    this._rx = "";
    this._connect();
  }

  _connect() {
    if (!fs.existsSync(SOCKET_PATH)) {
      setTimeout(() => this._connect(), 500);
      return;
    }
    this._sock = net.createConnection(SOCKET_PATH, () => {
      /* connected to companion */
    });
    this._sock.on("data", (chunk) => {
      this._rx += chunk.toString("utf8");
      let idx;
      while ((idx = this._rx.indexOf("\n")) !== -1) {
        const line = this._rx.slice(0, idx);
        this._rx = this._rx.slice(idx + 1);
        if (!line) continue;
        for (const report of encodeReports(line.endsWith("\n") ? line : line + "\n")) {
          for (const fn of this._listeners.data) {
            try {
              fn(report);
            } catch {
              /* ignore */
            }
          }
        }
      }
    });
    this._sock.on("error", (err) => {
      for (const fn of this._listeners.error) {
        try {
          fn(err);
        } catch {
          /* ignore */
        }
      }
      this._sock = null;
      setTimeout(() => this._connect(), 1000);
    });
    this._sock.on("close", () => {
      this._sock = null;
      setTimeout(() => this._connect(), 1000);
    });
  }

  on(event, fn) {
    if (event === "data" || event === "error") this._listeners[event].push(fn);
    return this;
  }

  write(data, callback) {
    const payload = decodeReportPayload(data);
    if (payload != null && this._sock && !this._sock.destroyed) {
      this._sock.write(payload);
    }
    if (typeof callback === "function") callback();
    return true;
  }

  close() {
    try {
      this._sock?.destroy();
    } catch {
      /* ignore */
    }
    this._sock = null;
  }

  // node-hid compatibility shims
  getDeviceInfo() {
    return { ...FAKE_DEVICE };
  }
  pause() {}
  resume() {}
  read() {
    return null;
  }
  readSync() {
    return [];
  }
  readTimeout() {
    return [];
  }
  sendFeatureReport() {}
  getFeatureReport() {
    return [];
  }
  setNonBlocking() {}
}

function patchHid(hid) {
  if (!hid || hid.__agentbuttonsPatched) return hid;
  const originalDevices = hid.devices ? hid.devices.bind(hid) : () => [];
  hid.devices = function patchedDevices(...args) {
    const list = originalDevices(...args) || [];
    const already = list.some(
      (d) => d.vendorId === VID && d.productId === PID,
    );
    if (!already) list.push({ ...FAKE_DEVICE });
    return list;
  };

  const OrigHID = hid.HID;
  if (typeof OrigHID === "function") {
    hid.HID = function AgentbuttonsHID(pathOrVid, pid) {
      const isFake =
        pathOrVid === FAKE_DEVICE.path ||
        (pathOrVid === VID && pid === PID) ||
        (typeof pathOrVid === "string" &&
          String(pathOrVid).includes("agentbuttons-virtual"));
      if (isFake) return new VirtualHidDevice();
      return new OrigHID(pathOrVid, pid);
    };
    Object.setPrototypeOf(hid.HID, OrigHID);
    Object.assign(hid.HID, OrigHID);
  }

  // HIDAsync.open used by newer node-hid
  if (hid.HIDAsync && typeof hid.HIDAsync.open === "function") {
    const origOpen = hid.HIDAsync.open.bind(hid.HIDAsync);
    hid.HIDAsync.open = async function openPatched(pathOrVid, pid) {
      const isFake =
        pathOrVid === FAKE_DEVICE.path ||
        (pathOrVid === VID && pid === PID) ||
        (typeof pathOrVid === "string" &&
          String(pathOrVid).includes("agentbuttons-virtual"));
      if (isFake) {
        const dev = new VirtualHidDevice();
        return {
          on: (e, fn) => dev.on(e, fn),
          write: (data) => Promise.resolve(dev.write(data)),
          close: () => Promise.resolve(dev.close()),
          getDeviceInfo: () => Promise.resolve(dev.getDeviceInfo()),
        };
      }
      return origOpen(pathOrVid, pid);
    };
  }

  hid.__agentbuttonsPatched = true;
  return hid;
}

const originalLoad = Module._load;
Module._load = function agentbuttonsLoad(request, parent, isMain) {
  const exported = originalLoad.apply(this, arguments);
  if (
    request === "node-hid" ||
    request === "node-hid/build/Release/HID.node" ||
    (typeof request === "string" && request.endsWith("node-hid"))
  ) {
    try {
      return patchHid(exported);
    } catch {
      return exported;
    }
  }
  return exported;
};

// Log once for operators launching via our script
try {
  fs.appendFileSync(
    path.join(process.env.TMPDIR || "/tmp", "agentbuttons-shim.log"),
    `[agentbuttons] shim preload active socket=${SOCKET_PATH}\n`,
  );
} catch {
  /* ignore */
}
