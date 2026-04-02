import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { snsRoutes } from "../../src/plugins/sns/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("SNS Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const topicName = `test-topic-${Date.now()}`;
	let subscriptionArn: string;

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(snsRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list topics", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("topics");
	});

	it("should create a topic", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: { name: topicName },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should get topic attributes", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${topicName}/attributes`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.topic.topicArn).toContain(topicName);
	});

	it("should set a topic attribute", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/${topicName}/attributes`,
			headers,
			payload: { attributeName: "DisplayName", attributeValue: "Test Topic" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should add tags to topic", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${topicName}/tags`,
			headers,
			payload: { tags: [{ key: "env", value: "test" }] },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should list tags for topic", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${topicName}/tags`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.tags.some((t: { key: string }) => t.key === "env")).toBe(true);
	});

	it("should remove tags from topic", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${topicName}/tags`,
			headers,
			payload: { tagKeys: ["env"] },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should create a subscription (SQS protocol)", async () => {
		// Create an SQS endpoint subscription (LocalStack auto-confirms)
		const region = headers["x-localstack-region"];
		const res = await app.inject({
			method: "POST",
			url: `/${topicName}/subscriptions`,
			headers,
			payload: {
				protocol: "sqs",
				endpoint: `arn:aws:sqs:${region}:000000000000:dummy-queue`,
			},
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should list subscriptions for topic", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${topicName}/subscriptions`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const subs = res.json().subscriptions;
		expect(subs.length).toBeGreaterThanOrEqual(1);
		// Capture subscriptionArn for subsequent tests
		subscriptionArn = subs[0].subscriptionArn;
	});

	it("should get subscription attributes", async () => {
		if (!subscriptionArn || subscriptionArn === "PendingConfirmation") return;
		const res = await app.inject({
			method: "GET",
			url: `/subscriptions/${encodeURIComponent(subscriptionArn)}/attributes`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().subscription).toHaveProperty("protocol");
	});

	it("should set subscription filter policy", async () => {
		if (!subscriptionArn || subscriptionArn === "PendingConfirmation") return;
		const res = await app.inject({
			method: "PUT",
			url: `/subscriptions/${encodeURIComponent(subscriptionArn)}/filter-policy`,
			headers,
			payload: { filterPolicy: JSON.stringify({ event: ["order_placed"] }) },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should list subscriptions by endpoint", async () => {
		const region = headers["x-localstack-region"];
		const endpoint = `arn:aws:sqs:${region}:000000000000:dummy-queue`;
		const res = await app.inject({
			method: "GET",
			url: `/subscriptions/by-endpoint?endpoint=${encodeURIComponent(endpoint)}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("subscriptions");
	});

	it("should publish a message", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${topicName}/publish`,
			headers,
			payload: { message: "Hello SNS" },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json()).toHaveProperty("messageId");
	});

	it("should publish a batch of messages", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${topicName}/publish-batch`,
			headers,
			payload: {
				entries: [
					{ id: "1", message: "Batch msg 1" },
					{ id: "2", message: "Batch msg 2" },
				],
			},
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().successful.length).toBe(2);
	});

	it("should delete subscription", async () => {
		if (!subscriptionArn || subscriptionArn === "PendingConfirmation") return;
		const res = await app.inject({
			method: "DELETE",
			url: `/subscriptions/${encodeURIComponent(subscriptionArn)}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should delete the topic", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${topicName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
