import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";
import { DynamoDBService } from "../../../src/plugins/dynamodb/service.js";
import { AppError } from "../../../src/shared/errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClients() {
	const client = { send: vi.fn() } as unknown as DynamoDBClient;
	const docClient = { send: vi.fn() } as unknown as DynamoDBDocumentClient;
	const streamsClient = {
		send: vi.fn(),
	} as unknown as DynamoDBStreamsClient;
	return { client, docClient, streamsClient };
}

function makeService(
	client: DynamoDBClient,
	docClient: DynamoDBDocumentClient,
	streamsClient: DynamoDBStreamsClient,
) {
	return new DynamoDBService(client, docClient, streamsClient);
}

function namedError(name: string, message = "error") {
	const err = new Error(message) as Error & { name: string };
	err.name = name;
	return err;
}

// ---------------------------------------------------------------------------
// handleError (tested indirectly via method calls)
// ---------------------------------------------------------------------------

describe("handleError (via method delegation)", () => {
	it("re-throws AppError as-is", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);
		const original = new AppError("custom", 422, "CUSTOM");
		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(original);

		await expect(service.listTables()).rejects.toBe(original);
	});

	it("converts ResourceNotFoundException to AppError 404 TABLE_NOT_FOUND", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);
		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException", "Table not found"),
		);

		await expect(service.listTables()).rejects.toMatchObject({
			statusCode: 404,
			code: "TABLE_NOT_FOUND",
		});
	});

	it("converts ResourceInUseException to AppError 409 TABLE_IN_USE", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);
		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceInUseException", "Table in use"),
		);

		await expect(service.listTables()).rejects.toMatchObject({
			statusCode: 409,
			code: "TABLE_IN_USE",
		});
	});

	it("converts LimitExceededException to AppError 429 LIMIT_EXCEEDED", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);
		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("LimitExceededException", "Limit exceeded"),
		);

		await expect(service.listTables()).rejects.toMatchObject({
			statusCode: 429,
			code: "LIMIT_EXCEEDED",
		});
	});

	it("re-throws unknown errors without wrapping", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);
		const unknown = new TypeError("something unexpected");
		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(unknown);

		await expect(service.listTables()).rejects.toBe(unknown);
	});
});

// ---------------------------------------------------------------------------
// listTables
// ---------------------------------------------------------------------------

describe("listTables", () => {
	it("returns table summaries for all tables", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		// First call: ListTablesCommand
		sendMock.mockResolvedValueOnce({ TableNames: ["table-a", "table-b"] });
		// Describe calls for each table
		sendMock.mockResolvedValueOnce({
			Table: {
				TableName: "table-a",
				TableStatus: "ACTIVE",
				ItemCount: 10,
				TableSizeBytes: 1024,
			},
		});
		sendMock.mockResolvedValueOnce({
			Table: {
				TableName: "table-b",
				TableStatus: "CREATING",
				ItemCount: 0,
				TableSizeBytes: 0,
			},
		});

		const result = await service.listTables();

		expect(result).toEqual({
			tables: [
				{
					tableName: "table-a",
					tableStatus: "ACTIVE",
					itemCount: 10,
					tableSizeBytes: 1024,
				},
				{
					tableName: "table-b",
					tableStatus: "CREATING",
					itemCount: 0,
					tableSizeBytes: 0,
				},
			],
		});
	});

	it("handles empty table list", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			TableNames: [],
		});

		const result = await service.listTables();
		expect(result).toEqual({ tables: [] });
	});

	it("uses fallback values when table description fields are missing", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({ TableNames: ["table-x"] });
		// Table with no TableName/TableStatus in Table object
		sendMock.mockResolvedValueOnce({ Table: {} });

		const result = await service.listTables();
		expect(result?.tables[0]).toMatchObject({
			tableName: "table-x",
			tableStatus: "UNKNOWN",
		});
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(service.listTables()).rejects.toMatchObject({
			statusCode: 404,
		});
	});
});

// ---------------------------------------------------------------------------
// describeTable
// ---------------------------------------------------------------------------

