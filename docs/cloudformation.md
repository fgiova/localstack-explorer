# CloudFormation Service Guide

CloudFormation is a fully implemented service in LocalStack Explorer. It supports stack lifecycle management (create, update, delete), template viewing and editing with Monaco Editor, stack events timeline, resource inspection with cross-service navigation, and automatic polling for in-progress operations.

## Features

- List stacks with search by name and filter by status category
- Create stacks with inline template editor (Monaco, JSON/YAML) or S3 template URL
- Update stacks with pre-loaded template and parameters
- Delete stacks with confirmation dialog
- View stack details: overview, parameters, outputs, resources, events, and template
- Template viewer with Monaco Editor (read-only, JSON/YAML syntax highlighting)
- Events timeline with color-coded status badges
- Resources tab with clickable cross-service navigation links (S3, SQS, SNS, IAM)
- Auto-refresh polling (5s) when any stack has an IN_PROGRESS status
- Dynamic parameter extraction from template body (JSON and basic YAML)

## API Endpoints

All endpoints are prefixed with `/api/cloudformation`.

### Stacks

| Method | Path                       | Description       | Request                                                        | Response                                |
|--------|----------------------------|-------------------|----------------------------------------------------------------|-----------------------------------------|
| GET    | `/`                        | List stacks       | --                                                             | `{ stacks: [...] }`                     |
| POST   | `/`                        | Create stack      | `{ stackName, templateBody?, templateURL?, parameters? }`      | `{ message: string, stackId?: string }` |
| GET    | `/:stackName`              | Stack detail      | --                                                             | `StackDetail`                           |
| PUT    | `/:stackName`              | Update stack      | `{ stackName, templateBody?, templateURL?, parameters? }`      | `{ message: string, stackId?: string }` |
| DELETE | `/:stackName`              | Delete stack      | --                                                             | `{ success: boolean }`                  |
| GET    | `/:stackName/events`       | Stack events      | --                                                             | `{ events: [...] }`                     |
| GET    | `/:stackName/template`     | Stack template    | --                                                             | `{ templateBody: string }`              |

### Request/Response Examples

**List stacks:**

```bash
curl http://localhost:3001/api/cloudformation
```

```json
{
  "stacks": [
    {
      "stackId": "arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc-123",
      "stackName": "my-stack",
      "status": "CREATE_COMPLETE",
      "creationTime": "2026-03-28T10:00:00.000Z",
      "lastUpdatedTime": "2026-03-28T10:01:00.000Z",
      "description": "My example stack"
    }
  ]
}
```

**Create stack with template body:**

```bash
curl -X POST http://localhost:3001/api/cloudformation \
  -H "Content-Type: application/json" \
  -d '{
    "stackName": "my-stack",
    "templateBody": "{\"AWSTemplateFormatVersion\":\"2010-09-09\",\"Resources\":{\"MyBucket\":{\"Type\":\"AWS::S3::Bucket\"}}}"
  }'
```

```json
{
  "message": "Stack 'my-stack' creation initiated",
  "stackId": "arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc-123"
}
```

**Create stack with template URL:**

```bash
curl -X POST http://localhost:3001/api/cloudformation \
  -H "Content-Type: application/json" \
  -d '{
    "stackName": "my-stack",
    "templateURL": "http://localhost:4566/my-bucket/template.json"
  }'
```

**Create stack with parameters:**

```bash
curl -X POST http://localhost:3001/api/cloudformation \
  -H "Content-Type: application/json" \
  -d '{
    "stackName": "my-stack",
    "templateBody": "...",
    "parameters": [
      { "parameterKey": "BucketName", "parameterValue": "my-custom-bucket" }
    ]
  }'
```

**Get stack detail:**

```bash
curl http://localhost:3001/api/cloudformation/my-stack
```

```json
{
  "stackId": "arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc-123",
  "stackName": "my-stack",
  "status": "CREATE_COMPLETE",
  "creationTime": "2026-03-28T10:00:00.000Z",
  "description": "My example stack",
  "outputs": [
    { "outputKey": "BucketArn", "outputValue": "arn:aws:s3:::my-bucket", "description": "Bucket ARN" }
  ],
  "parameters": [
    { "parameterKey": "BucketName", "parameterValue": "my-custom-bucket" }
  ],
  "resources": [
    {
      "logicalResourceId": "MyBucket",
      "physicalResourceId": "my-custom-bucket",
      "resourceType": "AWS::S3::Bucket",
      "resourceStatus": "CREATE_COMPLETE"
    }
  ]
}
```

**Update stack:**

