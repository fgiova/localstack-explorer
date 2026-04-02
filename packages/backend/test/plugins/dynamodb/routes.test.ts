import Fastify, { type FastifyInstance } from "fastify";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { ClientCache } from "../../../src/aws/client-cache.js";
import { dynamodbRoutes } from "../../../src/plugins/dynamodb/routes.js";
import { registerErrorHandler } from "../../../src/shared/errors.js";

interface MockDynamoDBService {
	listTables: Mock;
	describeTable: Mock;
	createTable: Mock;
	deleteTable: Mock;
	createGSI: Mock;
	deleteGSI: Mock;
	scanItems: Mock;
	queryItems: Mock;
	getItem: Mock;
	putItem: Mock;
	deleteItem: Mock;
	batchWriteItems: Mock;
	batchGetItems: Mock;
	executePartiQL: Mock;
	describeStream: Mock;
	getStreamRecords: Mock;
}

function createMockDynamoDBService(): MockDynamoDBService {
	return {
		listTables: vi.fn().mockResolvedValue({ tables: [] }),
		describeTable: vi.fn().mockResolvedValue({
			tableName: "test-table",
			tableStatus: "ACTIVE",
			keySchema: [{ attributeName: "id", keyType: "HASH" }],
			attributeDefinitions: [{ attributeName: "id", attributeType: "S" }],
		}),
		createTable: vi.fn().mockResolvedValue({ message: "Table created successfully" }),
		deleteTable: vi.fn().mockResolvedValue({ success: true }),
		createGSI: vi.fn().mockResolvedValue({ message: "GSI creation initiated" }),
		deleteGSI: vi.fn().mockResolvedValue({ success: true }),
		scanItems: vi.fn().mockResolvedValue({ items: [], count: 0, scannedCount: 0 }),
		queryItems: vi.fn().mockResolvedValue({ items: [], count: 0, scannedCount: 0 }),
		getItem: vi.fn().mockResolvedValue({ items: [], count: 0, scannedCount: 0 }),
		putItem: vi.fn().mockResolvedValue({ message: "Item saved successfully" }),
		deleteItem: vi.fn().mockResolvedValue({ success: true }),
		batchWriteItems: vi.fn().mockResolvedValue({ processedCount: 0, unprocessedCount: 0 }),
		batchGetItems: vi.fn().mockResolvedValue({ items: [] }),
		executePartiQL: vi.fn().mockResolvedValue({ items: [] }),
		describeStream: vi.fn().mockResolvedValue({
			streamArn: "arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000",
			streamLabel: "2024-01-01T00:00:00.000",
			streamStatus: "ENABLED",
			streamViewType: "NEW_AND_OLD_IMAGES",
			shards: [
				{
					shardId: "shardId-000000000001",
					sequenceNumberRange: {
						startingSequenceNumber: "100",
					},
				},
			],
		}),
		getStreamRecords: vi.fn().mockResolvedValue({
			records: [
				{
					eventID: "event-1",
					eventName: "INSERT",
					eventSource: "aws:dynamodb",
					dynamodb: {
						keys: { id: "item-1" },
						newImage: { id: "item-1", value: "test" },
						sequenceNumber: "100",
						sizeBytes: 26,
						streamViewType: "NEW_AND_OLD_IMAGES",
					},
				},
			],
			nextShardIterator: "next-iterator-token",
		}),
	};
}

vi.mock("../../../src/plugins/dynamodb/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../../src/plugins/dynamodb/service.js")
		>();
	return {
		...actual,
		DynamoDBService: vi.fn(),
	};
});

import { DynamoDBService as DynamoDBServiceClass } from "../../../src/plugins/dynamodb/service.js";

describe("DynamoDB Routes - Stream endpoints", () => {
	let app: FastifyInstance;
	let mockService: MockDynamoDBService;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockDynamoDBService();

		(DynamoDBServiceClass as unknown as Mock).mockImplementation(
			() => mockService,
		);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({
				dynamodb: {},
				dynamodbDocument: {},
				dynamodbStreams: {},
			}),
		};
		app.decorate("clientCache", mockClientCache as unknown as ClientCache);

		app.decorateRequest("localstackConfig", null);
		app.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		await app.register(dynamodbRoutes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("DELETE /:tableName/indexes/:indexName (deleteGSI)", () => {
		it("should delete a GSI and return success", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-table/indexes/my-index",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
			expect(mockService.deleteGSI).toHaveBeenCalledWith(
				"test-table",
				"my-index",
			);
		});
	});

	describe("GET /:tableName/streams (describeStream)", () => {
		it("should return stream description for a table", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-table/streams",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				streamArn: string;
				streamStatus: string;
				shards: Array<{ shardId: string }>;
			}>();
			expect(body.streamArn).toContain("test-table");
			expect(body.streamStatus).toBe("ENABLED");
			expect(body.shards).toHaveLength(1);
			expect(body.shards[0].shardId).toBe("shardId-000000000001");
			expect(mockService.describeStream).toHaveBeenCalledWith("test-table");
		});
	});

	describe("GET /:tableName/streams/records (getStreamRecords)", () => {
		it("should return stream records for a table", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-table/streams/records",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				records: Array<{ eventID: string; eventName: string }>;
				nextShardIterator: string;
			}>();
			expect(body.records).toHaveLength(1);
			expect(body.records[0].eventID).toBe("event-1");
			expect(body.records[0].eventName).toBe("INSERT");
			expect(body.nextShardIterator).toBe("next-iterator-token");
			expect(mockService.getStreamRecords).toHaveBeenCalledWith(
				"test-table",
				undefined,
				undefined,
			);
		});

		it("should pass shardId and limit query params to service", async () => {
			mockService.getStreamRecords.mockClear();
			await app.inject({
				method: "GET",
				url: "/test-table/streams/records?shardId=shardId-000000000001&limit=10",
			});
			expect(mockService.getStreamRecords).toHaveBeenCalledWith(
				"test-table",
				"shardId-000000000001",
				10,
			);
		});
	});
});
