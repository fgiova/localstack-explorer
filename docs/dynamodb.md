# DynamoDB Service Guide

DynamoDB is a fully implemented service in LocalStack Explorer. It supports table management, item CRUD with batch operations, Global Secondary Index (GSI) management, a visual query builder, PartiQL editor, and DynamoDB Streams viewer.

## Features

- List, create, and delete tables
- View table details (key schema, throughput, item count, size, stream config, ARN)
- Scan and query items with pagination
- Create, edit, and delete individual items via JSON editor
- Batch write (put + delete) and batch get with automatic chunking
- Visual query builder with key conditions, filters, index selection, and sort direction
- PartiQL editor with statement execution, examples, and history
- Global Secondary Index management (create, delete, list)
- Local Secondary Index viewing
- DynamoDB Streams viewer with shard listing and record inspection
- JSON file import for batch operations and JSON export for results
- Search/filter tables by name

## API Endpoints

All endpoints are prefixed with `/api/dynamodb`.

### Tables

| Method | Path              | Description    | Request                 | Response                  |
|--------|-------------------|----------------|-------------------------|---------------------------|
| GET    | `/`               | List tables    | --                      | `{ tables: [...] }`       |
| POST   | `/`               | Create table   | `CreateTableBody`       | `{ message: string }`     |
| GET    | `/:tableName`     | Describe table | --                      | `TableDetailResponse`     |
| DELETE | `/:tableName`     | Delete table   | --                      | `{ success: boolean }`    |

### Indexes

| Method | Path                                  | Description | Request          | Response               |
|--------|---------------------------------------|-------------|------------------|------------------------|
| POST   | `/:tableName/indexes`                 | Create GSI  | `CreateGSIBody`  | `{ message: string }`  |
| DELETE | `/:tableName/indexes/:indexName`      | Delete GSI  | --               | `{ success: boolean }` |

### Items

| Method | Path                            | Description | Request                                  | Response               |
|--------|---------------------------------|-------------|------------------------------------------|------------------------|
| POST   | `/:tableName/items/scan`        | Scan items  | `ScanBody` (filters, limit, startKey)    | `ItemsResponse`        |
| POST   | `/:tableName/items/query`       | Query items | `QueryBody` (keyCondition, filters, etc) | `ItemsResponse`        |
| POST   | `/:tableName/items/get`         | Get item    | `{ key: {...} }`                         | `ItemsResponse`        |
| POST   | `/:tableName/items`             | Put item    | `{ item: {...} }`                        | `{ message: string }`  |
| DELETE | `/:tableName/items`             | Delete item | `{ key: {...} }`                         | `{ success: boolean }` |
| POST   | `/:tableName/items/batch-write` | Batch write | `{ putItems?, deleteKeys? }`             | `BatchWriteResponse`   |
| POST   | `/:tableName/items/batch-get`   | Batch get   | `{ keys: [...], projectionExpression? }` | `BatchGetResponse`     |

### PartiQL

| Method | Path        | Description        | Request                           | Response            |
|--------|-------------|--------------------|-----------------------------------|---------------------|
| POST   | `/partiql`  | Execute statement  | `{ statement, parameters? }`      | `{ items: [...] }`  |

### Streams

| Method | Path                              | Description        | Query Params            | Response                  |
|--------|-----------------------------------|--------------------|-------------------------|---------------------------|
| GET    | `/:tableName/streams`             | Describe stream    | --                      | `StreamDescription`       |
| GET    | `/:tableName/streams/records`     | Get stream records | `?shardId=&limit=`      | `StreamRecordsResponse`   |

### Request/Response Examples

**List tables:**

```bash
curl http://localhost:3001/api/dynamodb
```

```json
{
  "tables": [
    {
      "tableName": "users",
      "tableStatus": "ACTIVE",
      "itemCount": 42,
      "tableSizeBytes": 8192
    }
  ]
}
```

**Create table:**

```bash
curl -X POST http://localhost:3001/api/dynamodb \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "users",
    "keySchema": [
      { "attributeName": "userId", "keyType": "HASH" },
      { "attributeName": "createdAt", "keyType": "RANGE" }
    ],
    "attributeDefinitions": [
      { "attributeName": "userId", "attributeType": "S" },
      { "attributeName": "createdAt", "attributeType": "N" }
    ],
    "provisionedThroughput": {
      "readCapacityUnits": 5,
      "writeCapacityUnits": 5
    }
  }'
```

**Describe table:**

```bash
curl http://localhost:3001/api/dynamodb/users
```

