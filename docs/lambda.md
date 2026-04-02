# Lambda Service Guide

Lambda is a fully implemented service in LocalStack Explorer. It supports function management, code and configuration updates, synchronous invocation with log output, triggers, versions, and aliases.

## Features

- List, create, and delete Lambda functions
- View function details (configuration, environment variables, layers, architectures)
- Update function code (zip upload or S3 reference)
- Update function configuration (handler, runtime, memory, timeout, environment, role)
- Invoke functions synchronously with JSON payload
- View invocation results: status code, response payload, function errors, and decoded CloudWatch logs
- **Triggers**: view all trigger sources for a function
  - **Resource-based policy triggers** (S3, SNS, API Gateway, EventBridge, etc.) — detected from the function's resource policy via `GetPolicy`
  - **Event source mappings** (SQS, DynamoDB Streams, Kinesis, etc.) — with create and delete support
- Browse function versions
- Browse function aliases
- Search/filter functions by name
- Active service detection: Lambda appears greyed out in the UI when not running on LocalStack

## API Endpoints

All endpoints are prefixed with `/api/lambda`.

### Functions

| Method | Path                          | Description              | Request                        | Response                       |
|--------|-------------------------------|--------------------------|--------------------------------|--------------------------------|
| GET    | `/`                           | List functions           | `?marker=string`               | `{ functions: [...] }`         |
| POST   | `/`                           | Create function          | `CreateFunctionBody`           | `{ message: string }`         |
| GET    | `/:functionName`              | Get function detail      | --                             | `FunctionDetail`               |
| PUT    | `/:functionName/code`         | Update function code     | `{ zipFile?, s3Bucket?, s3Key? }` | `{ message: string }`      |
| PUT    | `/:functionName/config`       | Update function config   | `UpdateFunctionConfigBody`     | `{ message: string }`         |
| DELETE | `/:functionName`              | Delete function          | --                             | `{ success: boolean }`        |

### Invocation

| Method | Path                          | Description              | Request                        | Response                       |
|--------|-------------------------------|--------------------------|--------------------------------|--------------------------------|
| POST   | `/:functionName/invoke`       | Invoke function          | `{ payload?, invocationType? }` | `InvokeFunctionResponse`      |

### Triggers

| Method | Path                                       | Description                    | Request                                          | Response                                  |
|--------|--------------------------------------------|--------------------------------|--------------------------------------------------|-------------------------------------------|
| GET    | `/:functionName/triggers`                  | List all triggers              | `?marker=string`                                 | `{ eventSourceMappings, policyTriggers }` |
| POST   | `/:functionName/event-source-mappings`     | Create event source mapping    | `{ eventSourceArn, batchSize?, enabled?, ... }`  | `{ message, uuid }`                      |
| DELETE | `/event-source-mappings/:uuid`             | Delete event source mapping    | --                                               | `{ success: boolean }`                   |

The `GET /:functionName/triggers` endpoint combines two data sources:
- **Event source mappings** — Lambda's `ListEventSourceMappings` (SQS queues, DynamoDB Streams, Kinesis streams)
- **Policy triggers** — parsed from the function's resource-based policy via `GetPolicy` (S3 bucket notifications, SNS topics, API Gateway, EventBridge rules, etc.)

### Versions & Aliases

| Method | Path                          | Description              | Request                        | Response                       |
|--------|-------------------------------|--------------------------|--------------------------------|--------------------------------|
| GET    | `/:functionName/versions`     | List versions            | `?marker=string`               | `{ versions: [...] }`         |
| GET    | `/:functionName/aliases`      | List aliases             | `?marker=string`               | `{ aliases: [...] }`          |

### Request/Response Examples

**List functions:**

```bash
curl http://localhost:3001/api/lambda
```

```json
{
  "functions": [
    {
      "functionName": "my-function",
      "functionArn": "arn:aws:lambda:us-east-1:000000000000:function:my-function",
      "runtime": "nodejs20.x",
      "handler": "index.handler",
      "codeSize": 284,
      "lastModified": "2024-01-15T10:30:00.000+0000",
      "memorySize": 128,
      "timeout": 30
    }
  ]
}
```

**Create function:**

```bash
curl -X POST http://localhost:3001/api/lambda \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "my-function",
    "runtime": "nodejs20.x",
    "handler": "index.handler",
    "role": "arn:aws:iam::000000000000:role/lambda-role",
    "code": { "zipFile": "<base64-encoded-zip>" },
    "memorySize": 128,
    "timeout": 30
  }'
```

```json
{ "message": "Function 'my-function' created successfully" }
```

**Invoke function:**