describe("describeTable", () => {
	it("returns full table details including GSI, LSI, streamSpec and provisionedThroughput", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const now = new Date("2024-01-01T00:00:00Z");
		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: {
				TableName: "my-table",
				TableStatus: "ACTIVE",
				TableArn: "arn:aws:dynamodb:us-east-1:000000000000:table/my-table",
				CreationDateTime: now,
				ItemCount: 5,
				TableSizeBytes: 512,
				LatestStreamArn:
					"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts",
				KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
				AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
				ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
				GlobalSecondaryIndexes: [
					{
						IndexName: "gsi-1",
						KeySchema: [{ AttributeName: "sk", KeyType: "RANGE" }],
						Projection: { ProjectionType: "ALL", NonKeyAttributes: ["attr1"] },
						ProvisionedThroughput: {
							ReadCapacityUnits: 2,
							WriteCapacityUnits: 2,
						},
						IndexStatus: "ACTIVE",
						ItemCount: 3,
					},
				],
				LocalSecondaryIndexes: [
					{
						IndexName: "lsi-1",
						KeySchema: [{ AttributeName: "lsk", KeyType: "RANGE" }],
						Projection: { ProjectionType: "KEYS_ONLY" },
					},
				],
				StreamSpecification: {
					StreamEnabled: true,
					StreamViewType: "NEW_AND_OLD_IMAGES",
				},
			},
		});

		const result = await service.describeTable("my-table");

		expect(result).toMatchObject({
			tableName: "my-table",
			tableStatus: "ACTIVE",
			tableArn: "arn:aws:dynamodb:us-east-1:000000000000:table/my-table",
			creationDateTime: now.toISOString(),
			itemCount: 5,
			tableSizeBytes: 512,
			latestStreamArn:
				"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
			provisionedThroughput: { readCapacityUnits: 5, writeCapacityUnits: 5 },
			globalSecondaryIndexes: [
				{
					indexName: "gsi-1",
					keySchema: [{ attributeName: "sk", keyType: "RANGE" }],
					projection: { projectionType: "ALL", nonKeyAttributes: ["attr1"] },
					provisionedThroughput: {
						readCapacityUnits: 2,
						writeCapacityUnits: 2,
					},
					indexStatus: "ACTIVE",
					itemCount: 3,
				},
			],
			localSecondaryIndexes: [
				{
					indexName: "lsi-1",
					keySchema: [{ attributeName: "lsk", keyType: "RANGE" }],
					projection: { projectionType: "KEYS_ONLY" },
				},
			],
			streamSpecification: {
				streamEnabled: true,
				streamViewType: "NEW_AND_OLD_IMAGES",
			},
		});
	});

	it("throws AppError 404 TABLE_NOT_FOUND when Table is null/undefined", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: undefined,
		});

		await expect(service.describeTable("missing")).rejects.toMatchObject({
			statusCode: 404,
			code: "TABLE_NOT_FOUND",
		});
	});

	it("uses fallback values for missing optional fields", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: {
				// no TableName, TableStatus, ProvisionedThroughput, GSI, LSI, streamSpec
				KeySchema: [],
				AttributeDefinitions: [],
			},
		});

		const result = await service.describeTable("fallback-table");
		expect(result).toMatchObject({
			tableName: "fallback-table",
			tableStatus: "UNKNOWN",
			keySchema: [],
			attributeDefinitions: [],
			provisionedThroughput: undefined,
			globalSecondaryIndexes: undefined,
			localSecondaryIndexes: undefined,
			streamSpecification: undefined,
		});
	});

	it("returns undefined provisionedThroughput for GSI when not set", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: {
				TableName: "my-table",
				TableStatus: "ACTIVE",
				KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
				AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
				GlobalSecondaryIndexes: [
					{
						IndexName: "gsi-no-throughput",
						KeySchema: [{ AttributeName: "sk", KeyType: "HASH" }],
						Projection: { ProjectionType: "ALL" },
						// ProvisionedThroughput intentionally absent
					},
				],
			},
		});

		const result = await service.describeTable("my-table");
		expect(
			result?.globalSecondaryIndexes?.[0].provisionedThroughput,
		).toBeUndefined();
	});

	it("uses 'ALL' as projectionType fallback when Projection is undefined on GSI", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: {
				TableName: "my-table",
				TableStatus: "ACTIVE",
				KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
				AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
				GlobalSecondaryIndexes: [
					{
						IndexName: "gsi-no-projection",
						KeySchema: [{ AttributeName: "sk", KeyType: "HASH" }],
						// Projection intentionally absent — triggers ?? "ALL" branch
						IndexStatus: "ACTIVE",
					},
				],
			},
		});

		const result = await service.describeTable("my-table");
		expect(result?.globalSecondaryIndexes?.[0].projection.projectionType).toBe(
			"ALL",
		);
	});
});

