import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dynamodbRoutes } from "../../src/plugins/dynamodb/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("DynamoDB Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const tableName = `test-table-${Date.now()}`;

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(dynamodbRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list tables", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("tables");
	});

	it("should create a table", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: {
				tableName,
				keySchema: [{ attributeName: "pk", keyType: "HASH" }],
				attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
				provisionedThroughput: { readCapacityUnits: 5, writeCapacityUnits: 5 },
			},
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should describe the table", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${tableName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.tableName).toBe(tableName);
		expect(body.keySchema).toHaveLength(1);
	});

	it("should put an item", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items`,
			headers,
			payload: { item: { pk: "user-1", name: "Alice", age: 30 } },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("saved");
	});

	it("should get an item", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items/get`,
			headers,
			payload: { key: { pk: "user-1" } },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.items).toHaveLength(1);
		expect(body.items[0].name).toBe("Alice");
	});

	it("should scan items", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items/scan`,
			headers,
			payload: {},
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.count).toBeGreaterThanOrEqual(1);
	});

	it("should query items", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items/query`,
			headers,
			payload: {
				keyConditionExpression: "pk = :pk",
				expressionAttributeValues: { ":pk": "user-1" },
			},
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.count).toBe(1);
	});

	it("should batch write items", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items/batch-write`,
			headers,
			payload: {
				putItems: [
					{ pk: "user-2", name: "Bob" },
					{ pk: "user-3", name: "Charlie" },
				],
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().processedCount).toBe(2);
	});

	it("should batch get items", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/items/batch-get`,
			headers,
			payload: {
				keys: [{ pk: "user-2" }, { pk: "user-3" }],
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().items).toHaveLength(2);
	});

	it("should execute PartiQL", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/partiql",
			headers,
			payload: {
				statement: `SELECT * FROM "${tableName}" WHERE pk = ?`,
				parameters: ["user-1"],
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().items).toHaveLength(1);
	});

	it("should delete an item", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${tableName}/items`,
			headers,
			payload: { key: { pk: "user-1" } },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should create a GSI", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${tableName}/indexes`,
			headers,
			payload: {
				indexName: "name-index",
				keySchema: [{ attributeName: "pk", keyType: "HASH" }],
				projection: { projectionType: "ALL" },
			},
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("GSI");
	});

	it("should delete the table", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${tableName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
