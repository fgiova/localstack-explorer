# Lambda Service Guide

Lambda is a fully implemented service in LocalStack Explorer. It supports function management, code and configuration updates, synchronous invocation with log output, and browsing of versions and aliases.

## Features

- List, create, and delete Lambda functions
- View function details (configuration, environment variables, layers, architectures)
- Update function code (zip upload or S3 reference)
- Update function configuration (handler, runtime, memory, timeout, environment, role)
- Invoke functions synchronously with JSON payload
- View invocation results: status code, response payload, function errors, and decoded CloudWatch logs
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

Four tabs:

1. **Configuration** — attribute grid (runtime, handler, role, memory, timeout, code size, state, package type, architectures, SHA256) and environment variables table
2. **Invoke** — JSON payload textarea, invocation type selector (RequestResponse, Event, DryRun), result panel with status code, payload, error, and decoded log output
3. **Versions** — table of published versions with version number, ARN, runtime, and last modified date
4. **Aliases** — table of aliases with name, ARN, function version, and description

## Backend Architecture

The Lambda plugin follows the standard service plugin pattern:

```
packages/backend/src/plugins/lambda/
├── index.ts       # Plugin registration (5 lines)
├── routes.ts      # 9 Fastify routes
├── service.ts     # LambdaService class wrapping @aws-sdk/client-lambda
└── schemas.ts     # TypeBox request/response schemas
```

The `LambdaService` class maps AWS SDK exceptions to `AppError` instances with appropriate HTTP status codes via a centralized `mapLambdaError` function.
