/**
 * ChatGPT detection backends (spike notes for implementers).
 *
 * Shim (default personal path):
 * - ChatGPT desktop is Electron and enumerates HID via node-hid in the main process.
 * - Launch with NODE_OPTIONS=--require companion/shim/preload.cjs so devices()
 *   includes a synthetic Codex Micro (VID 0x303A, PID 0x8360, usage 0xFF00).
 * - Reports tunnel over a Unix socket to this companion bridge.
 * - Requires Electron fuse NodeOptionsEnvVar enabled (verify after app updates).
 * - No app files are modified; signature stays intact. Fragile across updates.
 *
 * Virtual HID (stretch):
 * - IOHIDUserDeviceCreateWithProperties needs com.apple.developer.hid.virtual.device.
 * - Root/ad-hoc signing is insufficient on modern macOS.
 *
 * U3 ships loopback + IPC so plugin work can proceed without ChatGPT.
 * Real shim modules land when linking against a live ChatGPT install.
 */

export const CODEX_MICRO_VID = 0x303a;
export const CODEX_MICRO_PID = 0x8360;
export const CODEX_MICRO_USAGE_PAGE = 0xff00;
