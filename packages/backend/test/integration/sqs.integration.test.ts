import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sqsRoutes } from "../../src/plugins/sqs/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("SQS Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const queueName = `test-queue-${Date.now()}`;

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(sqsRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list queues", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("queues");
	});

	it("should create a queue", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: { name: queueName },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should get queue attributes", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${queueName}/attributes`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.queueName).toBe(queueName);
		expect(body).toHaveProperty("approximateNumberOfMessages");
	});

	it("should send a message", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${queueName}/messages`,
			headers,
			payload: { body: "Hello from integration test" },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json()).toHaveProperty("messageId");
	});

	it("should receive a message", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${queueName}/messages?maxMessages=1&waitTimeSeconds=1`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.messages.length).toBeGreaterThanOrEqual(1);
		expect(body.messages[0].body).toBe("Hello from integration test");
	});

	it("should delete a message", async () => {
		// Receive first to get receipt handle
		const receiveRes = await app.inject({
			method: "GET",
			url: `/${queueName}/messages?maxMessages=1&waitTimeSeconds=1`,
			headers,
		});
		const { messages } = receiveRes.json();
		if (messages.length > 0) {
			const res = await app.inject({
				method: "DELETE",
				url: `/${queueName}/messages`,
				headers,
				payload: { receiptHandle: messages[0].receiptHandle },
			});
			expect(res.statusCode).toBe(200);
			expect(res.json()).toMatchObject({ success: true });
		}
	});

	it("should purge the queue", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${queueName}/purge`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should delete the queue", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${queueName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
