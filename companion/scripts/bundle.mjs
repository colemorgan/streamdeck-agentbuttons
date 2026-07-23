#!/usr/bin/env node
/**
 * Bundle companion CLI + deps into a single CJS file for embedding in the
 * macOS menu bar app Resources.
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const entry = path.join(root, "dist/cli.js");
const outfile = path.join(root, "dist/companion.bundle.cjs");

if (!fs.existsSync(entry)) {
  console.error("error: build companion first (npm run build -w @agentbuttons/companion)");
  process.exit(1);
}

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  // No shebang: menu bar app invokes `node companion.bundle.cjs`
  // (a shebang banner is a SyntaxError under `node file`).
  external: [],
  logLevel: "info",
});

// Strip leading shebang (from cli.js banner) — safe under `node file`
let text = fs.readFileSync(outfile, "utf8");
if (text.startsWith("#!")) {
  text = text.replace(/^#![^\n]*\n/, "");
  fs.writeFileSync(outfile, text);
}
console.error(`wrote ${outfile} (${(text.length / 1024).toFixed(1)} KB)`);