// ---------------------------------------------------------------------------
// createTable
// ---------------------------------------------------------------------------

describe("createTable", () => {
	it("creates a basic table successfully", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.createTable({
			tableName: "new-table",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
		});

		expect(result).toEqual({ message: "Table created successfully" });
	});

	it("creates a table with default provisioned throughput when not specified", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({});

		await service.createTable({
			tableName: "new-table",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
		});

		const callArg = sendMock.mock.calls[0][0];
		expect(callArg.input.ProvisionedThroughput).toEqual({
			ReadCapacityUnits: 5,
			WriteCapacityUnits: 5,
		});
	});

	it("creates a table with GSIs", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.createTable({
			tableName: "new-table",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [
				{ attributeName: "pk", attributeType: "S" },
				{ attributeName: "sk", attributeType: "S" },
			],
			globalSecondaryIndexes: [
				{
					indexName: "gsi-1",
					keySchema: [{ attributeName: "sk", keyType: "HASH" }],
					projection: { projectionType: "ALL" },
					provisionedThroughput: {
						readCapacityUnits: 3,
						writeCapacityUnits: 3,
					},
				},
			],
		});

		expect(result).toEqual({ message: "Table created successfully" });
	});

	it("creates a table with GSIs using default provisioned throughput", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({});

		await service.createTable({
			tableName: "new-table",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
			globalSecondaryIndexes: [
				{
					indexName: "gsi-1",
					keySchema: [{ attributeName: "sk", keyType: "HASH" }],
					projection: { projectionType: "ALL" },
					// no provisionedThroughput – should default to 5/5
				},
			],
		});

		const callArg = sendMock.mock.calls[0][0];
		expect(
			callArg.input.GlobalSecondaryIndexes[0].ProvisionedThroughput,
		).toEqual({ ReadCapacityUnits: 5, WriteCapacityUnits: 5 });
	});

	it("creates a table with LSIs", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.createTable({
			tableName: "new-table",
			keySchema: [{ attributeName: "pk", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
			localSecondaryIndexes: [
				{
					indexName: "lsi-1",
					keySchema: [{ attributeName: "lsk", keyType: "RANGE" }],
					projection: { projectionType: "KEYS_ONLY" },
				},
			],
		});

		expect(result).toEqual({ message: "Table created successfully" });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceInUseException"),
		);

		await expect(
			service.createTable({
				tableName: "new-table",
				keySchema: [{ attributeName: "pk", keyType: "HASH" }],
				attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
			}),
		).rejects.toMatchObject({ statusCode: 409, code: "TABLE_IN_USE" });
	});
});

// ---------------------------------------------------------------------------
// deleteTable
// ---------------------------------------------------------------------------

describe("deleteTable", () => {
	it("deletes a table successfully", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.deleteTable("my-table");
		expect(result).toEqual({ success: true });
	});

	it("propagates ResourceNotFoundException as AppError 404", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(service.deleteTable("ghost-table")).rejects.toMatchObject({
			statusCode: 404,
			code: "TABLE_NOT_FOUND",
		});
	});
});

// ---------------------------------------------------------------------------
// scanItems
// ---------------------------------------------------------------------------

