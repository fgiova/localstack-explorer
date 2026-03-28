# SQS Service Guide

SQS is a fully implemented service in LocalStack Explorer. It supports queue management, message send/receive with real long polling, message deletion, queue attributes inspection, and queue purging.

## Features

- List, create, and delete queues
- View queue attributes (message counts, visibility timeout, delay, retention, etc.)
- Send messages with optional delay and custom message attributes
- JSON editor (Monaco, lazy-loaded) for composing message bodies with validation, formatting, and auto-minification on send
- Receive messages with configurable long polling (WaitTimeSeconds 0--20, default 20)
- Two receive modes: **Single Poll** (one-shot, replaces results) and **Continuous** (start/stop loop, accumulates results)
- Configurable MaxNumberOfMessages (1--10, default 1)
- Immediate abort of in-flight receive requests (frontend AbortController + backend AbortSignal propagation to AWS SDK)
- Delete individual messages
- Purge all messages from a queue
- Search/filter queues by name

## API Endpoints

All endpoints are prefixed with `/api/sqs`.

### Queues

| Method | Path                       | Description       | Request             | Response                  |
|--------|----------------------------|-------------------|---------------------|---------------------------|
| GET    | `/`                        | List queues       | --                  | `{ queues: [...] }`       |
| POST   | `/`                        | Create queue      | `{ name: string }`  | `{ message: string }`     |
| DELETE | `/:queueName`              | Delete queue      | --                  | `{ success: boolean }`    |
| POST   | `/:queueName/purge`        | Purge queue       | --                  | `{ success: boolean }`    |
| GET    | `/:queueName/attributes`   | Queue attributes  | --                  | `QueueDetailResponse`     |

### Messages

| Method | Path                       | Description       | Request / Query Params                                         | Response                     |
|--------|----------------------------|-------------------|----------------------------------------------------------------|------------------------------|
| POST   | `/:queueName/messages`     | Send message      | `{ body, delaySeconds?, messageAttributes? }`                  | `{ messageId: string }`      |
| GET    | `/:queueName/messages`     | Receive messages  | `?maxMessages=1-10&waitTimeSeconds=0-20`                       | `{ messages: [...] }`        |
| DELETE | `/:queueName/messages`     | Delete message    | `{ receiptHandle: string }`                                    | `{ success: boolean }`       |

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

**Get queue attributes:**

```bash
curl http://localhost:3001/api/sqs/my-queue/attributes
```

```json
{
  "queueUrl": "http://localhost:4566/000000000000/my-queue",
  "queueName": "my-queue",
  "queueArn": "arn:aws:sqs:us-east-1:000000000000:my-queue",
  "approximateNumberOfMessages": 5,
  "approximateNumberOfMessagesNotVisible": 0,
  "approximateNumberOfMessagesDelayed": 0,
  "visibilityTimeout": 30,
  "maximumMessageSize": 262144,
  "messageRetentionPeriod": 345600,
  "delaySeconds": 0,
  "receiveMessageWaitTimeSeconds": 0
}
```

**Send message:**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "Hello, World!", "delaySeconds": 5}'
```

**Send message with attributes:**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/messages \
  -H "Content-Type: application/json" \
  -d '{
    "body": "{\"event\": \"order.created\", \"orderId\": 123}",
    "messageAttributes": {
      "eventType": { "DataType": "String", "StringValue": "order.created" }
    }
  }'
```

**Receive messages (long polling, 20s wait, up to 5 messages):**

```bash
curl "http://localhost:3001/api/sqs/my-queue/messages?maxMessages=5&waitTimeSeconds=20"
```

