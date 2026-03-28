# CloudFront Service Guide

CloudFront is a fully implemented service in LocalStack Explorer. It supports distribution lifecycle management (create, update, delete), multi-origin configuration, cache behavior management, and cache invalidations. A detail page with tabbed navigation provides full visibility into distribution configuration.

> **Note:** CloudFront requires **LocalStack Pro**. The Community edition does not support CloudFront APIs. If you are running LocalStack Community, the service will return a 501 error with a link to the LocalStack coverage documentation.

## Features

- List distributions with search by ID or domain name
- Create distributions with multiple origins and custom cache behavior
- Update distribution settings (comment, enabled state, default root object)
- Delete distributions with confirmation dialog
- View distribution details across four tabs: General, Origins, Behaviors, Invalidations
- Create and list cache invalidations with path patterns
- Status badges with color coding (Deployed, InProgress)
- ETag-based optimistic concurrency for update and delete operations

## API Endpoints

All endpoints are prefixed with `/api/cloudfront`.

### Distributions

| Method | Path                | Description            | Request                                          | Response                    |
|--------|---------------------|------------------------|--------------------------------------------------|-----------------------------|
| GET    | `/`                 | List distributions     | --                                               | `{ distributions: [...] }` |
| GET    | `/:distributionId`  | Distribution detail    | --                                               | `DistributionDetail`        |
| POST   | `/`                 | Create distribution    | `CreateDistributionBody`                         | `{ message: string }`       |
| PUT    | `/:distributionId`  | Update distribution    | `{ comment?, enabled?, defaultRootObject? }`     | `{ message: string }`       |
| DELETE | `/:distributionId`  | Delete distribution    | --                                               | `{ success: boolean }`      |

### Invalidations

| Method | Path                                  | Description            | Request              | Response               |
|--------|---------------------------------------|------------------------|----------------------|------------------------|
| GET    | `/:distributionId/invalidations`      | List invalidations     | --                   | `{ invalidations: [...] }` |
| POST   | `/:distributionId/invalidations`      | Create invalidation    | `{ paths: string[] }`| `{ message: string }`  |

### Request/Response Examples

**List distributions:**

```bash
curl http://localhost:3001/api/cloudfront
```

```json
{
  "distributions": [
    {
      "id": "E1A2B3C4D5E6F7",
      "domainName": "d111111abcdef8.cloudfront.net",
      "status": "Deployed",
      "enabled": true,
      "originsCount": 2,
      "lastModified": "2026-03-28T10:00:00.000Z"
    }
  ]
}
```

**Create distribution:**

```bash
curl -X POST http://localhost:3001/api/cloudfront \
  -H "Content-Type: application/json" \
  -d '{
    "origins": [
      {
        "id": "my-origin",
        "domainName": "example.com",
        "originPath": "",
        "protocolPolicy": "match-viewer",
        "httpPort": 80,
        "httpsPort": 443
      }
    ],
    "defaultCacheBehavior": {
      "pathPattern": "*",
      "targetOriginId": "my-origin",
      "viewerProtocolPolicy": "allow-all",
      "allowedMethods": ["GET", "HEAD"],
      "cachedMethods": ["GET", "HEAD"],
      "defaultTTL": 86400,
      "maxTTL": 31536000,
      "minTTL": 0,
      "compress": false
    },
    "comment": "My distribution",
    "enabled": true,
    "defaultRootObject": "index.html"
  }'
```

```json
{
  "message": "Distribution created successfully"
}
```

**Get distribution detail:**

```bash
curl http://localhost:3001/api/cloudfront/E1A2B3C4D5E6F7
```

```json
{
  "id": "E1A2B3C4D5E6F7",
  "arn": "arn:aws:cloudfront::000000000000:distribution/E1A2B3C4D5E6F7",
  "domainName": "d111111abcdef8.cloudfront.net",
  "status": "Deployed",
  "enabled": true,
  "comment": "My distribution",
  "defaultRootObject": "index.html",
  "origins": [
    {
      "id": "my-origin",
      "domainName": "example.com",
      "originPath": "",
      "httpPort": 80,
      "httpsPort": 443,
      "protocolPolicy": "match-viewer"
    }
  ],
  "defaultCacheBehavior": {
    "pathPattern": "*",
    "targetOriginId": "my-origin",
    "viewerProtocolPolicy": "allow-all",
    "allowedMethods": ["GET", "HEAD"],
    "cachedMethods": ["GET", "HEAD"],
    "defaultTTL": 86400,
    "maxTTL": 31536000,
    "minTTL": 0,
    "compress": false
  },
  "cacheBehaviors": [],
  "lastModified": "2026-03-28T10:00:00.000Z"
}
```

