import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cloudformationRoutes } from "../../src/plugins/cloudformation/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("CloudFormation Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const stackName = `test-stack-${Date.now()}`;

	const simpleTemplate = JSON.stringify({
		AWSTemplateFormatVersion: "2010-09-09",
		Description: "Test stack",
		Resources: {
			TestQueue: {
				Type: "AWS::SQS::Queue",
				Properties: {
					QueueName: `cfn-queue-${Date.now()}`,
				},
			},
		},
	});

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(cloudformationRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list stacks", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("stacks");
	});

	it("should create a stack", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: { stackName, templateBody: simpleTemplate },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("creation initiated");
		expect(res.json().stackId).toBeDefined();
	});

	it("should describe the stack", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${stackName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.stackName).toBe(stackName);
		expect(body).toHaveProperty("resources");
	});

	it("should get stack events", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${stackName}/events`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().events.length).toBeGreaterThanOrEqual(1);
	});

	it("should get stack template", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${stackName}/template`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().templateBody).toBeDefined();
	});

	it("should update the stack", async () => {
		const updatedTemplate = JSON.stringify({
			AWSTemplateFormatVersion: "2010-09-09",
			Description: "Updated test stack",
			Resources: {
				TestQueue: {
					Type: "AWS::SQS::Queue",
					Properties: {
						QueueName: `cfn-queue-updated-${Date.now()}`,
					},
				},
			},
		});
		const res = await app.inject({
			method: "PUT",
			url: `/${stackName}`,
			headers,
			payload: { stackName, templateBody: updatedTemplate },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().message).toContain("update initiated");
	});

	it("should delete the stack", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${stackName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
