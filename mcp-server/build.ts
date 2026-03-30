import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/index.js",
  external: ["better-sqlite3"],
  banner: { js: "#!/usr/bin/env node" },
});

console.log("MCP server built to dist/index.js");