**Update distribution:**

```bash
curl -X PUT http://localhost:3001/api/cloudfront/E1A2B3C4D5E6F7 \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Updated description",
    "enabled": false
  }'
```

```json
{
  "message": "Distribution updated successfully"
}
```

**Delete distribution:**

```bash
curl -X DELETE http://localhost:3001/api/cloudfront/E1A2B3C4D5E6F7
```

```json
{
  "success": true
}
```

**List invalidations:**

```bash
curl http://localhost:3001/api/cloudfront/E1A2B3C4D5E6F7/invalidations
```

```json
{
  "invalidations": [
    {
      "id": "I1A2B3C4D5E6F7",
      "status": "Completed",
      "createTime": "2026-03-28T11:00:00.000Z",
      "paths": ["/images/*", "/css/*"]
    }
  ]
}
```

**Create invalidation:**

```bash
curl -X POST http://localhost:3001/api/cloudfront/E1A2B3C4D5E6F7/invalidations \
  -H "Content-Type: application/json" \
  -d '{
    "paths": ["/images/*", "/index.html"]
  }'
```

```json
{
  "message": "Invalidation created successfully"
}
```

## Error Handling

The CloudFront service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                              | Status | Error Code                 |
|---------------------------------------|--------|----------------------------|
| Distribution not found                | 404    | `DISTRIBUTION_NOT_FOUND`   |
| Distribution not disabled for delete  | 409    | `DISTRIBUTION_NOT_DISABLED`|
| Invalid origin configuration          | 400    | `INVALID_ORIGIN`           |
| Concurrent modification (ETag)        | 409    | `PRECONDITION_FAILED`      |
| Too many invalidations in progress    | 429    | `TOO_MANY_INVALIDATIONS`   |
| Service not available (Community)     | 501    | `SERVICE_NOT_AVAILABLE`    |

All errors return a consistent JSON shape:

```json
{
  "error": "DISTRIBUTION_NOT_FOUND",
  "message": "Distribution not found",
  "statusCode": 404
}
```

## Backend Implementation

The CloudFront plugin consists of four files in `packages/backend/src/plugins/cloudfront/`:

| File          | Purpose                                                                            |
|---------------|------------------------------------------------------------------------------------|
| `index.ts`    | Plugin registration -- creates the CloudFront client and service, registers routes |
| `service.ts`  | `CloudFrontService` class -- business logic wrapping AWS SDK calls                 |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                          |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                        |

### CloudFrontService Methods

| Method                                          | AWS SDK Command                | Description                                             |
|-------------------------------------------------|--------------------------------|---------------------------------------------------------|
| `listDistributions()`                           | `ListDistributionsCommand`     | Returns all distributions as summaries                  |
| `getDistribution(id)`                           | `GetDistributionCommand`       | Returns full distribution detail with origins/behaviors |
| `createDistribution(config)`                    | `CreateDistributionCommand`    | Creates a distribution with origins and cache behavior  |
| `updateDistribution(id, config)`                | `GetDistribution` + `UpdateDistributionCommand` | Fetches ETag, merges config, updates     |
| `deleteDistribution(id)`                        | `GetDistribution` + `DeleteDistributionCommand` | Fetches ETag, then deletes               |
| `listInvalidations(distributionId)`             | `ListInvalidationsCommand` + `GetInvalidationCommand` | Lists invalidations with path details |
| `createInvalidation(distributionId, paths)`     | `CreateInvalidationCommand`    | Creates a cache invalidation for given paths            |

### ETag Concurrency Control

Update and delete operations use ETag-based optimistic concurrency:

1. `GetDistributionCommand` fetches the current distribution and its `ETag`
2. The `ETag` is passed as `IfMatch` to `UpdateDistributionCommand` or `DeleteDistributionCommand`
3. If the distribution was modified between the get and update/delete, a `PreconditionFailed` error (409) is returned

### Delete Requirements

CloudFront requires a distribution to be **disabled** before it can be deleted. If you attempt to delete an enabled distribution, you will receive a 409 `DISTRIBUTION_NOT_DISABLED` error. To delete:

1. Update the distribution with `"enabled": false`
2. Wait for the status to change to `Deployed`
3. Delete the distribution

## Frontend Components

The CloudFront frontend is in `packages/frontend/src/components/cloudfront/` and `packages/frontend/src/routes/cloudfront/`.