describe("scanItems", () => {
	it("returns scanned items with all response fields", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Items: [{ pk: "1", name: "Alice" }],
			Count: 1,
			ScannedCount: 2,
			LastEvaluatedKey: { pk: "1" },
		});

		const result = await service.scanItems("my-table", {
			indexName: "gsi-1",
			filterExpression: "#n = :v",
			expressionAttributeNames: { "#n": "name" },
			expressionAttributeValues: { ":v": "Alice" },
			limit: 10,
			exclusiveStartKey: { pk: "0" },
			projectionExpression: "pk, name",
		});

		expect(result).toEqual({
			items: [{ pk: "1", name: "Alice" }],
			count: 1,
			scannedCount: 2,
			lastEvaluatedKey: { pk: "1" },
		});
	});

	it("returns empty result when no items found", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Items: [],
			Count: 0,
			ScannedCount: 0,
		});

		const result = await service.scanItems("my-table");
		expect(result).toEqual({
			items: [],
			count: 0,
			scannedCount: 0,
			lastEvaluatedKey: undefined,
		});
	});

	it("uses zero-fallbacks when Count/ScannedCount are absent", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.scanItems("my-table");
		expect(result).toEqual({
			items: [],
			count: 0,
			scannedCount: 0,
			lastEvaluatedKey: undefined,
		});
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(service.scanItems("my-table")).rejects.toMatchObject({
			statusCode: 404,
			code: "TABLE_NOT_FOUND",
		});
	});
});

// ---------------------------------------------------------------------------
// queryItems
// ---------------------------------------------------------------------------

describe("queryItems", () => {
	it("returns queried items with all options", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Items: [{ pk: "1", sk: "A" }],
			Count: 1,
			ScannedCount: 1,
			LastEvaluatedKey: { pk: "1", sk: "A" },
		});

		const result = await service.queryItems("my-table", {
			keyConditionExpression: "pk = :pk",
			indexName: "gsi-1",
			filterExpression: "#s = :s",
			expressionAttributeNames: { "#s": "status" },
			expressionAttributeValues: { ":pk": "1", ":s": "active" },
			limit: 5,
			exclusiveStartKey: { pk: "0" },
			projectionExpression: "pk, sk",
			scanIndexForward: false,
		});

		expect(result).toEqual({
			items: [{ pk: "1", sk: "A" }],
			count: 1,
			scannedCount: 1,
			lastEvaluatedKey: { pk: "1", sk: "A" },
		});
	});

	it("returns defaults when response fields are absent", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.queryItems("my-table", {
			keyConditionExpression: "pk = :pk",
		});

		expect(result).toEqual({
			items: [],
			count: 0,
			scannedCount: 0,
			lastEvaluatedKey: undefined,
		});
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.queryItems("my-table", { keyConditionExpression: "pk = :pk" }),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// getItem
// ---------------------------------------------------------------------------

describe("getItem", () => {
	it("returns item when found", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Item: { pk: "1", name: "Alice" },
		});

		const result = await service.getItem("my-table", { pk: "1" });
		expect(result).toEqual({
			items: [{ pk: "1", name: "Alice" }],
			count: 1,
			scannedCount: 1,
		});
	});

	it("returns empty result when item not found", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Item: undefined,
		});

		const result = await service.getItem("my-table", { pk: "ghost" });
		expect(result).toEqual({ items: [], count: 0, scannedCount: 0 });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.getItem("my-table", { pk: "1" }),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// putItem
// ---------------------------------------------------------------------------

