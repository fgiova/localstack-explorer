import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLocalstackHealth } from "../../src/health.js";
import clientCachePlugin from "../../src/plugins/client-cache.js";
import localstackConfigPlugin from "../../src/plugins/localstack-config.js";
import { registerErrorHandler } from "../../src/shared/errors.js";
import { getLocalstackHeaders } from "./app-helper.js";

describe("Health & Services Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);

		app.get("/api/health", async (request) => {
			const { endpoint, region } = request.localstackConfig;
			return checkLocalstackHealth(endpoint, region);
		});

		app.get("/api/services", async () => ({
			services: ["s3", "sqs", "sns", "iam", "cloudformation", "dynamodb"],
			defaultEndpoint:
				process.env.LOCALSTACK_ENDPOINT ?? "http://localhost:4566",
			defaultRegion: process.env.LOCALSTACK_REGION ?? "us-east-1",
		}));

		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it("should return health connected: true", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/health",
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.connected).toBe(true);
	});

	it("should return services list", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/services",
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.services).toContain("s3");
		expect(body.services).toContain("sqs");
	});
});