```bash
curl -X PUT http://localhost:3001/api/cloudformation/my-stack \
  -H "Content-Type: application/json" \
  -d '{
    "stackName": "my-stack",
    "templateBody": "{\"AWSTemplateFormatVersion\":\"2010-09-09\",\"Resources\":{...}}",
    "parameters": [
      { "parameterKey": "BucketName", "parameterValue": "updated-bucket" }
    ]
  }'
```

```json
{
  "message": "Stack 'my-stack' update initiated",
  "stackId": "arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc-123"
}
```

**Get stack events:**

```bash
curl http://localhost:3001/api/cloudformation/my-stack/events
```

```json
{
  "events": [
    {
      "eventId": "evt-123",
      "logicalResourceId": "MyBucket",
      "resourceType": "AWS::S3::Bucket",
      "resourceStatus": "CREATE_COMPLETE",
      "timestamp": "2026-03-28T10:00:30.000Z",
      "resourceStatusReason": null
    }
  ]
}
```

**Get stack template:**

```bash
curl http://localhost:3001/api/cloudformation/my-stack/template
```

```json
{
  "templateBody": "{\"AWSTemplateFormatVersion\":\"2010-09-09\",\"Resources\":{...}}"
}
```

**Delete stack:**

```bash
curl -X DELETE http://localhost:3001/api/cloudformation/my-stack
```

```json
{
  "success": true
}
```

## Error Handling

The CloudFormation service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                       | Status | Error Code         |
|--------------------------------|--------|--------------------|
| Stack not found                | 404    | `STACK_NOT_FOUND`  |
| Missing template source        | 400    | `VALIDATION_ERROR` |
| Update on non-existent stack   | 404    | `STACK_NOT_FOUND`  |

All errors return a consistent JSON shape:

```json
{
  "error": "STACK_NOT_FOUND",
  "message": "Stack 'missing-stack' not found",
  "statusCode": 404
}
```

## Backend Implementation

The CloudFormation plugin consists of four files in `packages/backend/src/plugins/cloudformation/`:

| File          | Purpose                                                                             |
|---------------|-------------------------------------------------------------------------------------|
| `index.ts`    | Plugin registration -- creates the CloudFormation client and service, registers routes |
| `service.ts`  | `CloudFormationService` class -- business logic wrapping AWS SDK calls               |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                           |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                         |

### CloudFormationService Methods

| Method                                                    | AWS SDK Command                | Description                                      |
|-----------------------------------------------------------|--------------------------------|--------------------------------------------------|
| `listStacks()`                                            | `ListStacksCommand`            | Returns stacks filtered by active statuses       |
| `getStack(stackName)`                                     | `DescribeStacksCommand` + `ListStackResourcesCommand` | Returns stack detail with outputs, parameters, and resources |
| `createStack(stackName, templateBody?, templateURL?, parameters?)` | `CreateStackCommand`  | Creates a stack from template body or URL        |
| `updateStack(stackName, templateBody?, templateURL?, parameters?)` | `UpdateStackCommand`  | Updates a stack's template and/or parameters     |
| `deleteStack(stackName)`                                  | `DeleteStackCommand`           | Initiates stack deletion                         |
| `getStackEvents(stackName)`                               | `DescribeStackEventsCommand`   | Returns all stack events                         |
| `getTemplate(stackName)`                                  | `GetTemplateCommand`           | Returns the stack's template body                |

### Stack Status Filtering

The `listStacks` method filters by these statuses to show only relevant stacks:

- `CREATE_COMPLETE`, `UPDATE_COMPLETE`
- `CREATE_IN_PROGRESS`, `UPDATE_IN_PROGRESS`
- `ROLLBACK_COMPLETE`, `ROLLBACK_IN_PROGRESS`
- `DELETE_IN_PROGRESS`

Stacks in `DELETE_COMPLETE` status are excluded from the list.

### Template Source Validation

`createStack` validates that at least one of `templateBody` or `templateURL` is provided. If neither is given, it throws a 400 `VALIDATION_ERROR`. Both can be provided simultaneously (AWS CloudFormation behavior: `TemplateBody` takes precedence).

## Frontend Components

The CloudFormation frontend is in `packages/frontend/src/components/cloudformation/` and `packages/frontend/src/routes/cloudformation/`.