describe("putItem", () => {
	it("saves item and returns success message", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.putItem("my-table", { pk: "1", name: "Bob" });
		expect(result).toEqual({ message: "Item saved successfully" });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("LimitExceededException"),
		);

		await expect(
			service.putItem("my-table", { pk: "1" }),
		).rejects.toMatchObject({ statusCode: 429, code: "LIMIT_EXCEEDED" });
	});
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
	it("deletes item and returns success", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.deleteItem("my-table", { pk: "1" });
		expect(result).toEqual({ success: true });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.deleteItem("my-table", { pk: "1" }),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// batchWriteItems
// ---------------------------------------------------------------------------

describe("batchWriteItems", () => {
	it("processes putItems and deleteKeys in a single batch", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			UnprocessedItems: {},
		});

		const result = await service.batchWriteItems(
			"my-table",
			[{ pk: "1" }, { pk: "2" }],
			[{ pk: "3" }],
		);

		expect(result).toEqual({ processedCount: 3, unprocessedCount: 0 });
	});

	it("handles unprocessed items correctly", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			UnprocessedItems: {
				"my-table": [{ PutRequest: { Item: { pk: "1" } } }],
			},
		});

		const result = await service.batchWriteItems("my-table", [
			{ pk: "1" },
			{ pk: "2" },
		]);

		expect(result).toEqual({ processedCount: 1, unprocessedCount: 1 });
	});

	it("splits large batches (>25 items) into multiple requests", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = docClient.send as ReturnType<typeof vi.fn>;
		// First batch of 25
		sendMock.mockResolvedValueOnce({ UnprocessedItems: {} });
		// Second batch of remaining 5
		sendMock.mockResolvedValueOnce({ UnprocessedItems: {} });

		const items = Array.from({ length: 30 }, (_, i) => ({ pk: String(i) }));
		const result = await service.batchWriteItems("my-table", items);

		expect(sendMock).toHaveBeenCalledTimes(2);
		expect(result).toEqual({ processedCount: 30, unprocessedCount: 0 });
	});

	it("returns zero counts when no items or keys provided", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		// No calls expected since requests array is empty – loop doesn't execute
		const result = await service.batchWriteItems("my-table");
		expect(result).toEqual({ processedCount: 0, unprocessedCount: 0 });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.batchWriteItems("my-table", [{ pk: "1" }]),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// batchGetItems
// ---------------------------------------------------------------------------

describe("batchGetItems", () => {
	it("retrieves items in a single batch", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Responses: { "my-table": [{ pk: "1" }, { pk: "2" }] },
			UnprocessedKeys: {},
		});

		const result = await service.batchGetItems("my-table", [
			{ pk: "1" },
			{ pk: "2" },
		]);

		expect(result).toEqual({
			items: [{ pk: "1" }, { pk: "2" }],
			unprocessedKeys: undefined,
		});
	});

	it("passes projectionExpression to the request when provided", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = docClient.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({
			Responses: { "my-table": [{ pk: "1" }] },
			UnprocessedKeys: {},
		});

		await service.batchGetItems("my-table", [{ pk: "1" }], "pk, name");

		const callArg = sendMock.mock.calls[0][0];
		expect(callArg.input.RequestItems["my-table"].ProjectionExpression).toBe(
			"pk, name",
		);
	});

	it("splits large batches (>100 keys) into multiple requests", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = docClient.send as ReturnType<typeof vi.fn>;
		// First batch of 100
		sendMock.mockResolvedValueOnce({
			Responses: {
				"my-table": Array.from({ length: 100 }, (_, i) => ({ pk: String(i) })),
			},
			UnprocessedKeys: {},
		});
		// Second batch of 10
		sendMock.mockResolvedValueOnce({
			Responses: {
				"my-table": Array.from({ length: 10 }, (_, i) => ({
					pk: String(100 + i),
				})),
			},
			UnprocessedKeys: {},
		});

		const keys = Array.from({ length: 110 }, (_, i) => ({ pk: String(i) }));
		const result = await service.batchGetItems("my-table", keys);

		expect(sendMock).toHaveBeenCalledTimes(2);
		expect(result?.items).toHaveLength(110);
		expect(result?.unprocessedKeys).toBeUndefined();
	});

	it("collects unprocessed keys from all batches", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Responses: { "my-table": [] },
			UnprocessedKeys: {
				"my-table": { Keys: [{ pk: "1" }] },
			},
		});

		const result = await service.batchGetItems("my-table", [{ pk: "1" }]);
		expect(result?.unprocessedKeys).toEqual([{ pk: "1" }]);
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(docClient.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.batchGetItems("my-table", [{ pk: "1" }]),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// createGSI
// ---------------------------------------------------------------------------

describe("createGSI", () => {
	it("initiates GSI creation with provisionedThroughput", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.createGSI("my-table", {
			indexName: "new-gsi",
			keySchema: [{ attributeName: "sk", keyType: "HASH" }],
			projection: { projectionType: "ALL" },
			provisionedThroughput: { readCapacityUnits: 10, writeCapacityUnits: 10 },
		});

		expect(result).toEqual({ message: "GSI 'new-gsi' creation initiated" });
	});

	it("uses default provisionedThroughput when not provided", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({});

		await service.createGSI("my-table", {
			indexName: "new-gsi",
			keySchema: [{ attributeName: "sk", keyType: "HASH" }],
			projection: { projectionType: "ALL" },
		});

		const callArg = sendMock.mock.calls[0][0];
		const create = callArg.input.GlobalSecondaryIndexUpdates[0].Create;
		expect(create.ProvisionedThroughput).toEqual({
			ReadCapacityUnits: 5,
			WriteCapacityUnits: 5,
		});
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.createGSI("my-table", {
				indexName: "new-gsi",
				keySchema: [{ attributeName: "sk", keyType: "HASH" }],
				projection: { projectionType: "ALL" },
			}),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// deleteGSI
// ---------------------------------------------------------------------------

describe("deleteGSI", () => {
	it("deletes GSI successfully", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

		const result = await service.deleteGSI("my-table", "old-gsi");
		expect(result).toEqual({ success: true });
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.deleteGSI("my-table", "old-gsi"),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// describeStream
// ---------------------------------------------------------------------------

describe("describeStream", () => {
	it("returns stream description with shards when stream ARN exists", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const streamArn =
			"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts";

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn, StreamSpecification: {} },
		});

		(streamsClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			StreamDescription: {
				StreamArn: streamArn,
				StreamLabel: "ts",
				StreamStatus: "ENABLED",
				StreamViewType: "NEW_AND_OLD_IMAGES",
				Shards: [
					{
						ShardId: "shard-0001",
						ParentShardId: undefined,
						SequenceNumberRange: {
							StartingSequenceNumber: "100",
							EndingSequenceNumber: "200",
						},
					},
				],
			},
		});

		const result = await service.describeStream("my-table");

		expect(result).toMatchObject({
			streamArn,
			streamLabel: "ts",
			streamStatus: "ENABLED",
			streamViewType: "NEW_AND_OLD_IMAGES",
			shards: [
				{
					shardId: "shard-0001",
					sequenceNumberRange: {
						startingSequenceNumber: "100",
						endingSequenceNumber: "200",
					},
				},
			],
		});
	});

	it("returns undefined fields when table has no stream ARN", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: {
				LatestStreamArn: undefined,
				StreamSpecification: { StreamViewType: "NEW_IMAGE" },
			},
		});

		const result = await service.describeStream("my-table");

		expect(result).toEqual({
			streamArn: undefined,
			streamLabel: undefined,
			streamStatus: undefined,
			streamViewType: "NEW_IMAGE",
			shards: undefined,
		});
		// streamsClient should NOT have been called
		expect(streamsClient.send).not.toHaveBeenCalled();
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(service.describeStream("my-table")).rejects.toMatchObject({
			statusCode: 404,
			code: "TABLE_NOT_FOUND",
		});
	});
});

