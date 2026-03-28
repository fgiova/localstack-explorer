import Type, { type Static } from "typebox";

// --- Table schemas ---

export const KeySchemaElementSchema = Type.Object({
  attributeName: Type.String(),
  keyType: Type.String(),
});
export type KeySchemaElement = Static<typeof KeySchemaElementSchema>;

export const AttributeDefinitionSchema = Type.Object({
  attributeName: Type.String(),
  attributeType: Type.String(),
});
export type AttributeDefinition = Static<typeof AttributeDefinitionSchema>;

export const ProvisionedThroughputSchema = Type.Object({
  readCapacityUnits: Type.Number(),
  writeCapacityUnits: Type.Number(),
});
export type ProvisionedThroughput = Static<typeof ProvisionedThroughputSchema>;

export const ProjectionSchema = Type.Object({
  projectionType: Type.String(),
  nonKeyAttributes: Type.Optional(Type.Array(Type.String())),
});
export type Projection = Static<typeof ProjectionSchema>;

export const GSISchema = Type.Object({
  indexName: Type.String(),
  keySchema: Type.Array(KeySchemaElementSchema),
  projection: ProjectionSchema,
  provisionedThroughput: Type.Optional(ProvisionedThroughputSchema),
  indexStatus: Type.Optional(Type.String()),
  itemCount: Type.Optional(Type.Number()),
});
export type GSI = Static<typeof GSISchema>;

export const LSISchema = Type.Object({
  indexName: Type.String(),
  keySchema: Type.Array(KeySchemaElementSchema),
  projection: ProjectionSchema,
});
export type LSI = Static<typeof LSISchema>;

export const StreamSpecificationSchema = Type.Object({
  streamEnabled: Type.Boolean(),
  streamViewType: Type.Optional(Type.String()),
});
export type StreamSpecification = Static<typeof StreamSpecificationSchema>;

export const TableSummarySchema = Type.Object({
  tableName: Type.String(),
  tableStatus: Type.String(),
  itemCount: Type.Optional(Type.Number()),
  tableSizeBytes: Type.Optional(Type.Number()),
});
export type TableSummary = Static<typeof TableSummarySchema>;

export const TableListResponseSchema = Type.Object({
  tables: Type.Array(TableSummarySchema),
});
export type TableListResponse = Static<typeof TableListResponseSchema>;

export const TableDetailResponseSchema = Type.Object({
  tableName: Type.String(),
  tableStatus: Type.String(),
  tableArn: Type.Optional(Type.String()),
  creationDateTime: Type.Optional(Type.String()),
  keySchema: Type.Array(KeySchemaElementSchema),
  attributeDefinitions: Type.Array(AttributeDefinitionSchema),
  provisionedThroughput: Type.Optional(ProvisionedThroughputSchema),
  globalSecondaryIndexes: Type.Optional(Type.Array(GSISchema)),
  localSecondaryIndexes: Type.Optional(Type.Array(LSISchema)),
  streamSpecification: Type.Optional(StreamSpecificationSchema),
  itemCount: Type.Optional(Type.Number()),
  tableSizeBytes: Type.Optional(Type.Number()),
  latestStreamArn: Type.Optional(Type.String()),
});
export type TableDetailResponse = Static<typeof TableDetailResponseSchema>;

// --- Request body schemas ---

export const CreateTableBodySchema = Type.Object({
  tableName: Type.String({ minLength: 1, maxLength: 255 }),
  keySchema: Type.Array(KeySchemaElementSchema, { minItems: 1, maxItems: 2 }),
  attributeDefinitions: Type.Array(AttributeDefinitionSchema, { minItems: 1 }),
  provisionedThroughput: Type.Optional(ProvisionedThroughputSchema),
  globalSecondaryIndexes: Type.Optional(
    Type.Array(
      Type.Object({
        indexName: Type.String(),
        keySchema: Type.Array(KeySchemaElementSchema),
        projection: ProjectionSchema,
        provisionedThroughput: Type.Optional(ProvisionedThroughputSchema),
      })
    )
  ),
  localSecondaryIndexes: Type.Optional(
    Type.Array(
      Type.Object({
        indexName: Type.String(),
        keySchema: Type.Array(KeySchemaElementSchema),
        projection: ProjectionSchema,
      })
    )
  ),
});
export type CreateTableBody = Static<typeof CreateTableBodySchema>;

export const TableParamsSchema = Type.Object({
  tableName: Type.String(),
});
export type TableParams = Static<typeof TableParamsSchema>;

export const IndexParamsSchema = Type.Object({
  tableName: Type.String(),
  indexName: Type.String(),
});
export type IndexParams = Static<typeof IndexParamsSchema>;

export const CreateGSIBodySchema = Type.Object({
  indexName: Type.String(),
  keySchema: Type.Array(KeySchemaElementSchema, { minItems: 1, maxItems: 2 }),
  projection: ProjectionSchema,
  provisionedThroughput: Type.Optional(ProvisionedThroughputSchema),
});
export type CreateGSIBody = Static<typeof CreateGSIBodySchema>;

// --- Item schemas ---

export const ScanBodySchema = Type.Object({
  indexName: Type.Optional(Type.String()),
  filterExpression: Type.Optional(Type.String()),
  expressionAttributeNames: Type.Optional(
    Type.Record(Type.String(), Type.String())
  ),
  expressionAttributeValues: Type.Optional(
    Type.Record(Type.String(), Type.Unknown())
  ),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  exclusiveStartKey: Type.Optional(
    Type.Record(Type.String(), Type.Unknown())
  ),
  projectionExpression: Type.Optional(Type.String()),
});
export type ScanBody = Static<typeof ScanBodySchema>;

