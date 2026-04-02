import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		globalSetup: "./test/scripts/vitest.setup.ts",
		environment: "node",
		testTimeout: 30_000,
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/bundle.ts"],
			thresholds: {
				lines: 100,
				functions: 100,
				statements: 100,
				branches: 95,
			},
		},
	},
});