```json
{
  "tableName": "users",
  "tableStatus": "ACTIVE",
  "tableArn": "arn:aws:dynamodb:us-east-1:000000000000:table/users",
  "creationDateTime": "2026-03-28T10:00:00.000Z",
  "keySchema": [
    { "attributeName": "userId", "keyType": "HASH" },
    { "attributeName": "createdAt", "keyType": "RANGE" }
  ],
  "attributeDefinitions": [
    { "attributeName": "userId", "attributeType": "S" },
    { "attributeName": "createdAt", "attributeType": "N" }
  ],
  "provisionedThroughput": {
    "readCapacityUnits": 5,
    "writeCapacityUnits": 5
  },
  "globalSecondaryIndexes": [],
  "itemCount": 42,
  "tableSizeBytes": 8192
}
```

**Put item:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/users/items \
  -H "Content-Type: application/json" \
  -d '{"item": {"userId": "u-001", "createdAt": 1711612800, "name": "Alice"}}'
```

**Scan items:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/users/items/scan \
  -H "Content-Type: application/json" \
  -d '{"limit": 25}'
```

```json
{
  "items": [
    { "userId": "u-001", "createdAt": 1711612800, "name": "Alice" }
  ],
  "count": 1,
  "scannedCount": 1,
  "lastEvaluatedKey": null
}
```

**Query items:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/users/items/query \
  -H "Content-Type: application/json" \
  -d '{
    "keyConditionExpression": "#pk = :pk AND #sk > :sk",
    "expressionAttributeNames": { "#pk": "userId", "#sk": "createdAt" },
    "expressionAttributeValues": { ":pk": "u-001", ":sk": 0 },
    "scanIndexForward": false,
    "limit": 10
  }'
```

**Batch write:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/users/items/batch-write \
  -H "Content-Type: application/json" \
  -d '{
    "putItems": [
      { "userId": "u-002", "createdAt": 1711612900, "name": "Bob" },
      { "userId": "u-003", "createdAt": 1711613000, "name": "Carol" }
    ],
    "deleteKeys": [
      { "userId": "u-001", "createdAt": 1711612800 }
    ]
  }'
```

```json
{
  "processedCount": 3,
  "unprocessedCount": 0
}
```

**Execute PartiQL:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/partiql \
  -H "Content-Type: application/json" \
  -d '{"statement": "SELECT * FROM \"users\" WHERE userId = '\''u-001'\''"}'
```

**Create GSI:**

```bash
curl -X POST http://localhost:3001/api/dynamodb/users/indexes \
  -H "Content-Type: application/json" \
  -d '{
    "indexName": "name-index",
    "keySchema": [{ "attributeName": "name", "keyType": "HASH" }],
    "projection": { "projectionType": "ALL" },
    "provisionedThroughput": { "readCapacityUnits": 5, "writeCapacityUnits": 5 }
  }'