// ---------------------------------------------------------------------------
// getStreamRecords
// ---------------------------------------------------------------------------

describe("getStreamRecords", () => {
	const streamArn =
		"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts";

	it("returns records with Keys, NewImage, and OldImage", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		// GetShardIterator
		streamsSendMock.mockResolvedValueOnce({
			ShardIterator: "iter-abc",
		});
		// GetRecords
		streamsSendMock.mockResolvedValueOnce({
			Records: [
				{
					eventID: "evt-1",
					eventName: "MODIFY",
					eventSource: "aws:dynamodb",
					dynamodb: {
						Keys: { pk: { S: "1" } },
						NewImage: { pk: { S: "1" }, name: { S: "Alice" } },
						OldImage: { pk: { S: "1" }, name: { S: "Bob" } },
						SequenceNumber: "100",
						SizeBytes: 64,
						StreamViewType: "NEW_AND_OLD_IMAGES",
					},
				},
			],
			NextShardIterator: "iter-xyz",
		});

		const result = await service.getStreamRecords("my-table", "shard-0001", 10);

		expect(result).toMatchObject({
			records: [
				{
					eventID: "evt-1",
					eventName: "MODIFY",
					eventSource: "aws:dynamodb",
					dynamodb: {
						keys: { pk: "1" },
						newImage: { pk: "1", name: "Alice" },
						oldImage: { pk: "1", name: "Bob" },
						sequenceNumber: "100",
						sizeBytes: 64,
						streamViewType: "NEW_AND_OLD_IMAGES",
					},
				},
			],
			nextShardIterator: "iter-xyz",
		});
	});

	it("throws AppError 404 STREAM_NOT_FOUND when no stream ARN", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: undefined },
		});

		await expect(
			service.getStreamRecords("my-table", "shard-0001"),
		).rejects.toMatchObject({ statusCode: 404, code: "STREAM_NOT_FOUND" });
	});

	it("uses the first shard when no shardId is provided", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		// DescribeStream (to get first shard)
		streamsSendMock.mockResolvedValueOnce({
			StreamDescription: {
				Shards: [{ ShardId: "shard-auto" }],
			},
		});
		// GetShardIterator
		streamsSendMock.mockResolvedValueOnce({ ShardIterator: "iter-auto" });
		// GetRecords
		streamsSendMock.mockResolvedValueOnce({
			Records: [],
			NextShardIterator: undefined,
		});

		const result = await service.getStreamRecords("my-table");
		expect(result).toEqual({ records: [], nextShardIterator: undefined });

		// Verify DescribeStream was called to auto-pick the shard
		expect(streamsSendMock.mock.calls[0][0].input).toMatchObject({
			StreamArn: streamArn,
		});
	});

	it("returns empty records when no shards are available", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		(streamsClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			StreamDescription: { Shards: [] },
		});

		// No shardId provided, and shards list is empty
		const result = await service.getStreamRecords("my-table");
		expect(result).toEqual({ records: [], nextShardIterator: undefined });
	});

	it("returns empty records when no shard iterator is returned", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		// GetShardIterator returns no iterator
		streamsSendMock.mockResolvedValueOnce({ ShardIterator: undefined });

		const result = await service.getStreamRecords("my-table", "shard-0001");
		expect(result).toEqual({ records: [], nextShardIterator: undefined });
	});

	it("handles records without dynamodb field", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		streamsSendMock.mockResolvedValueOnce({ ShardIterator: "iter-abc" });
		streamsSendMock.mockResolvedValueOnce({
			Records: [
				{ eventID: "evt-nodb", eventName: "INSERT", dynamodb: undefined },
			],
			NextShardIterator: undefined,
		});

		const result = await service.getStreamRecords("my-table", "shard-0001");
		expect(result?.records[0].dynamodb).toBeUndefined();
	});

	it("handles dynamodb record where Keys, NewImage, OldImage are absent", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		streamsSendMock.mockResolvedValueOnce({ ShardIterator: "iter-abc" });
		streamsSendMock.mockResolvedValueOnce({
			Records: [
				{
					eventID: "evt-partial",
					eventName: "REMOVE",
					dynamodb: {
						// Keys, NewImage, OldImage all absent
						SequenceNumber: "200",
						SizeBytes: 32,
						StreamViewType: "KEYS_ONLY",
					},
				},
			],
			NextShardIterator: undefined,
		});

		const result = await service.getStreamRecords("my-table", "shard-0001");
		expect(result?.records[0].dynamodb).toMatchObject({
			keys: undefined,
			newImage: undefined,
			oldImage: undefined,
			sequenceNumber: "200",
		});
	});
});

