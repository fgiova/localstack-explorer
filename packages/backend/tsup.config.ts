import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: { bundle: "src/bundle.ts" },
		format: ["cjs"],
		target: "node20",
		outDir: "../../bundle",
		clean: false,
		splitting: false,
		sourcemap: false,
		noExternal: [/.*/],
	},
]);
