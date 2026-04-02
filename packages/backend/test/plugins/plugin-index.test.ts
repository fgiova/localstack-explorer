import Fastify from "fastify";
import { describe, expect, it } from "vitest";
// clientCachePlugin uses fastify-plugin (fp) so it decorates the root instance.
// We register the real plugins here to verify the index.ts wrappers boot correctly.
import clientCachePlugin from "../../src/plugins/client-cache.js";
import cloudformationPlugin from "../../src/plugins/cloudformation/index.js";
import dynamodbPlugin from "../../src/plugins/dynamodb/index.js";
import iamPlugin from "../../src/plugins/iam/index.js";
import localstackConfigPlugin from "../../src/plugins/localstack-config.js";
import snsPlugin from "../../src/plugins/sns/index.js";
import sqsPlugin from "../../src/plugins/sqs/index.js";

describe("plugin index files", () => {
	it("should register sqsPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(sqsPlugin);
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});

	it("should register snsPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(snsPlugin);
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});

	it("should register dynamodbPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(dynamodbPlugin);
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});

	it("should register iamPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(iamPlugin);
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});

	it("should register cloudformationPlugin without error", async () => {
		const app = Fastify();
		await app.register(localstackConfigPlugin);
		await app.register(clientCachePlugin);
		await app.register(cloudformationPlugin);
		await expect(app.ready()).resolves.not.toThrow();
		await app.close();
	});
});