| Component              | Description                                                                          |
|------------------------|--------------------------------------------------------------------------------------|
| `DistributionList`     | Table of distributions with search, create dialog (multi-origin), delete confirmation|
| `DistributionDetail`   | Tabbed view: General, Origins, Behaviors, Invalidations                              |

### Routes

| Route                              | Component            | Description                              |
|------------------------------------|----------------------|------------------------------------------|
| `/cloudfront`                      | `DistributionList`   | List and manage distributions            |
| `/cloudfront/:distributionId`      | `DistributionDetail` | Distribution detail with tabbed view     |

### DistributionList Features

- **Search**: Client-side filtering by distribution ID or domain name (case-insensitive)
- **Create button**: Opens a multi-section dialog with General, Origins, and Default Cache Behavior configuration
- **Delete button**: Per-row trash icon with confirmation dialog (includes warning about disabling before delete)
- **Status badges**: Color-coded -- "Deployed" (green), "InProgress" (secondary), other (outline)
- **Enabled badges**: "Enabled" (default) / "Disabled" (destructive)
- **Clickable IDs**: Distribution IDs link to the detail page

### Create Distribution Dialog

The create dialog has three sections:

- **General**: Comment, Default Root Object, Enabled toggle (Switch)
- **Origins**: Dynamic list of origins with Add/Remove. Each origin has: ID, Domain Name, Origin Path, Protocol Policy (select), HTTP Port, HTTPS Port. Starts with one origin by default.
- **Default Cache Behavior**: Target Origin ID, Viewer Protocol Policy (select), Allowed Methods (comma-separated), Cached Methods (comma-separated), TTL values (Default/Max/Min), Compress toggle

### DistributionDetail Tabs

| Tab            | Description                                                                     |
|----------------|---------------------------------------------------------------------------------|
| General        | Distribution metadata: ID, ARN, Domain Name, Status, Comment, Default Root Object, Enabled, Last Modified |
| Origins        | Table of configured origins: ID, Domain Name, Origin Path, Protocol Policy, Ports |
| Behaviors      | Table of cache behaviors: Default behavior + additional behaviors with Path Pattern, Target Origin, Protocol Policy, Methods, TTLs, Compress |
| Invalidations  | Table of invalidations with Create Invalidation button and dialog (textarea for paths, one per line) |

### React Query Hooks

All hooks are in `packages/frontend/src/api/cloudfront.ts`:

| Hook / Function                        | Type     | Query Key / Notes                                                  |
|----------------------------------------|----------|--------------------------------------------------------------------|
| `useListDistributions()`               | Query    | `["cloudfront", "distributions"]`                                  |
| `useGetDistribution(distributionId)`   | Query    | `["cloudfront", "distribution", distributionId]`                   |
| `useListInvalidations(distributionId)` | Query    | `["cloudfront", "invalidations", distributionId]`                  |
| `useCreateDistribution()`              | Mutation | Invalidates `["cloudfront", "distributions"]`                      |
| `useUpdateDistribution(distributionId)`| Mutation | Invalidates distributions list + individual distribution           |
| `useDeleteDistribution()`              | Mutation | Invalidates `["cloudfront", "distributions"]`                      |
| `useCreateInvalidation(distributionId)`| Mutation | Invalidates `["cloudfront", "invalidations", distributionId]`      |

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, update, or delete operation.

## TypeBox Schemas

The schemas in `packages/backend/src/plugins/cloudfront/schemas.ts` define both validation and TypeScript types:

| Schema                           | Purpose                                      |
|----------------------------------|----------------------------------------------|
| `OriginSchema`                   | Single origin definition (id, domain, ports, protocol) |
| `CacheBehaviorSchema`            | Cache behavior (path, origin, methods, TTLs, compress) |
| `DistributionSummarySchema`      | List view summary fields                     |
| `DistributionDetailSchema`       | Full distribution with origins and behaviors |
| `InvalidationSchema`             | Invalidation with paths                      |
| `DistributionListResponseSchema` | Response wrapper for distribution list       |
| `InvalidationListResponseSchema` | Response wrapper for invalidation list       |
| `CreateDistributionBodySchema`   | Create request body validation               |
| `UpdateDistributionBodySchema`   | Update request body validation               |
| `CreateInvalidationBodySchema`   | Create invalidation request body             |
| `DistributionParamsSchema`       | Route parameter validation (distributionId)  |
| `DeleteResponseSchema`           | Delete operation response                    |
| `MessageResponseSchema`          | Generic success message response             |