```bash
curl -X POST http://localhost:3001/api/lambda/my-function/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "{\"key\": \"value\"}",
    "invocationType": "RequestResponse"
  }'
```

```json
{
  "statusCode": 200,
  "payload": "{\"statusCode\":200,\"body\":\"hello\"}",
  "logResult": "START RequestId: ...\nEND RequestId: ...\n"
}
```

**Get function detail:**

```bash
curl http://localhost:3001/api/lambda/my-function
```

```json
{
  "functionName": "my-function",
  "functionArn": "arn:aws:lambda:us-east-1:000000000000:function:my-function",
  "runtime": "nodejs20.x",
  "handler": "index.handler",
  "role": "arn:aws:iam::000000000000:role/lambda-role",
  "codeSize": 284,
  "description": "My Lambda function",
  "timeout": 30,
  "memorySize": 128,
  "lastModified": "2024-01-15T10:30:00.000+0000",
  "codeSha256": "abc123...",
  "version": "$LATEST",
  "environment": { "NODE_ENV": "production" },
  "architectures": ["x86_64"],
  "layers": [],
  "packageType": "Zip"
}
```

**List triggers:**

```bash
curl http://localhost:3001/api/lambda/my-function/triggers
```

```json
{
  "eventSourceMappings": [
    {
      "uuid": "abc-123",
      "eventSourceArn": "arn:aws:sqs:us-east-1:000000000000:my-queue",
      "state": "Enabled",
      "batchSize": 10
    }
  ],
  "policyTriggers": [
    {
      "sid": "AllowS3Invoke",
      "service": "s3.amazonaws.com",
      "sourceArn": "arn:aws:s3:::my-bucket"
    }
  ]
}
```

**Create event source mapping:**

```bash
curl -X POST http://localhost:3001/api/lambda/my-function/event-source-mappings \
  -H "Content-Type: application/json" \
  -d '{
    "eventSourceArn": "arn:aws:sqs:us-east-1:000000000000:my-queue",
    "batchSize": 10,
    "enabled": true
  }'
```

```json
{ "message": "Event source mapping created successfully", "uuid": "abc-123" }
```

**Delete function:**

```bash
curl -X DELETE http://localhost:3001/api/lambda/my-function
```

```json
{ "success": true }
```

## Error Handling

| Error                           | HTTP Status | Code                 |
|---------------------------------|-------------|----------------------|
| Function not found              | 404         | `FUNCTION_NOT_FOUND` |
| Function already exists / in use | 409        | `FUNCTION_CONFLICT`  |
| Event source mapping not found  | 404         | `EVENT_SOURCE_MAPPING_NOT_FOUND` |
| Invalid parameter value         | 400         | `INVALID_PARAMETER`  |
| Rate limit exceeded             | 429         | `TOO_MANY_REQUESTS`  |
| AWS service error               | 502         | `SERVICE_ERROR`      |

## UI Components

### Function List (`/lambda`)

- Searchable table with columns: Name, Runtime, Memory, Timeout, Last Modified
- Function name links to detail view
- Create button opens a dialog with fields for name, runtime, handler, role, memory, timeout, and optional zip upload
- Per-row delete button with confirmation dialog

### Function Detail (`/lambda/:functionName`)

Five tabs:

1. **Configuration** — attribute grid (runtime, handler, role, memory, timeout, code size, state, package type, architectures, SHA256) and environment variables table
2. **Invoke** — JSON payload textarea, invocation type selector (RequestResponse, Event, DryRun), result panel with status code, payload, error, and decoded log output
3. **Triggers** — two sections:
   - **Resource-Based Policy Triggers** — read-only table showing services (S3, SNS, API Gateway, etc.) authorized to invoke the function, with source ARN and policy statement ID. Detected automatically from the function's resource-based policy.
   - **Event Source Mappings** — table of SQS/DynamoDB Streams/Kinesis mappings with state, batch size, and last modified. Supports creating new mappings (event source ARN + batch size) and deleting existing ones with confirmation dialog.
4. **Versions** — table of published versions with version number, ARN, runtime, and last modified date
5. **Aliases** — table of aliases with name, ARN, function version, and description

## Backend Architecture

The Lambda plugin follows the standard service plugin pattern:

```
packages/backend/src/plugins/lambda/
├── index.ts       # Plugin registration (5 lines)
├── routes.ts      # 12 Fastify routes
├── service.ts     # LambdaService class wrapping @aws-sdk/client-lambda
└── schemas.ts     # TypeBox request/response schemas
```

The `LambdaService` class maps AWS SDK exceptions to `AppError` instances with appropriate HTTP status codes via a centralized `mapLambdaError` function.
