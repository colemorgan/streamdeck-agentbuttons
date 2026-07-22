import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.colemorgan.codex-agent-buttons.sdPlugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    format: "cjs",
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return path.relative(
        path.join(__dirname, sdPlugin, "bin"),
        path.resolve(path.dirname(sourcemapPath), relativeSourcePath),
      );
    },
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      mapRoot: isWatching ? "./" : undefined,
    }),
    nodeResolve({
      browser: false,
      exportConditions: ["node"],
      preferBuiltins: true,
    }),
    commonjs(),
    !isWatching && terser(),
  ],
  // Bundle workspace protocol into plugin so Stream Deck runtime needs only @elgato/streamdeck
  external: ["@elgato/streamdeck"],
};

export default config;
