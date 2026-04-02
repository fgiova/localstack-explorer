import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import clientCachePlugin from "../../../src/plugins/client-cache.js";
import lambdaPlugin from "../../../src/plugins/lambda/index.js";
import localstackConfigPlugin from "../../../src/plugins/localstack-config.js";

describe("lambdaPlugin index", () => {
	it("should register lambdaPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(lambdaPlugin, { prefix: "/api/lambda" });
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});

	it("should expose expected routes under /api/lambda", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(lambdaPlugin, { prefix: "/api/lambda" });
		await app.ready();

		const routeTree = app.printRoutes({ includeHooks: false });
		expect(routeTree).toContain("api/lambda");

		await app.close();
	});

	it("should have GET / route for listing functions", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(lambdaPlugin, { prefix: "/api/lambda" });
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/lambda/",
			headers: {
				"x-localstack-endpoint": "http://localhost:4566",
				"x-localstack-region": "us-east-1",
			},
		});

		// The route exists (not 404); we may get a connection error but not "not found"
		expect(res.statusCode).not.toBe(404);

		await app.close();
	});
});
