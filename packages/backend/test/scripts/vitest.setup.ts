import type { TestProject } from "vitest/node";
import globalSetup from "./executors/setup.js";
import globalTeardown from "./executors/teardown.js";

export async function setup(_project: TestProject) {
	console.log("start global setup");
	await globalSetup();
}

export async function teardown() {
	console.log("start global teardown");
	await globalTeardown();
}
