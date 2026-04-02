import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { iamRoutes } from "../../src/plugins/iam/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("IAM Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const userName = `test-user-${Date.now()}`;
	const groupName = `test-group-${Date.now()}`;
	let policyArn: string;

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(iamRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	// --- Users ---

	it("should list users", async () => {
		const res = await app.inject({ method: "GET", url: "/users", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("users");
	});

	it("should create a user", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/users",
			headers,
			payload: { userName },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should get user details", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/users/${userName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().userName).toBe(userName);
	});

	// --- Access Keys ---

	it("should create an access key", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/users/${userName}/access-keys`,
			headers,
		});
		expect(res.statusCode).toBe(201);
		const body = res.json();
		expect(body.accessKeyId).toBeDefined();
		expect(body.secretAccessKey).toBeDefined();
	});

	it("should list access keys", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/users/${userName}/access-keys`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().accessKeys.length).toBeGreaterThanOrEqual(1);
	});

	// --- Groups ---

	it("should create a group", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/groups",
			headers,
			payload: { groupName },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should list groups", async () => {
		const res = await app.inject({ method: "GET", url: "/groups", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json().groups.length).toBeGreaterThanOrEqual(1);
	});

	it("should add user to group", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/groups/${groupName}/members`,
			headers,
			payload: { userName },
		});
		expect(res.statusCode).toBe(200);
	});

	it("should list group members", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/groups/${groupName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(
			res
				.json()
				.members.some((m: { userName: string }) => m.userName === userName),
		).toBe(true);
	});

	it("should remove user from group", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/groups/${groupName}/members/${userName}`,
			headers,
		});

		expect(res.statusCode).toBe(200);
	});

	// --- Inline Policies ---

	it("should put a user inline policy", async () => {
		const policyDoc = JSON.stringify({
			Version: "2012-10-17",
			Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
		});
		const res = await app.inject({
			method: "PUT",
			url: `/users/${userName}/inline-policies/test-inline-policy`,
			headers,
			payload: { policyDocument: policyDoc },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().message).toContain("saved");
	});

	it("should list user inline policies", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/users/${userName}/inline-policies`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().policyNames).toContain("test-inline-policy");
	});

	it("should get user inline policy", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/users/${userName}/inline-policies/test-inline-policy`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().policyName).toBe("test-inline-policy");
	});

	it("should delete user inline policy", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/users/${userName}/inline-policies/test-inline-policy`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	// --- Managed Policies ---

	it("should create a managed policy and retrieve its ARN", async () => {
		const policyName = `test-policy-${Date.now()}`;
		const policyDoc = JSON.stringify({
			Version: "2012-10-17",
			Statement: [{ Effect: "Allow", Action: "s3:*", Resource: "*" }],
		});
		const createRes = await app.inject({
			method: "POST",
			url: "/policies",
			headers,
			payload: { policyName, policyDocument: policyDoc },
		});
		expect(createRes.statusCode).toBe(201);
		expect(createRes.json().message).toContain("created");

		// Retrieve ARN from the list
		const listRes = await app.inject({
			method: "GET",
			url: "/policies",
			headers,
		});
		expect(listRes.statusCode).toBe(200);
		const policy = listRes
			.json()
			.policies.find(
				(p: { policyName: string }) => p.policyName === policyName,
			);
		expect(policy).toBeDefined();
		policyArn = policy.arn;
	});

	it("should get managed policy details", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/policies/${encodeURIComponent(policyArn)}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().arn).toBe(policyArn);
	});

	it("should get managed policy document", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/policies/${encodeURIComponent(policyArn)}/document`,
			headers,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json().document).toBeDefined();
	});

	it("should attach policy to user", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/users/${userName}/attached-policies`,
			headers,
			payload: { policyArn },
		});
		expect(res.statusCode).toBe(200);
	});

	it("should list attached user policies", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/users/${userName}/attached-policies`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().attachedPolicies.length).toBeGreaterThanOrEqual(1);
	});

	it("should detach policy from user", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/users/${userName}/attached-policies/${encodeURIComponent(policyArn)}`,
			headers,
		});

		expect(res.statusCode).toBe(200);
	});

	// --- Cleanup ---

	it("should delete the managed policy", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/policies/${encodeURIComponent(policyArn)}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should delete the group", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/groups/${groupName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should delete the user", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/users/${userName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
