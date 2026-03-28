import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bundle.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "../../dist",
  clean: false,
  splitting: false,
  sourcemap: true,
  noExternal: [/.*/],
  banner: {
    js: [
      'import { createRequire } from "node:module";',
      'import { fileURLToPath as __bundle_fileURLToPath } from "node:url";',
      'import { dirname as __bundle_dirname } from "node:path";',
      "const require = createRequire(import.meta.url);",
      "const __filename = __bundle_fileURLToPath(import.meta.url);",
      "const __dirname = __bundle_dirname(__filename);",
    ].join("\n"),
  },
});
