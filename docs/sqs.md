# SQS Service Guide

SQS (Simple Queue Service) is a fully implemented service in LocalStack Explorer. It supports queue management, message operations, queue attribute inspection, and queue purging.

## Features

- List all queues
- Create and delete queues
- View queue attributes (message counts, retention policy, visibility timeout, and more)
- Send messages with optional delay and custom message attributes
- Receive and delete messages
- Purge all messages from a queue
- Search/filter queues by name

## API Endpoints

All endpoints are prefixed with `/api/sqs`.

### Queues

| Method | Path                    | Description         | Request Body           | Response                        |
|--------|-------------------------|---------------------|------------------------|---------------------------------|
| GET    | `/`                     | List queues         | —                      | `{ queues: [...] }`             |
| POST   | `/`                     | Create queue        | `{ name: string }`     | `{ message: string }`           |
| DELETE | `/:queueName`           | Delete queue        | —                      | `{ success: boolean }`          |
| POST   | `/:queueName/purge`     | Purge queue         | —                      | `{ success: boolean }`          |
| GET    | `/:queueName/attributes`| Get queue attributes| —                      | `{ queueUrl, queueName, attributes }` |

### Messages

| Method | Path                    | Description       | Request / Query Params                                   | Response                         |
|--------|-------------------------|-------------------|----------------------------------------------------------|----------------------------------|
| POST   | `/:queueName/messages`  | Send message      | Body: `{ body, delaySeconds?, messageAttributes? }`      | `{ messageId: string }`          |
| GET    | `/:queueName/messages`  | Receive messages  | Query: `maxMessages` (default 10), `waitTimeSeconds`     | `{ messages: [...] }`            |
| DELETE | `/:queueName/messages`  | Delete message    | Body: `{ receiptHandle: string }`                        | `{ success: boolean }`           |

### Request/Response Examples

**List queues:**

```bash
curl http://localhost:3001/api/sqs
```

```json
{
  "queues": [
    {
      "queueUrl": "http://localhost:4566/000000000000/my-queue",
      "queueName": "my-queue"
    }
  ]
}
```

**Create queue:**

```bash
curl -X POST http://localhost:3001/api/sqs \
  -H "Content-Type: application/json" \
  -d '{"name": "my-queue"}'
```

```json
{ "message": "Queue 'my-queue' created successfully" }
```

**Get queue attributes:**

```bash
curl http://localhost:3001/api/sqs/my-queue/attributes
```

```json
{
  "queueUrl": "http://localhost:4566/000000000000/my-queue",
  "queueName": "my-queue",
  "attributes": {
    "ApproximateNumberOfMessages": "3",
    "ApproximateNumberOfMessagesNotVisible": "0",
    "ApproximateNumberOfMessagesDelayed": "0",
    "CreatedTimestamp": "1700000000",
    "DelaySeconds": "0",
    "VisibilityTimeout": "30",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600"
  }
}
```

**Send message (simple):**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "Hello, World!"}'
```

```json
{ "messageId": "abc12345-1234-1234-1234-abc123456789" }
```

**Send message with delay and message attributes:**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/messages \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Order placed",
    "delaySeconds": 5,
    "messageAttributes": {
      "OrderId": { "DataType": "String", "StringValue": "ORD-001" },
      "Priority": { "DataType": "String", "StringValue": "high" }
    }
  }'
```

**Receive messages:**

```bash
curl "http://localhost:3001/api/sqs/my-queue/messages?maxMessages=5&waitTimeSeconds=2"
```

```json
{
  "messages": [
    {
      "messageId": "abc12345-1234-1234-1234-abc123456789",
      "body": "Hello, World!",
      "receiptHandle": "AQEBwJnKyrHigUMZj...",
      "messageAttributes": [
        { "name": "OrderId", "dataType": "String", "stringValue": "ORD-001" }
      ]
    }
  ]
}
```

**Delete message:**

```bash
curl -X DELETE http://localhost:3001/api/sqs/my-queue/messages \
  -H "Content-Type: application/json" \
  -d '{"receiptHandle": "AQEBwJnKyrHigUMZj..."}'
```

```json
{ "success": true }
```