| Component              | Description                                                                         |
|------------------------|-------------------------------------------------------------------------------------|
| `StackList`            | Table of stacks with search, status filter, create dialog, delete with confirmation, and auto-refresh |
| `StackCreateDialog`    | Modal dialog with Monaco editor for template (JSON/YAML), S3 URL input, and dynamic parameter form |
| `StackUpdateDialog`    | Modal dialog pre-loaded with current template and parameters for editing            |
| `StackDetail`          | Tabbed view: Overview, Parameters, Outputs, Resources, Events, Template             |
| `StackFilters`         | Search by name input and status category dropdown filter                            |
| `TemplateViewer`       | Read-only Monaco editor with JSON/YAML auto-detection                               |
| `EventsTimeline`       | Event table with color-coded status badges and in-progress indicator                |
| `ResourceList`         | Resource table with cross-service navigation links                                  |

### Routes

| Route                            | Component       | Description                      |
|----------------------------------|-----------------|----------------------------------|
| `/cloudformation`                | `StackList`     | List and manage stacks           |
| `/cloudformation/:stackName`     | `StackDetail`   | Stack detail with tabbed view    |

### StackList Features

- **Search**: Client-side filtering by stack name (case-insensitive)
- **Status filter**: Dropdown with categories: All, Complete, In Progress, Failed/Rollback
- **Create button**: Opens `StackCreateDialog`
- **Delete button**: Per-row trash icon with confirmation dialog (disabled for `DELETE_IN_PROGRESS` stacks)
- **Auto-refresh**: Polls every 5 seconds when any stack has an `IN_PROGRESS` status (spinning RefreshCw icon indicator)
- **Clickable names**: Stack names link to the detail page

### StackDetail Tabs

| Tab          | Component          | Description                                                    |
|--------------|--------------------|----------------------------------------------------------------|
| Overview     | (inline)           | Stack metadata: name, ID, status, description, dates           |
| Parameters   | (inline)           | Table of parameter key/value pairs                             |
| Outputs      | (inline)           | Table of output key/value/description                          |
| Resources    | `ResourceList`     | Resource table with cross-service navigation                   |
| Events       | `EventsTimeline`   | Chronological event list with status badges                    |
| Template     | `TemplateViewer`   | Read-only Monaco editor with syntax highlighting               |

### StackCreateDialog

The create dialog includes:

- **Stack name** input field
- **Template source tabs**: "Template Body" (Monaco Editor) / "Template URL" (text input for S3 URL)
- **Monaco Editor**: JSON/YAML with auto-detected language, dark theme, 300px height
- **Dynamic parameters**: When the template body changes, the dialog attempts to parse parameter names from the JSON `Parameters` section (or basic YAML detection) and auto-populates key fields
- **Manual parameters**: Add/remove key-value pairs manually
- **Validation**: Create button disabled when stack name or template source is empty

### StackUpdateDialog

Same layout as the create dialog but:

- No stack name input (already known)
- Pre-loads the current template from `useGetTemplate()`
- Pre-populates parameters from `useGetStack()`
- Uses `useUpdateStack()` mutation

### Cross-Service Resource Navigation

The `ResourceList` component maps CloudFormation resource types to internal routes:

| Resource Type        | Navigation Target                                  |
|----------------------|----------------------------------------------------|
| `AWS::S3::Bucket`    | `/s3/{physicalResourceId}`                         |
| `AWS::SQS::Queue`    | `/sqs/{queueName}` (extracted from URL/ARN)        |
| `AWS::SNS::Topic`    | `/sns/{topicName}` (extracted from ARN)            |
| `AWS::IAM::User`     | `/iam`                                             |
| Other types          | Physical ID displayed as plain text (no link)      |

### React Query Hooks

All hooks are in `packages/frontend/src/api/cloudformation.ts`:

| Hook / Function                      | Type     | Query Key / Notes                                               |
|--------------------------------------|----------|-----------------------------------------------------------------|
| `useListStacks(refetchInterval?)`    | Query    | `["cloudformation", "stacks"]`; optional polling interval       |
| `useGetStack(stackName)`             | Query    | `["cloudformation", "stack", stackName]`                        |
| `useGetStackEvents(stackName)`       | Query    | `["cloudformation", "events", stackName]`                       |
| `useGetTemplate(stackName)`          | Query    | `["cloudformation", "template", stackName]`                     |
| `useCreateStack()`                   | Mutation | Invalidates `["cloudformation", "stacks"]`                      |
| `useUpdateStack()`                   | Mutation | Invalidates stacks list + individual stack                      |
| `useDeleteStack()`                   | Mutation | Invalidates `["cloudformation", "stacks"]`                      |

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, update, or delete operation.

### Auto-Refresh Polling

The `useListStacks` hook accepts an optional `refetchInterval` parameter. The `StackList` component passes `5000` (5 seconds) when any visible stack has an `IN_PROGRESS` status, and `false` otherwise. This ensures the list stays up-to-date during stack operations without unnecessary polling when all stacks are in terminal states.