```

## Error Handling

The DynamoDB service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                 | Status | Error Code         |
|--------------------------|--------|--------------------|
| Table not found          | 404    | `TABLE_NOT_FOUND`  |
| Table already in use     | 409    | `TABLE_IN_USE`     |
| Limit exceeded           | 429    | `LIMIT_EXCEEDED`   |
| Stream not found         | 404    | `STREAM_NOT_FOUND` |
| Validation error         | 400    | `VALIDATION_ERROR` |

All errors return a consistent JSON shape:

```json
{
  "error": "TABLE_NOT_FOUND",
  "message": "Table 'missing-table' not found",
  "statusCode": 404
}
```

## Backend Implementation

The DynamoDB plugin consists of four files in `packages/backend/src/plugins/dynamodb/`:

| File          | Purpose                                                                                     |
|---------------|---------------------------------------------------------------------------------------------|
| `index.ts`    | Plugin registration -- creates DynamoDB, Document, and Streams clients, registers routes    |
| `service.ts`  | `DynamoDBService` class -- business logic wrapping AWS SDK calls                            |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                                   |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                                 |

### AWS SDK Clients

The plugin uses three AWS SDK clients:

| Client                   | Package                            | Purpose                                          |
|--------------------------|------------------------------------|--------------------------------------------------|
| `DynamoDBClient`         | `@aws-sdk/client-dynamodb`         | Table operations, GSI management, PartiQL        |
| `DynamoDBDocumentClient` | `@aws-sdk/lib-dynamodb`            | Item operations (auto marshalling/unmarshalling) |
| `DynamoDBStreamsClient`  | `@aws-sdk/client-dynamodb-streams` | Stream description and record retrieval          |

The Document Client wraps the base client with `marshallOptions: { removeUndefinedValues: true }`, automatically converting between JavaScript native types and DynamoDB attribute value format.

### DynamoDBService Methods

**Table operations:**

| Method                    | AWS SDK Command                | Description                                         |
|---------------------------|--------------------------------|-----------------------------------------------------|
| `listTables()`            | `ListTables` + `DescribeTable` | Lists all tables with status, item count, and size  |
| `describeTable(name)`     | `DescribeTableCommand`         | Full table description including indexes and stream |
| `createTable(params)`     | `CreateTableCommand`           | Creates table with key schema, throughput, indexes  |
| `deleteTable(name)`       | `DeleteTableCommand`           | Deletes a table                                     |

**Item operations (via Document Client):**

| Method                                    | AWS SDK Command     | Description                                       |
|-------------------------------------------|---------------------|---------------------------------------------------|
| `scanItems(table, options?)`              | `ScanCommand`       | Scans with optional filter, index, pagination     |
| `queryItems(table, options)`              | `QueryCommand`      | Queries with key condition and optional filter    |
| `getItem(table, key)`                     | `GetCommand`        | Gets a single item by primary key                 |
| `putItem(table, item)`                    | `PutCommand`        | Creates or replaces an item                       |
| `deleteItem(table, key)`                  | `DeleteCommand`     | Deletes an item by primary key                    |
| `batchWriteItems(table, puts?, deletes?)` | `BatchWriteCommand` | Batch put/delete, auto-splits into 25-item chunks |
| `batchGetItems(table, keys, projection?)` | `BatchGetCommand`   | Batch get, auto-splits into 100-key chunks        |

**Index operations:**

| Method                                 | AWS SDK Command        | Description                        |
|----------------------------------------|------------------------|------------------------------------|
| `createGSI(table, params)`             | `UpdateTableCommand`   | Adds a GSI to existing table       |
| `deleteGSI(table, indexName)`          | `UpdateTableCommand`   | Removes a GSI from table           |

**Stream operations:**

| Method                                    | AWS SDK Command                                 | Description                          |
|-------------------------------------------|-------------------------------------------------|--------------------------------------|
| `describeStream(table)`                   | `DescribeTable` + `DescribeStreamCommand`       | Stream metadata and shard list       |
| `getStreamRecords(table, shard?, limit?)` | `GetShardIteratorCommand` + `GetRecordsCommand` | Reads change records from a shard    |

**PartiQL:**

| Method                                | AWS SDK Command             | Description                         |
|---------------------------------------|-----------------------------|-------------------------------------|
| `executePartiQL(statement, params?)`  | `ExecuteStatementCommand`   | Executes SQL-like PartiQL statement |

## Frontend Components

The DynamoDB frontend is in `packages/frontend/src/components/dynamodb/` and `packages/frontend/src/routes/dynamodb/`.

| Component           | Description                                                                        |
|---------------------|------------------------------------------------------------------------------------|
| `TableList`         | Table of DynamoDB tables with search, create dialog, and delete with confirmation  |
| `CreateTableDialog` | Modal for creating a table with partition key, optional sort key, and throughput   |
| `TableDetail`       | Overview card with table attributes, key schema, and ARN                           |
| `ItemBrowser`       | Scan-based item viewer with pagination, create/edit/delete via JSON editor         |
| `ItemEditorDialog`  | JSON editor dialog for creating and editing items                                  |
| `QueryBuilder`      | Visual form for building queries with key conditions, filters, and index selection |
| `PartiQLEditor`     | SQL-like statement editor with execute, examples, and history                      |
| `StreamViewer`      | Stream information, shard list, and event record viewer                            |
| `IndexManager`      | GSI/LSI listing with create and delete GSI dialogs                                 |
| `CreateGSIDialog`   | Modal for creating a GSI with key schema, projection type, and throughput          |
| `BatchOperations`   | Tabbed view for batch write (with JSON import) and batch get (with JSON export)    |

### Routes

| Route                     | Component    | Description                                  |
|---------------------------|--------------|----------------------------------------------|
| `/dynamodb`               | `TableList`  | List and manage tables                       |
| `/dynamodb/:tableName`    | Detail page  | Table detail with tabbed view (7 tabs)       |

### Table Detail Tabs

| Tab       | Component          | Description                                                 |
|-----------|--------------------|-------------------------------------------------------------|
| Overview  | `TableDetail`      | Table status, key schema, throughput, metrics, ARN          |
| Items     | `ItemBrowser`      | Browse, create, edit, and delete items                      |
| Query     | `QueryBuilder`     | Visual query builder with index and filter support          |
| PartiQL   | `PartiQLEditor`    | Execute PartiQL (SQL-like) statements                       |
| Streams   | `StreamViewer`     | View stream status, shards, and change records              |
| Indexes   | `IndexManager`     | Manage GSIs and view LSIs                                   |
| Batch     | `BatchOperations`  | Batch write/get operations with file import/export          |

### QueryBuilder

The visual query builder provides a form-based interface for constructing DynamoDB queries:

- **Index selector**: Choose between table primary key or any GSI
- **Key conditions**: Auto-populated partition and sort key fields based on selected index; sort key supports operators (`=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `begins_with`)
- **Filters**: Dynamic filter rows with attribute name, operator, and value; multiple operators supported (`=`, `<>`, `<`, `>`, `contains`, `begins_with`, `attribute_exists`, `attribute_not_exists`)
- **Options**: Limit, ascending/descending sort direction
- **Auto mode**: Runs a Query when partition key is provided, falls back to Scan when it is not

