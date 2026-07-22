/**
 * Inject into ChatGPT desktop via NODE_OPTIONS=--require <this file>.
 *
 * On macOS, Codex Micro discovery uses native hid-topology-watcher
 * (findCodexMicroInterfaces), then opens the device via node-hid.
 * We patch both so ChatGPT sees a synthetic Codex Micro tunneled over a
 * Unix socket to agentbuttons-companion.
 *
 * Personal interoperability use only. No app files are modified.
 */
"use strict";

const Module = require("module");
const path = require("path");
const net = require("net");
const fs = require("fs");

const VID = 0x303a; // 12346
const PID = 0x8360; // 33632
const USAGE_PAGE = 0xff00; // 65280
const REPORT_SIZE = 64;
const REPORT_ID = 0x06;
const CHANNEL_RPC = 2;

const SOCKET_PATH =
  process.env.AGENTBUTTONS_SHIM_SOCKET ||
  path.join(process.env.TMPDIR || "/tmp", "agentbuttons-codex-micro.sock");

const FAKE_PATH = "agentbuttons-virtual-codex-micro";

const FAKE_DEVICE = {
  vendorId: VID,
  productId: PID,
  path: FAKE_PATH,
  serialNumber: "AGENTBUTTONS-0",
  manufacturer: "Work Louder",
  product: "Codex Micro",
  release: 0x0000, // isUsbConnection: release % 4 == 0
  interface: 0,
  usagePage: USAGE_PAGE,
  usage: 1,
};

/** Shape expected by codex-micro-service filter (path + usagePage). */
const FAKE_TOPOLOGY = {
  path: FAKE_PATH,
  usagePage: USAGE_PAGE,
  release: 0,
  vendorId: VID,
  productId: PID,
  manufacturer: "Work Louder",
  product: "Codex Micro",
};

function log(msg) {
  try {
    fs.appendFileSync(
      path.join(process.env.TMPDIR || "/tmp", "agentbuttons-shim.log"),
      `[agentbuttons] ${msg}\n`,
    );
  } catch {
    /* ignore */
  }
}

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

function isFakePath(pathOrVid, pid) {
  if (pathOrVid === FAKE_PATH) return true;
  if (pathOrVid === VID && pid === PID) return true;
  if (
    typeof pathOrVid === "string" &&
    String(pathOrVid).includes("agentbuttons-virtual")
  ) {
    return true;
  }
  return false;
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
      log(`socket missing, retry: ${SOCKET_PATH}`);
      setTimeout(() => this._connect(), 500);
      return;
    }
    this._sock = net.createConnection(SOCKET_PATH, () => {
      log("connected to companion socket");
    });
    this._sock.on("data", (chunk) => {
      this._rx += chunk.toString("utf8");
      let idx;
      while ((idx = this._rx.indexOf("\n")) !== -1) {
        const line = this._rx.slice(0, idx);
        this._rx = this._rx.slice(idx + 1);
        if (!line) continue;
        const payload = line.endsWith("\n") ? line : line + "\n";
        for (const report of encodeReports(payload)) {
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
      log(`socket error: ${err.message}`);
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
    if (!list.some((d) => d.vendorId === VID && d.productId === PID)) {
      list.push({ ...FAKE_DEVICE });
    }
    return list;
  };

  if (typeof hid.devicesAsync === "function") {
    const origAsync = hid.devicesAsync.bind(hid);
    hid.devicesAsync = async function devicesAsyncPatched(...args) {
      const list = (await origAsync(...args)) || [];
      if (!list.some((d) => d.vendorId === VID && d.productId === PID)) {
        list.push({ ...FAKE_DEVICE });
      }
      return list;
    };
  }

  const OrigHID = hid.HID;
  if (typeof OrigHID === "function") {
    hid.HID = function AgentbuttonsHID(pathOrVid, pid) {
      if (isFakePath(pathOrVid, pid)) return new VirtualHidDevice();
      return new OrigHID(pathOrVid, pid);
    };
    Object.setPrototypeOf(hid.HID, OrigHID);
    Object.assign(hid.HID, OrigHID);
  }

  if (hid.HIDAsync && typeof hid.HIDAsync.open === "function") {
    const origOpen = hid.HIDAsync.open.bind(hid.HIDAsync);
    hid.HIDAsync.open = async function openPatched(pathOrVid, pid) {
      if (isFakePath(pathOrVid, pid)) {
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
  log("node-hid patched");
  return hid;
}

/**
 * macOS discovery path: findCodexMicroInterfaces() on native addon.
 */
function patchTopologyWatcher(mod) {
  if (!mod || mod.__agentbuttonsPatched) return mod;

  const origFind = mod.findCodexMicroInterfaces
    ? mod.findCodexMicroInterfaces.bind(mod)
    : async () => [];

  mod.findCodexMicroInterfaces = async function findCodexMicroInterfacesPatched() {
    let real = [];
    try {
      real = (await origFind()) || [];
    } catch (e) {
      log(`orig findCodexMicroInterfaces error: ${e.message}`);
    }
    if (!Array.isArray(real)) real = [];
    if (!real.some((d) => d && d.path === FAKE_PATH)) {
      real = [...real, { ...FAKE_TOPOLOGY }];
    }
    log(`findCodexMicroInterfaces → ${real.length} device(s)`);
    return real;
  };

  if (typeof mod.watch === "function") {
    const origWatch = mod.watch.bind(mod);
    mod.watch = function watchPatched(cb) {
      const watcher = origWatch(cb);
      // Nudge reconciliation after start
      setTimeout(() => {
        try {
          if (typeof cb === "function") cb();
        } catch {
          /* ignore */
        }
      }, 200);
      return watcher;
    };
  }

  mod.__agentbuttonsPatched = true;
  log("hid-topology-watcher patched");
  return mod;
}

function shouldPatchRequest(request) {
  if (typeof request !== "string") return null;
  if (
    request === "node-hid" ||
    request.endsWith("node-hid") ||
    request.includes("node-hid" + path.sep) ||
    request.includes("node-hid/")
  ) {
    return "hid";
  }
  if (
    request.includes("hid-topology-watcher") ||
    request.includes("hid_topology_watcher")
  ) {
    return "topo";
  }
  return null;
}

const originalLoad = Module._load;
Module._load = function agentbuttonsLoad(request, parent, isMain) {
  const exported = originalLoad.apply(this, arguments);
  const kind = shouldPatchRequest(request);
  if (kind === "hid") {
    try {
      return patchHid(exported);
    } catch (e) {
      log(`patchHid failed: ${e.message}`);
      return exported;
    }
  }
  if (kind === "topo") {
    try {
      return patchTopologyWatcher(exported);
    } catch (e) {
      log(`patchTopo failed: ${e.message}`);
      return exported;
    }
  }
  return exported;
};

log(`shim preload active socket=${SOCKET_PATH}`);