// ---------------------------------------------------------------------------
// executePartiQL
// ---------------------------------------------------------------------------

describe("executePartiQL", () => {
	it("executes a statement and returns unmarshalled items", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Items: [{ pk: { S: "1" }, name: { S: "Alice" } }],
		});

		const result = await service.executePartiQL(
			"SELECT * FROM my-table WHERE pk = ?",
		);

		expect(result?.items).toEqual([{ pk: "1", name: "Alice" }]);
	});

	it("maps string, number, boolean, and null parameters correctly", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({ Items: [] });

		await service.executePartiQL(
			"SELECT * FROM my-table WHERE pk = ? AND age = ? AND active = ? AND extra = ?",
			["value", 42, true, null],
		);

		const callArg = sendMock.mock.calls[0][0];
		expect(callArg.input.Parameters).toEqual([
			{ S: "value" },
			{ N: "42" },
			{ BOOL: true },
			{ NULL: true },
		]);
	});

	it("falls back to using the raw item when unmarshall fails", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		// An item that looks like a valid DynamoDB attribute map but will cause
		// unmarshall to throw because a key maps to an invalid descriptor.
		// We can simulate this by passing an object that causes unmarshall to throw.
		// Since `unmarshall` from @aws-sdk/util-dynamodb expects AttributeValue map,
		// passing a plain object with unknown type keys triggers an error in some SDK versions.
		// We monkey-patch by providing a value that genuinely makes unmarshall throw.
		const badItem = { pk: { UNKNOWN_TYPE: "x" } } as unknown as Record<
			string,
			import("@aws-sdk/client-dynamodb").AttributeValue
		>;
		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Items: [badItem],
		});

		// The service catches the unmarshall exception and returns the raw item
		const result = await service.executePartiQL("SELECT * FROM my-table");
		expect(result?.items[0]).toBe(badItem);
	});

	it("maps unknown-type parameters using String coercion", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({ Items: [] });

		const obj = { custom: "object" };
		await service.executePartiQL("SELECT * FROM t", [obj]);

		const callArg = sendMock.mock.calls[0][0];
		expect(callArg.input.Parameters).toEqual([{ S: String(obj) }]);
	});

	it("sends no Parameters when parameters array is empty", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		const sendMock = client.send as ReturnType<typeof vi.fn>;
		sendMock.mockResolvedValueOnce({ Items: [] });

		await service.executePartiQL("SELECT * FROM my-table", []);

		const callArg = sendMock.mock.calls[0][0];
		expect(callArg.input.Parameters).toBeUndefined();
	});

	it("propagates errors via handleError", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
			namedError("ResourceNotFoundException"),
		);

		await expect(
			service.executePartiQL("SELECT * FROM ghost-table"),
		).rejects.toMatchObject({ statusCode: 404, code: "TABLE_NOT_FOUND" });
	});

	it("returns empty items array when Items is undefined in response", async () => {
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			// Items intentionally absent
		});

		const result = await service.executePartiQL("SELECT * FROM my-table");
		expect(result?.items).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Additional branch coverage for describeStream and getStreamRecords