The component auto-generates `KeyConditionExpression`, `FilterExpression`, `ExpressionAttributeNames`, and `ExpressionAttributeValues` from the form inputs.

### PartiQLEditor

The PartiQL editor supports SQL-like queries against DynamoDB tables:

- Textarea with monospace font for writing statements
- **Cmd+Enter** (Ctrl+Enter) keyboard shortcut to execute
- Template buttons for common operations: SELECT, INSERT, UPDATE, DELETE
- Statement history (last 10, in-memory) with success/failure status and item count
- Results displayed in a dynamic table

### React Query Hooks

All hooks are in `packages/frontend/src/api/dynamodb.ts`:

| Hook / Function              | Type     | Query Key / Notes                              |
|------------------------------|----------|------------------------------------------------|
| `useListTables()`            | Query    | `["dynamodb", "tables"]`                       |
| `useDescribeTable(name)`     | Query    | `["dynamodb", "table", tableName]`             |
| `useCreateTable()`           | Mutation | Invalidates `["dynamodb", "tables"]`           |
| `useDeleteTable()`           | Mutation | Invalidates `["dynamodb", "tables"]`           |
| `useCreateGSI(table)`        | Mutation | Invalidates `["dynamodb", "table", tableName]` |
| `useDeleteGSI(table)`        | Mutation | Invalidates `["dynamodb", "table", tableName]` |
| `useScanItems(table)`        | Mutation | Dynamic scan parameters                        |
| `useQueryItems(table)`       | Mutation | Dynamic query parameters                       |
| `useGetItem(table)`          | Mutation | Dynamic key parameter                          |
| `usePutItem(table)`          | Mutation | Invalidates `["dynamodb", "items", tableName]` |
| `useDeleteItem(table)`       | Mutation | Invalidates `["dynamodb", "items", tableName]` |
| `useBatchWriteItems(table)`  | Mutation | Invalidates `["dynamodb", "items", tableName]` |
| `useBatchGetItems(table)`    | Mutation | Returns fetched items                          |
| `useExecutePartiQL()`        | Mutation | Dynamic statement parameter                    |
| `useDescribeStream(table)`   | Query    | `["dynamodb", "streams", tableName]`           |
| `useGetStreamRecords(table)` | Mutation | Dynamic shard/limit parameters                 |

Scan, query, get, PartiQL, and stream records use mutation hooks because their parameters change dynamically with each user action. Mutations that modify data automatically invalidate the relevant query cache.

## Batch Operations

The batch operations handle DynamoDB's built-in limits automatically:

- **Batch write**: Splits requests into chunks of 25 items (DynamoDB's `BatchWriteItem` limit)
- **Batch get**: Splits requests into chunks of 100 keys (DynamoDB's `BatchGetItem` limit)

The frontend supports JSON file import for batch write operations and JSON export for batch get results.

**Batch write format:**

```json
{
  "put": [
    { "userId": "u-001", "name": "Alice" },
    { "userId": "u-002", "name": "Bob" }
  ],
  "delete": [
    { "userId": "u-003", "createdAt": 1711612800 }
  ]
}
```

## DynamoDB Streams

When streams are enabled on a table, the StreamViewer component shows:

- **Stream metadata**: ARN, status, view type (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES), label
- **Shard list**: Each shard with ID, parent shard, and a button to fetch records
- **Stream records**: Color-coded event badges (INSERT, MODIFY, REMOVE) with expandable JSON views for keys, new image, and old image

Note: Streams must be enabled on the table at creation time or via an UpdateTable operation. The viewer indicates when streams are not enabled.
