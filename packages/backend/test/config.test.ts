import { beforeEach, describe, expect, it, vi } from "vitest";

const ALL_SERVICES = [
	"s3",
	"sqs",
	"sns",
	"iam",
	"cloudformation",
	"dynamodb",
	"lambda",
];

let mockEnabledServices = "s3,sqs,sns,iam,cloudformation,dynamodb,lambda";

vi.mock("env-schema", () => ({
	envSchema: () => ({
		PORT: 3001,
		LOCALSTACK_ENDPOINT: "http://localhost:4566",
		LOCALSTACK_REGION: "us-east-1",
		ENABLED_SERVICES: mockEnabledServices,
	}),
}));

beforeEach(() => {
	vi.resetModules();
});

describe("config shape", () => {
	it("exposes port, endpoint, region with correct types", async () => {
		mockEnabledServices = "s3,sqs,sns,iam,cloudformation,dynamodb,lambda";
		const { config } = await import("../src/config.js");

		expect(config.port).toBe(3001);
		expect(config.localstackEndpoint).toBe("http://localhost:4566");
		expect(config.localstackRegion).toBe("us-east-1");
	});

	it("exposes all enabled services", async () => {
		mockEnabledServices = "s3,sqs,sns,iam,cloudformation,dynamodb,lambda";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toHaveLength(7);
		for (const svc of config.enabledServices) {
			expect(ALL_SERVICES).toContain(svc);
		}
	});

	it("includes lambda in enabled services", async () => {
		mockEnabledServices = "s3,sqs,sns,iam,cloudformation,dynamodb,lambda";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toContain("lambda");
	});
});

describe("parseEnabledServices", () => {
	it("returns all services when ENABLED_SERVICES is empty", async () => {
		mockEnabledServices = "";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toHaveLength(ALL_SERVICES.length);
		expect(config.enabledServices).toEqual(
			expect.arrayContaining(ALL_SERVICES),
		);
	});

	it("returns all services when ENABLED_SERVICES is whitespace only", async () => {
		mockEnabledServices = "   ";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toHaveLength(ALL_SERVICES.length);
	});

	it("filters out unknown service names", async () => {
		mockEnabledServices = "s3,unknown-service,dynamodb";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toEqual(["s3", "dynamodb"]);
	});

	it("returns only listed services", async () => {
		mockEnabledServices = "s3,sqs";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toEqual(["s3", "sqs"]);
	});

	it("trims whitespace around service names", async () => {
		mockEnabledServices = " s3 , sqs ";
		const { config } = await import("../src/config.js");

		expect(config.enabledServices).toEqual(["s3", "sqs"]);
	});
});