export const QueryBodySchema = Type.Object({
  keyConditionExpression: Type.String(),
  indexName: Type.Optional(Type.String()),
  filterExpression: Type.Optional(Type.String()),
  expressionAttributeNames: Type.Optional(
    Type.Record(Type.String(), Type.String())
  ),
  expressionAttributeValues: Type.Optional(
    Type.Record(Type.String(), Type.Unknown())
  ),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  exclusiveStartKey: Type.Optional(
    Type.Record(Type.String(), Type.Unknown())
  ),
  projectionExpression: Type.Optional(Type.String()),
  scanIndexForward: Type.Optional(Type.Boolean()),
});
export type QueryBody = Static<typeof QueryBodySchema>;

export const GetItemBodySchema = Type.Object({
  key: Type.Record(Type.String(), Type.Unknown()),
});
export type GetItemBody = Static<typeof GetItemBodySchema>;

export const PutItemBodySchema = Type.Object({
  item: Type.Record(Type.String(), Type.Unknown()),
});
export type PutItemBody = Static<typeof PutItemBodySchema>;

export const DeleteItemBodySchema = Type.Object({
  key: Type.Record(Type.String(), Type.Unknown()),
});
export type DeleteItemBody = Static<typeof DeleteItemBodySchema>;

export const BatchWriteBodySchema = Type.Object({
  putItems: Type.Optional(
    Type.Array(Type.Record(Type.String(), Type.Unknown()))
  ),
  deleteKeys: Type.Optional(
    Type.Array(Type.Record(Type.String(), Type.Unknown()))
  ),
});
export type BatchWriteBody = Static<typeof BatchWriteBodySchema>;

export const BatchGetBodySchema = Type.Object({
  keys: Type.Array(Type.Record(Type.String(), Type.Unknown())),
  projectionExpression: Type.Optional(Type.String()),
});
export type BatchGetBody = Static<typeof BatchGetBodySchema>;

export const ItemsResponseSchema = Type.Object({
  items: Type.Array(Type.Record(Type.String(), Type.Unknown())),
  count: Type.Number(),
  scannedCount: Type.Number(),
  lastEvaluatedKey: Type.Optional(
    Type.Record(Type.String(), Type.Unknown())
  ),
});
export type ItemsResponse = Static<typeof ItemsResponseSchema>;

export const BatchWriteResponseSchema = Type.Object({
  processedCount: Type.Number(),
  unprocessedCount: Type.Number(),
});
export type BatchWriteResponse = Static<typeof BatchWriteResponseSchema>;

export const BatchGetResponseSchema = Type.Object({
  items: Type.Array(Type.Record(Type.String(), Type.Unknown())),
  unprocessedKeys: Type.Optional(
    Type.Array(Type.Record(Type.String(), Type.Unknown()))
  ),
});
export type BatchGetResponse = Static<typeof BatchGetResponseSchema>;

// --- PartiQL schemas ---

export const PartiQLBodySchema = Type.Object({
  statement: Type.String(),
  parameters: Type.Optional(Type.Array(Type.Unknown())),
});
export type PartiQLBody = Static<typeof PartiQLBodySchema>;

export const PartiQLResponseSchema = Type.Object({
  items: Type.Array(Type.Record(Type.String(), Type.Unknown())),
});
export type PartiQLResponse = Static<typeof PartiQLResponseSchema>;

// --- Stream schemas ---

export const StreamDescriptionSchema = Type.Object({
  streamArn: Type.Optional(Type.String()),
  streamLabel: Type.Optional(Type.String()),
  streamStatus: Type.Optional(Type.String()),
  streamViewType: Type.Optional(Type.String()),
  shards: Type.Optional(
    Type.Array(
      Type.Object({
        shardId: Type.String(),
        parentShardId: Type.Optional(Type.String()),
        sequenceNumberRange: Type.Object({
          startingSequenceNumber: Type.Optional(Type.String()),
          endingSequenceNumber: Type.Optional(Type.String()),
        }),
      })
    )
  ),
});
export type StreamDescription = Static<typeof StreamDescriptionSchema>;

export const StreamRecordSchema = Type.Object({
  eventID: Type.Optional(Type.String()),
  eventName: Type.Optional(Type.String()),
  eventSource: Type.Optional(Type.String()),
  dynamodb: Type.Optional(
    Type.Object({
      keys: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      newImage: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      oldImage: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      sequenceNumber: Type.Optional(Type.String()),
      sizeBytes: Type.Optional(Type.Number()),
      streamViewType: Type.Optional(Type.String()),
    })
  ),
});
export type StreamRecord = Static<typeof StreamRecordSchema>;

export const StreamRecordsResponseSchema = Type.Object({
  records: Type.Array(StreamRecordSchema),
  nextShardIterator: Type.Optional(Type.String()),
});
export type StreamRecordsResponse = Static<typeof StreamRecordsResponseSchema>;

export const StreamQuerySchema = Type.Object({
  shardId: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
});
export type StreamQuery = Static<typeof StreamQuerySchema>;

// --- Common schemas ---

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});
export type MessageResponse = Static<typeof MessageResponseSchema>;

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
export type DeleteResponse = Static<typeof DeleteResponseSchema>;
