import {
	type AttributeDefinition,
	CreateTableCommand,
	DeleteTableCommand,
	DescribeTableCommand,
	type DynamoDBClient,
	ExecuteStatementCommand,
	type GlobalSecondaryIndex,
	type KeySchemaElement,
	ListTablesCommand,
	type LocalSecondaryIndex,
	UpdateTableCommand,
} from "@aws-sdk/client-dynamodb";
import {
	DescribeStreamCommand,
	type DynamoDBStreamsClient,
	GetRecordsCommand,
	GetShardIteratorCommand,
} from "@aws-sdk/client-dynamodb-streams";
import {
	BatchGetCommand,
	BatchWriteCommand,
	DeleteCommand,
	type DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { type NativeAttributeValue, unmarshall } from "@aws-sdk/util-dynamodb";
import { AppError } from "../../shared/errors.js";
import type {
	CreateGSIBody,
	CreateTableBody,
	QueryBody,
	ScanBody,
} from "./schemas.js";

export class DynamoDBService {
	constructor(
		private client: DynamoDBClient,
		private docClient: DynamoDBDocumentClient,
		private streamsClient: DynamoDBStreamsClient,
	) {}

	// --- Table operations ---

	async listTables() {
		try {
			const response = await this.client.send(new ListTablesCommand({}));
			const tableNames = response.TableNames ?? [];

			const tables = await Promise.all(
				tableNames.map(async (tableName) => {
					const desc = await this.client.send(
						new DescribeTableCommand({ TableName: tableName }),
					);
					return {
						tableName: desc.Table?.TableName ?? tableName,
						tableStatus: desc.Table?.TableStatus ?? "UNKNOWN",
						itemCount: desc.Table?.ItemCount,
						tableSizeBytes: desc.Table?.TableSizeBytes,
					};
				}),
			);

			return { tables };
		} catch (err) {
			this.handleError(err);
		}
	}

	async describeTable(tableName: string) {
		try {
			const response = await this.client.send(
				new DescribeTableCommand({ TableName: tableName }),
			);

			const table = response.Table;
			if (!table) {
				throw new AppError(
					`Table '${tableName}' not found`,
					404,
					"TABLE_NOT_FOUND",
				);
			}

			return {
				tableName: table.TableName ?? tableName,
				tableStatus: table.TableStatus ?? "UNKNOWN",
				tableArn: table.TableArn,
				creationDateTime: table.CreationDateTime?.toISOString(),
				keySchema: (table.KeySchema ?? []).map((ks) => ({
					attributeName: ks.AttributeName ?? "",
					keyType: ks.KeyType ?? "",
				})),
				attributeDefinitions: (table.AttributeDefinitions ?? []).map((ad) => ({
					attributeName: ad.AttributeName ?? "",
					attributeType: ad.AttributeType ?? "",
				})),
				provisionedThroughput: table.ProvisionedThroughput
					? {
							readCapacityUnits:
								table.ProvisionedThroughput.ReadCapacityUnits ?? 0,
							writeCapacityUnits:
								table.ProvisionedThroughput.WriteCapacityUnits ?? 0,
						}
					: undefined,
				globalSecondaryIndexes: table.GlobalSecondaryIndexes?.map((gsi) => ({
					indexName: gsi.IndexName ?? "",
					keySchema: (gsi.KeySchema ?? []).map((ks) => ({
						attributeName: ks.AttributeName ?? "",
						keyType: ks.KeyType ?? "",
					})),
					projection: {
						projectionType: gsi.Projection?.ProjectionType ?? "ALL",
						nonKeyAttributes: gsi.Projection?.NonKeyAttributes,
					},
					provisionedThroughput: gsi.ProvisionedThroughput
						? {
								readCapacityUnits:
									gsi.ProvisionedThroughput.ReadCapacityUnits ?? 0,
								writeCapacityUnits:
									gsi.ProvisionedThroughput.WriteCapacityUnits ?? 0,
							}
						: undefined,
					indexStatus: gsi.IndexStatus,
					itemCount: gsi.ItemCount,
				})),
				localSecondaryIndexes: table.LocalSecondaryIndexes?.map((lsi) => ({
					indexName: lsi.IndexName ?? "",
					keySchema: (lsi.KeySchema ?? []).map((ks) => ({
						attributeName: ks.AttributeName ?? "",
						keyType: ks.KeyType ?? "",
					})),
					projection: {
						projectionType: lsi.Projection?.ProjectionType ?? "ALL",
						nonKeyAttributes: lsi.Projection?.NonKeyAttributes,
					},
				})),
				streamSpecification: table.StreamSpecification
					? {
							streamEnabled: table.StreamSpecification.StreamEnabled ?? false,
							streamViewType: table.StreamSpecification.StreamViewType,
						}
					: undefined,
				itemCount: table.ItemCount,
				tableSizeBytes: table.TableSizeBytes,
				latestStreamArn: table.LatestStreamArn,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	async createTable(params: CreateTableBody) {
		try {
			const commandInput: ConstructorParameters<typeof CreateTableCommand>[0] =
				{
					TableName: params.tableName,
					KeySchema: params.keySchema.map((ks) => ({
						AttributeName: ks.attributeName,
						KeyType: ks.keyType,
					})) as KeySchemaElement[],
					AttributeDefinitions: params.attributeDefinitions.map((ad) => ({
						AttributeName: ad.attributeName,
						AttributeType: ad.attributeType,
					})) as AttributeDefinition[],
					ProvisionedThroughput: {
						ReadCapacityUnits:
							params.provisionedThroughput?.readCapacityUnits ?? 5,
						WriteCapacityUnits:
							params.provisionedThroughput?.writeCapacityUnits ?? 5,
					},
				};

			if (params.globalSecondaryIndexes) {
				commandInput.GlobalSecondaryIndexes = params.globalSecondaryIndexes.map(
					(gsi) => ({
						IndexName: gsi.indexName,
						KeySchema: gsi.keySchema.map((ks) => ({
							AttributeName: ks.attributeName,
							KeyType: ks.keyType,
						})) as KeySchemaElement[],
						Projection: {
							ProjectionType: gsi.projection.projectionType,
							NonKeyAttributes: gsi.projection.nonKeyAttributes,
						},
						ProvisionedThroughput: {
							ReadCapacityUnits:
								gsi.provisionedThroughput?.readCapacityUnits ?? 5,
							WriteCapacityUnits:
								gsi.provisionedThroughput?.writeCapacityUnits ?? 5,
						},
					}),
				) as GlobalSecondaryIndex[];
			}

			if (params.localSecondaryIndexes) {
				commandInput.LocalSecondaryIndexes = params.localSecondaryIndexes.map(
					(lsi) => ({
						IndexName: lsi.indexName,
						KeySchema: lsi.keySchema.map((ks) => ({
							AttributeName: ks.attributeName,
							KeyType: ks.keyType,
						})) as KeySchemaElement[],
						Projection: {
							ProjectionType: lsi.projection.projectionType,
							NonKeyAttributes: lsi.projection.nonKeyAttributes,
						},
					}),
				) as LocalSecondaryIndex[];
			}

			await this.client.send(new CreateTableCommand(commandInput));
			return { message: "Table created successfully" };
		} catch (err) {
			this.handleError(err);
		}
	}

	async deleteTable(tableName: string) {
		try {
			await this.client.send(new DeleteTableCommand({ TableName: tableName }));
			return { success: true };
		} catch (err) {
			this.handleError(err);
		}
	}

	// --- Item operations ---

	async scanItems(tableName: string, options?: ScanBody) {
		try {
			const response = await this.docClient.send(
				new ScanCommand({
					TableName: tableName,
					IndexName: options?.indexName,
					FilterExpression: options?.filterExpression,
					ExpressionAttributeNames: options?.expressionAttributeNames,
					ExpressionAttributeValues: options?.expressionAttributeValues as
						| Record<string, NativeAttributeValue>
						| undefined,
					Limit: options?.limit,
					ExclusiveStartKey: options?.exclusiveStartKey as
						| Record<string, NativeAttributeValue>
						| undefined,
					ProjectionExpression: options?.projectionExpression,
				}),
			);

			return {
				items: (response.Items ?? []) as Record<string, unknown>[],
				count: response.Count ?? 0,
				scannedCount: response.ScannedCount ?? 0,
				lastEvaluatedKey: response.LastEvaluatedKey as
					| Record<string, unknown>
					| undefined,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	async queryItems(tableName: string, options: QueryBody) {
		try {
			const response = await this.docClient.send(
				new QueryCommand({
					TableName: tableName,
					KeyConditionExpression: options.keyConditionExpression,
					IndexName: options.indexName,
					FilterExpression: options.filterExpression,
					ExpressionAttributeNames: options.expressionAttributeNames,
					ExpressionAttributeValues: options.expressionAttributeValues as
						| Record<string, NativeAttributeValue>
						| undefined,
					Limit: options.limit,
					ExclusiveStartKey: options.exclusiveStartKey as
						| Record<string, NativeAttributeValue>
						| undefined,
					ProjectionExpression: options.projectionExpression,
					ScanIndexForward: options.scanIndexForward,
				}),
			);

			return {
				items: (response.Items ?? []) as Record<string, unknown>[],
				count: response.Count ?? 0,
				scannedCount: response.ScannedCount ?? 0,
				lastEvaluatedKey: response.LastEvaluatedKey as
					| Record<string, unknown>
					| undefined,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	async getItem(tableName: string, key: Record<string, unknown>) {
		try {
			const response = await this.docClient.send(
				new GetCommand({
					TableName: tableName,
					// biome-ignore lint/suspicious/noExplicitAny: AWS SDK NativeAttributeValue type
					Key: key as Record<string, any>,
				}),
			);

			return {
				items: response.Item ? [response.Item as Record<string, unknown>] : [],
				count: response.Item ? 1 : 0,
				scannedCount: response.Item ? 1 : 0,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	async putItem(tableName: string, item: Record<string, unknown>) {
		try {
			await this.docClient.send(
				new PutCommand({
					TableName: tableName,
					// biome-ignore lint/suspicious/noExplicitAny: AWS SDK NativeAttributeValue type
					Item: item as Record<string, any>,
				}),
			);
			return { message: "Item saved successfully" };
		} catch (err) {
			this.handleError(err);
		}
	}

	async deleteItem(tableName: string, key: Record<string, unknown>) {
		try {
			await this.docClient.send(
				new DeleteCommand({
					TableName: tableName,
					// biome-ignore lint/suspicious/noExplicitAny: AWS SDK NativeAttributeValue type
					Key: key as Record<string, any>,
				}),
			);
			return { success: true };
		} catch (err) {
			this.handleError(err);
		}
	}

	async batchWriteItems(
		tableName: string,
		putItems?: Record<string, unknown>[],
		deleteKeys?: Record<string, unknown>[],
	) {
		try {
			const requests: Array<{
				PutRequest?: { Item: Record<string, NativeAttributeValue> };
				DeleteRequest?: { Key: Record<string, NativeAttributeValue> };
			}> = [];

			if (putItems) {
				for (const item of putItems) {
					requests.push({
						PutRequest: { Item: item as Record<string, NativeAttributeValue> },
					});
				}
			}
			if (deleteKeys) {
				for (const key of deleteKeys) {
					requests.push({
						DeleteRequest: { Key: key as Record<string, NativeAttributeValue> },
					});
				}
			}

			let processedCount = 0;
			let unprocessedCount = 0;

			// Split into batches of 25 (DynamoDB limit)
			for (let i = 0; i < requests.length; i += 25) {
				const batch = requests.slice(i, i + 25);
				const response = await this.docClient.send(
					new BatchWriteCommand({
						RequestItems: {
							[tableName]: batch,
						},
					}),
				);

				const unprocessed = response.UnprocessedItems?.[tableName]?.length ?? 0;
				processedCount += batch.length - unprocessed;
				unprocessedCount += unprocessed;
			}

			return { processedCount, unprocessedCount };
		} catch (err) {
			this.handleError(err);
		}
	}

	async batchGetItems(
		tableName: string,
		keys: Record<string, unknown>[],
		projectionExpression?: string,
	) {
		try {
			const allItems: Record<string, unknown>[] = [];
			const allUnprocessedKeys: Record<string, unknown>[] = [];

			// Split into batches of 100 (DynamoDB limit)
			for (let i = 0; i < keys.length; i += 100) {
				const batch = keys.slice(i, i + 100);
				// biome-ignore lint/suspicious/noExplicitAny: AWS SDK NativeAttributeValue type
				const requestItems: Record<string, any> = {
					[tableName]: {
						// biome-ignore lint/suspicious/noExplicitAny: AWS SDK NativeAttributeValue type
						Keys: batch as Record<string, any>[],
					},
				};
				if (projectionExpression) {
					requestItems[tableName].ProjectionExpression = projectionExpression;
				}

				const response = await this.docClient.send(
					new BatchGetCommand({ RequestItems: requestItems }),
				);

				const items = response.Responses?.[tableName] ?? [];
				allItems.push(...(items as Record<string, unknown>[]));

				const unprocessed = response.UnprocessedKeys?.[tableName]?.Keys ?? [];
				allUnprocessedKeys.push(...(unprocessed as Record<string, unknown>[]));
			}

			return {
				items: allItems,
				unprocessedKeys:
					allUnprocessedKeys.length > 0 ? allUnprocessedKeys : undefined,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	// --- GSI operations ---

	async createGSI(tableName: string, params: CreateGSIBody) {
		try {
			await this.client.send(
				new UpdateTableCommand({
					TableName: tableName,
					AttributeDefinitions: params.keySchema.map((ks) => ({
						AttributeName: ks.attributeName,
						AttributeType: "S", // default to String, caller should include in attributeDefinitions
					})) as AttributeDefinition[],
					GlobalSecondaryIndexUpdates: [
						{
							Create: {
								IndexName: params.indexName,
								KeySchema: params.keySchema.map((ks) => ({
									AttributeName: ks.attributeName,
									KeyType: ks.keyType,
								})) as KeySchemaElement[],
								Projection: {
									ProjectionType: params.projection.projectionType as
										| "ALL"
										| "KEYS_ONLY"
										| "INCLUDE",
									NonKeyAttributes: params.projection.nonKeyAttributes,
								},
								ProvisionedThroughput: {
									ReadCapacityUnits:
										params.provisionedThroughput?.readCapacityUnits ?? 5,
									WriteCapacityUnits:
										params.provisionedThroughput?.writeCapacityUnits ?? 5,
								},
							},
						},
					],
				}),
			);
			return { message: `GSI '${params.indexName}' creation initiated` };
		} catch (err) {
			this.handleError(err);
		}
	}

	async deleteGSI(tableName: string, indexName: string) {
		try {
			await this.client.send(
				new UpdateTableCommand({
					TableName: tableName,
					GlobalSecondaryIndexUpdates: [
						{
							Delete: {
								IndexName: indexName,
							},
						},
					],
				}),
			);
			return { success: true };
		} catch (err) {
			this.handleError(err);
		}
	}

	// --- Stream operations ---

	async describeStream(tableName: string) {
		try {
			// First get the stream ARN from the table description
			const tableDesc = await this.client.send(
				new DescribeTableCommand({ TableName: tableName }),
			);

			const streamArn = tableDesc.Table?.LatestStreamArn;
			if (!streamArn) {
				return {
					streamArn: undefined,
					streamLabel: undefined,
					streamStatus: undefined,
					streamViewType: tableDesc.Table?.StreamSpecification?.StreamViewType,
					shards: undefined,
				};
			}

			const response = await this.streamsClient.send(
				new DescribeStreamCommand({ StreamArn: streamArn }),
			);

			const stream = response.StreamDescription;
			return {
				streamArn: stream?.StreamArn,
				streamLabel: stream?.StreamLabel,
				streamStatus: stream?.StreamStatus,
				streamViewType: stream?.StreamViewType,
				shards: stream?.Shards?.map((shard) => ({
					shardId: shard.ShardId ?? "",
					parentShardId: shard.ParentShardId,
					sequenceNumberRange: {
						startingSequenceNumber:
							shard.SequenceNumberRange?.StartingSequenceNumber,
						endingSequenceNumber:
							shard.SequenceNumberRange?.EndingSequenceNumber,
					},
				})),
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	async getStreamRecords(tableName: string, shardId?: string, limit?: number) {
		try {
			// Get stream ARN
			const tableDesc = await this.client.send(
				new DescribeTableCommand({ TableName: tableName }),
			);
			const streamArn = tableDesc.Table?.LatestStreamArn;
			if (!streamArn) {
				throw new AppError(
					"No stream enabled for this table",
					404,
					"STREAM_NOT_FOUND",
				);
			}

			// If no shardId provided, get the first shard
			let targetShardId = shardId;
			if (!targetShardId) {
				const streamDesc = await this.streamsClient.send(
					new DescribeStreamCommand({ StreamArn: streamArn }),
				);
				targetShardId = streamDesc.StreamDescription?.Shards?.[0]?.ShardId;
				if (!targetShardId) {
					return { records: [], nextShardIterator: undefined };
				}
			}

			// Get shard iterator
			const iteratorResponse = await this.streamsClient.send(
				new GetShardIteratorCommand({
					StreamArn: streamArn,
					ShardId: targetShardId,
					ShardIteratorType: "TRIM_HORIZON",
				}),
			);

			if (!iteratorResponse.ShardIterator) {
				return { records: [], nextShardIterator: undefined };
			}

			// Get records
			const recordsResponse = await this.streamsClient.send(
				new GetRecordsCommand({
					ShardIterator: iteratorResponse.ShardIterator,
					Limit: limit ?? 100,
				}),
			);

			const records = (recordsResponse.Records ?? []).map((record) => ({
				eventID: record.eventID,
				eventName: record.eventName,
				eventSource: record.eventSource,
				dynamodb: record.dynamodb
					? {
							keys: record.dynamodb.Keys
								? Object.fromEntries(
										Object.entries(record.dynamodb.Keys).map(([k, v]) => [
											k,
											Object.values(v)[0],
										]),
									)
								: undefined,
							newImage: record.dynamodb.NewImage
								? Object.fromEntries(
										Object.entries(record.dynamodb.NewImage).map(([k, v]) => [
											k,
											Object.values(v)[0],
										]),
									)
								: undefined,
							oldImage: record.dynamodb.OldImage
								? Object.fromEntries(
										Object.entries(record.dynamodb.OldImage).map(([k, v]) => [
											k,
											Object.values(v)[0],
										]),
									)
								: undefined,
							sequenceNumber: record.dynamodb.SequenceNumber,
							sizeBytes: record.dynamodb.SizeBytes,
							streamViewType: record.dynamodb.StreamViewType,
						}
					: undefined,
			}));

			return {
				records,
				nextShardIterator: recordsResponse.NextShardIterator,
			};
		} catch (err) {
			this.handleError(err);
		}
	}

	// --- PartiQL operations ---

	async executePartiQL(statement: string, parameters?: unknown[]) {
		try {
			const commandInput: ConstructorParameters<
				typeof ExecuteStatementCommand
			>[0] = {
				Statement: statement,
			};

			if (parameters && parameters.length > 0) {
				// Parameters need to be in DynamoDB AttributeValue format
				// For simplicity, we'll pass them as-is and let DynamoDB handle it
				commandInput.Parameters = parameters.map((p) => {
					if (typeof p === "string") return { S: p };
					if (typeof p === "number") return { N: String(p) };
					if (typeof p === "boolean") return { BOOL: p };
					if (p === null) return { NULL: true };
					return { S: String(p) };
				});
			}

			const response = await this.client.send(
				new ExecuteStatementCommand(commandInput),
			);

			const items = (response.Items ?? []).map((item) => {
				try {
					return unmarshall(item) as Record<string, unknown>;
				} catch {
					return item as unknown as Record<string, unknown>;
				}
			});

			return { items };
		} catch (err) {
			this.handleError(err);
		}
	}

	// --- Error handling ---

	private handleError(err: unknown): never {
		const error = err as Error & { name: string };

		if (error instanceof AppError) {
			throw error;
		}

		if (error.name === "ResourceNotFoundException") {
			throw new AppError(error.message, 404, "TABLE_NOT_FOUND");
		}
		if (error.name === "ResourceInUseException") {
			throw new AppError(error.message, 409, "TABLE_IN_USE");
		}
		if (error.name === "LimitExceededException") {
			throw new AppError(error.message, 429, "LIMIT_EXCEEDED");
		}

		throw error;
	}
}
