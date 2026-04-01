import type { FastifyInstance } from "fastify";
import { ErrorResponseSchema } from "../../shared/types.js";
import {
	BatchGetBodySchema,
	BatchGetResponseSchema,
	BatchWriteBodySchema,
	BatchWriteResponseSchema,
	type CreateGSIBody,
	CreateGSIBodySchema,
	type CreateTableBody,
	CreateTableBodySchema,
	DeleteItemBodySchema,
	DeleteResponseSchema,
	GetItemBodySchema,
	IndexParamsSchema,
	ItemsResponseSchema,
	MessageResponseSchema,
	// PartiQL schemas
	PartiQLBodySchema,
	PartiQLResponseSchema,
	PutItemBodySchema,
	type QueryBody,
	QueryBodySchema,
	type ScanBody,
	// Item schemas
	ScanBodySchema,
	// Stream schemas
	StreamDescriptionSchema,
	StreamQuerySchema,
	StreamRecordsResponseSchema,
	TableDetailResponseSchema,
	TableListResponseSchema,
	TableParamsSchema,
} from "./schemas.js";
import { DynamoDBService } from "./service.js";

export async function dynamodbRoutes(app: FastifyInstance) {
	// --- Table routes ---

	// List tables
	app.get("/", {
		schema: {
			response: { 200: TableListResponseSchema },
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			return service.listTables();
		},
	});

	// Create table
	app.post("/", {
		schema: {
			body: CreateTableBodySchema,
			response: {
				201: MessageResponseSchema,
				409: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const result = await service.createTable(request.body as CreateTableBody);
			return reply.status(201).send(result);
		},
	});

	// Describe table
	app.get("/:tableName", {
		schema: {
			params: TableParamsSchema,
			response: {
				200: TableDetailResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			return service.describeTable(tableName);
		},
	});

	// Delete table
	app.delete("/:tableName", {
		schema: {
			params: TableParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			return service.deleteTable(tableName);
		},
	});

	// --- Index routes ---

	// Create GSI
	app.post("/:tableName/indexes", {
		schema: {
			params: TableParamsSchema,
			body: CreateGSIBodySchema,
			response: {
				201: MessageResponseSchema,
				404: ErrorResponseSchema,
				409: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const result = await service.createGSI(
				tableName,
				request.body as CreateGSIBody,
			);
			return reply.status(201).send(result);
		},
	});

	// Delete GSI
	app.delete("/:tableName/indexes/:indexName", {
		schema: {
			params: IndexParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName, indexName } = request.params as {
				tableName: string;
				indexName: string;
			};
			return service.deleteGSI(tableName, indexName);
		},
	});

	// --- Item routes ---

	// Scan items
	app.post("/:tableName/items/scan", {
		schema: {
			params: TableParamsSchema,
			body: ScanBodySchema,
			response: {
				200: ItemsResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			return service.scanItems(tableName, request.body as ScanBody);
		},
	});

	// Query items
	app.post("/:tableName/items/query", {
		schema: {
			params: TableParamsSchema,
			body: QueryBodySchema,
			response: {
				200: ItemsResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			return service.queryItems(tableName, request.body as QueryBody);
		},
	});

	// Get item
	app.post("/:tableName/items/get", {
		schema: {
			params: TableParamsSchema,
			body: GetItemBodySchema,
			response: {
				200: ItemsResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { key } = request.body as { key: Record<string, unknown> };
			return service.getItem(tableName, key);
		},
	});

	// Put item
	app.post("/:tableName/items", {
		schema: {
			params: TableParamsSchema,
			body: PutItemBodySchema,
			response: {
				201: MessageResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { item } = request.body as { item: Record<string, unknown> };
			const result = await service.putItem(tableName, item);
			return reply.status(201).send(result);
		},
	});

	// Delete item
	app.delete("/:tableName/items", {
		schema: {
			params: TableParamsSchema,
			body: DeleteItemBodySchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { key } = request.body as { key: Record<string, unknown> };
			return service.deleteItem(tableName, key);
		},
	});

	// Batch write
	app.post("/:tableName/items/batch-write", {
		schema: {
			params: TableParamsSchema,
			body: BatchWriteBodySchema,
			response: {
				200: BatchWriteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { putItems, deleteKeys } = request.body as {
				putItems?: Record<string, unknown>[];
				deleteKeys?: Record<string, unknown>[];
			};
			return service.batchWriteItems(tableName, putItems, deleteKeys);
		},
	});

	// Batch get
	app.post("/:tableName/items/batch-get", {
		schema: {
			params: TableParamsSchema,
			body: BatchGetBodySchema,
			response: {
				200: BatchGetResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { keys, projectionExpression } = request.body as {
				keys: Record<string, unknown>[];
				projectionExpression?: string;
			};
			return service.batchGetItems(tableName, keys, projectionExpression);
		},
	});

	// --- PartiQL routes ---

	// Execute PartiQL statement
	app.post("/partiql", {
		schema: {
			body: PartiQLBodySchema,
			response: {
				200: PartiQLResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { statement, parameters } = request.body as {
				statement: string;
				parameters?: unknown[];
			};
			return service.executePartiQL(statement, parameters);
		},
	});

	// --- Stream routes ---

	// Describe stream
	app.get("/:tableName/streams", {
		schema: {
			params: TableParamsSchema,
			response: {
				200: StreamDescriptionSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			return service.describeStream(tableName);
		},
	});

	// Get stream records
	app.get("/:tableName/streams/records", {
		schema: {
			params: TableParamsSchema,
			querystring: StreamQuerySchema,
			response: {
				200: StreamRecordsResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new DynamoDBService(
				clients.dynamodb,
				clients.dynamodbDocument,
				clients.dynamodbStreams,
			);
			const { tableName } = request.params as { tableName: string };
			const { shardId, limit } = request.query as {
				shardId?: string;
				limit?: number;
			};
			return service.getStreamRecords(tableName, shardId, limit);
		},
	});
}