**Purge queue:**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/purge
```

```json
{ "success": true }
```

**Delete queue:**

```bash
curl -X DELETE http://localhost:3001/api/sqs/my-queue
```

```json
{ "success": true }
```

## Queue Attributes Explained

Queue attributes are returned as strings by the AWS SQS API. All values in the `attributes` object are string-encoded numbers.

| Attribute                               | Description                                                                                  |
|-----------------------------------------|----------------------------------------------------------------------------------------------|
| `ApproximateNumberOfMessages`           | Estimated number of messages available for retrieval                                         |
| `ApproximateNumberOfMessagesNotVisible` | Messages in-flight (received by a consumer but not yet deleted or expired)                   |
| `ApproximateNumberOfMessagesDelayed`    | Messages in the queue that are delayed and not yet available for retrieval                   |
| `CreatedTimestamp`                      | Unix epoch timestamp (seconds) when the queue was created                                    |
| `DelaySeconds`                          | Default message delay in seconds (0–900). Messages are hidden for this duration after send   |
| `VisibilityTimeout`                     | Duration (seconds) that a received message is hidden from other consumers (default: 30)      |
| `MaximumMessageSize`                    | Maximum allowed message size in bytes (default: 262144 = 256 KB)                             |
| `MessageRetentionPeriod`                | How long (seconds) SQS retains messages (default: 345600 = 4 days; range: 60–1209600)       |

## Message Attributes Support

Message attributes let you attach metadata to a message without modifying the message body. They are passed as a key-value map where each entry specifies a `DataType` and a `StringValue`.

Supported data types:
- `String` — plain text value
- `Number` — numeric value encoded as a string
- `Binary` — not currently supported in this implementation

**Send with message attributes:**

```json
{
  "body": "My message",
  "messageAttributes": {
    "EventType": { "DataType": "String", "StringValue": "order.created" },
    "Version":   { "DataType": "Number", "StringValue": "1" }
  }
}
```

**Received message attribute shape:**

```json
{
  "messageAttributes": [
    { "name": "EventType", "dataType": "String", "stringValue": "order.created" },
    { "name": "Version",   "dataType": "Number", "stringValue": "1" }
  ]
}
```

## Error Handling

The SQS service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                    | Status | Error Code           |
|-----------------------------|--------|----------------------|
| Queue already exists        | 409    | `QUEUE_EXISTS`       |
| Queue not found             | 404    | `QUEUE_NOT_FOUND`    |
| Purge already in progress   | 409    | `PURGE_IN_PROGRESS`  |
| Validation error            | 400    | `VALIDATION_ERROR`   |

All errors return a consistent JSON shape:

```json
{
  "error": "QUEUE_NOT_FOUND",
  "message": "Queue 'missing-queue' not found",
  "statusCode": 404
}
```

## Backend Implementation

The SQS plugin consists of four files in `packages/backend/src/plugins/sqs/`:

| File          | Purpose                                                                             |
|---------------|-------------------------------------------------------------------------------------|
| `index.ts`    | Plugin registration — creates the SQS client and service, registers routes         |
| `service.ts`  | `SQSService` class — business logic wrapping AWS SDK calls                          |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                           |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                         |

### SQSService Methods

| Method                              | AWS SDK Command             | Description                                  |
|-------------------------------------|-----------------------------|----------------------------------------------|
| `listQueues()`                      | `ListQueuesCommand`         | Returns all queue URLs and names             |
| `createQueue(name)`                 | `CreateQueueCommand`        | Creates a new standard queue                 |
| `deleteQueue(queueName)`            | `DeleteQueueCommand`        | Deletes a queue by name                      |
| `purgeQueue(queueName)`             | `PurgeQueueCommand`         | Deletes all messages from a queue            |
| `getQueueAttributes(queueName)`     | `GetQueueAttributesCommand` | Returns all queue attributes                 |
| `sendMessage(queueName, ...)`       | `SendMessageCommand`        | Sends a message, with optional delay and attributes |
| `receiveMessages(queueName, ...)`   | `ReceiveMessageCommand`     | Polls for up to N messages                   |
| `deleteMessage(queueName, handle)`  | `DeleteMessageCommand`      | Deletes a message by receipt handle          |

The service resolves queue names to queue URLs internally using `GetQueueUrlCommand` before operations that require a URL.

## Frontend Components

The SQS frontend is in `packages/frontend/src/components/sqs/` and `packages/frontend/src/routes/sqs/`.

| Component          | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| `QueueList`        | Table of queues with search, create, and delete actions            |
| `QueueCreateDialog`| Modal dialog for naming and creating a new queue                   |
| `QueueDetail`      | Queue detail view: attributes panel, message list, and send form   |
| `SendMessageForm`  | Form for composing and sending messages (body, delay, attributes)  |
| `MessageViewer`    | Displays received messages with receipt handle and attribute details|

### Routes

| Route                  | Component     | Description                            |
|------------------------|---------------|----------------------------------------|
| `/sqs`                 | `QueueList`   | List and manage queues                 |
| `/sqs/:queueName`      | `QueueDetail` | View queue details and manage messages |

### React Query Hooks

All hooks are in `packages/frontend/src/api/sqs.ts`:

| Hook                           | Type     | Query Key                                    |
|--------------------------------|----------|----------------------------------------------|
| `useListQueues()`              | Query    | `["sqs", "queues"]`                          |
| `useQueueAttributes(name)`     | Query    | `["sqs", "attributes", queueName]`           |
| `useReceiveMessages(name, opts)`| Query   | `["sqs", "messages", queueName, options]`    |
| `useCreateQueue()`             | Mutation | Invalidates `["sqs", "queues"]`              |
| `useDeleteQueue()`             | Mutation | Invalidates `["sqs", "queues"]`              |
| `usePurgeQueue()`              | Mutation | Invalidates `["sqs", "messages", ...]` and `["sqs", "attributes", ...]` |
| `useSendMessage(queueName)`    | Mutation | Invalidates `["sqs", "messages", ...]` and `["sqs", "attributes", ...]` |
| `useDeleteMessage(queueName)`  | Mutation | Invalidates `["sqs", "messages", ...]` and `["sqs", "attributes", ...]` |

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, delete, send, or purge operation.

## FIFO Queues — Planned for Future Release

FIFO (First-In-First-Out) queues are not yet supported. The codebase includes `TODO` markers in the relevant places to guide future implementation. When added, the following will be required:

- Queue creation: `name` must end in `.fifo`; pass `FifoQueue: "true"` as an attribute
- Queue attributes: surface `FifoQueue` and `ContentBasedDeduplication`
- Send message: support `MessageGroupId` (required) and `MessageDeduplicationId` (optional)
- Receive message: return `SequenceNumber` for ordering guarantees

Until FIFO support is available, only standard queues can be created through the explorer.