// ---------------------------------------------------------------------------

describe("describeStream - shard ShardId undefined branch", () => {
	it("uses empty string for shardId when ShardId is undefined in shard", async () => {
		const streamArn =
			"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts";
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		(streamsClient.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			StreamDescription: {
				StreamArn: streamArn,
				StreamStatus: "ENABLED",
				Shards: [
					{
						// ShardId intentionally absent to trigger ?? "" branch
						ShardId: undefined,
						SequenceNumberRange: {},
					},
				],
			},
		});

		const result = await service.describeStream("my-table");
		expect(result?.shards?.[0].shardId).toBe("");
	});
});

describe("getStreamRecords - Records undefined branch", () => {
	it("returns empty records when Records is undefined in GetRecords response", async () => {
		const streamArn =
			"arn:aws:dynamodb:us-east-1:000000000000:table/my-table/stream/ts";
		const { client, docClient, streamsClient } = makeClients();
		const service = makeService(client, docClient, streamsClient);

		(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			Table: { LatestStreamArn: streamArn },
		});

		const streamsSendMock = streamsClient.send as ReturnType<typeof vi.fn>;
		streamsSendMock.mockResolvedValueOnce({ ShardIterator: "iter-abc" });
		streamsSendMock.mockResolvedValueOnce({
			// Records intentionally absent to trigger ?? [] branch
			NextShardIterator: undefined,
		});

		const result = await service.getStreamRecords("my-table", "shard-0001");
		expect(result?.records).toEqual([]);
	});
});