```json
{
  "messages": [
    {
      "messageId": "abc-123",
      "body": "Hello, World!",
      "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS...",
      "messageAttributes": {
        "eventType": { "DataType": "String", "StringValue": "order.created" }
      }
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

**Purge queue:**

```bash
curl -X POST http://localhost:3001/api/sqs/my-queue/purge
```

## Long Polling & Abort

The receive messages endpoint implements real SQS long polling. The `waitTimeSeconds` parameter (0--20, default 20) controls how long the server holds the connection open waiting for messages to become available.

When a client disconnects (e.g., user clicks Stop), the abort is propagated through the entire chain:

1. **Frontend**: `AbortController.abort()` cancels the `fetch` request immediately
2. **Backend route**: Fastify 5 exposes `request.signal` which fires on client disconnect
3. **Service**: The `abortSignal` is passed to `client.send(command, { abortSignal })`
4. **AWS SDK**: The `ReceiveMessageCommand` is aborted immediately, releasing the connection

This ensures no resources are wasted on long-polling requests that the user no longer needs.

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
| `index.ts`    | Plugin registration -- creates the SQS client and service, registers routes         |
| `service.ts`  | `SQSService` class -- business logic wrapping AWS SDK calls                         |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                           |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                         |

### SQSService Methods

| Method                                          | AWS SDK Command             | Description                                    |
|-------------------------------------------------|-----------------------------|------------------------------------------------|
| `getQueueUrl(name)`                             | `GetQueueUrlCommand`        | Resolves queue name to URL                     |
| `listQueues()`                                  | `ListQueuesCommand`         | Returns all queues                             |
| `createQueue(name)`                             | `CreateQueueCommand`        | Creates a new queue                            |
| `deleteQueue(queueUrl)`                         | `DeleteQueueCommand`        | Deletes a queue                                |
| `purgeQueue(queueUrl)`                          | `PurgeQueueCommand`         | Removes all messages from a queue              |
| `getQueueDetail(queueName)`                     | `GetQueueAttributesCommand` | Returns all queue attributes                   |
| `sendMessage(name, body, delay?, attrs?)`       | `SendMessageCommand`        | Sends a message with optional delay/attributes |
| `receiveMessages(name, max?, wait?, signal?)`   | `ReceiveMessageCommand`     | Long-polls for messages, supports AbortSignal  |
| `deleteMessage(name, receiptHandle)`            | `DeleteMessageCommand`      | Deletes a message by receipt handle            |

The `receiveMessages` method accepts an optional `AbortSignal` parameter. When the signal fires (client disconnect), the in-flight `ReceiveMessageCommand` is aborted immediately via the AWS SDK's `{ abortSignal }` option. Defaults: `maxMessages=1`, `waitTimeSeconds=20`.

## Frontend Components

The SQS frontend is in `packages/frontend/src/components/sqs/` and `packages/frontend/src/routes/sqs/`.

| Component              | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| `QueueList`            | Table of queues with search, create dialog, and delete with confirmation |
| `QueueCreateDialog`    | Modal dialog for creating a new queue                                  |
| `QueueDetail`          | Tabbed view: Attributes, Send Message, Messages. Includes purge action |
| `SendMessageForm`      | Message body (textarea or Monaco JSON editor), delay, message attributes |
| `MessageViewer`        | Receive messages with Single Poll / Continuous modes and long polling   |

### Routes

| Route                | Component       | Description                      |
|----------------------|-----------------|----------------------------------|
| `/sqs`               | `QueueList`     | List and manage queues           |
| `/sqs/:queueName`    | `QueueDetail`   | Queue detail with tabbed view    |

### QueueDetail Tabs

| Tab          | Description                                                      |
|--------------|------------------------------------------------------------------|
| Attributes   | Queue configuration and message count metrics                    |
| Send Message | Compose and send messages with optional JSON editor              |
| Messages     | Receive, view, and delete messages with configurable polling     |

### MessageViewer -- Receive Modes

| Mode        | Trigger        | Behavior                                                     |
|-------------|----------------|--------------------------------------------------------------|
| Single Poll | "Poll" button  | One long-poll request; results **replace** previous messages |
| Continuous  | "Start"/"Stop" | Loops long-poll requests; results **accumulate**             |

Both modes support immediate abort via the "Stop" button, which cancels the in-flight HTTP request and propagates the abort to the backend.

**Configuration controls:**

- **Mode switch**: Toggle between Single Poll and Continuous
- **Max Messages** (1--10, default 1): How many messages to retrieve per poll
- **Wait Time** (1, 2, 5, 10, 15, 20 seconds, default 20): Long-poll duration per request

### SendMessageForm -- JSON Editor

The send form includes an optional JSON editor, toggled via a switch:

- **Monaco Editor** loaded lazily (`React.lazy` + `Suspense`) to keep the initial bundle small (~3 MB loaded on demand)
- **Real-time validation**: JSON syntax errors shown inline; Send button disabled on invalid JSON
- **Format button**: pretty-prints the JSON in the editor (indented with 2 spaces)
- **Minification on send**: JSON is minified (`JSON.stringify(JSON.parse(body))`) before being sent to the backend
- **Toggle protection**: switching to JSON mode is blocked if the current textarea content is not valid JSON

### React Query Hooks

All hooks are in `packages/frontend/src/api/sqs.ts`:

| Hook / Function              | Type     | Query Key / Notes                                    |
|------------------------------|----------|------------------------------------------------------|
| `useListQueues()`            | Query    | `["sqs", "queues"]`                                  |
| `useQueueAttributes(name)`   | Query    | `["sqs", "attributes", queueName]`                   |
| `useReceiveMessages(name)`   | Query    | `["sqs", "messages", queueName]`                     |
| `receiveMessagesPoll(...)`   | Function | Plain async; supports `AbortSignal` for cancellation |
| `useCreateQueue()`           | Mutation | Invalidates `["sqs", "queues"]`                      |
| `useDeleteQueue()`           | Mutation | Invalidates `["sqs", "queues"]`                      |
| `usePurgeQueue()`            | Mutation | Invalidates messages + attributes                    |
| `useSendMessage(name)`       | Mutation | Invalidates messages + attributes                    |
| `useDeleteMessage(name)`     | Mutation | Invalidates messages + attributes                    |

`receiveMessagesPoll()` is a plain async function (not a React Query hook) to allow manual control over the polling loop and abort behavior. It accepts an optional `AbortSignal` parameter.

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, delete, send, or purge operation.

## FIFO Queues -- Planned

FIFO (First-In-First-Out) queues are not yet supported. The codebase includes `TODO` markers in the relevant places to guide future implementation. When added, the following will be required:

- Queue creation: `name` must end in `.fifo`; pass `FifoQueue: "true"` as an attribute
- Queue attributes: surface `FifoQueue` and `ContentBasedDeduplication`
- Send message: support `MessageGroupId` (required) and `MessageDeduplicationId` (optional)
- Receive message: return `SequenceNumber` for ordering guarantees
