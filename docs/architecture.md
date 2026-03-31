# Architecture

This document describes the system design and key architectural decisions in LocalStack Explorer.

## High-Level Overview

```
┌─────────────────────────────┐
│         Browser             │
│   React SPA (Vite, :5173)   │
│                             │
│  TanStack Router + Query    │
│  Zustand · Shadcn/ui        │
│  ┌────────────────────────┐ │
│  │ Config Store (per-tab) │ │
│  │ endpoint + region      │ │
│  │ → localStorage         │ │
│  └────────────────────────┘ │
└──────────┬──────────────────┘
           │  /api/* + headers:
           │  x-localstack-endpoint
           │  x-localstack-region
           ▼
┌─────────────────────────────┐
│     Fastify API (:3001)     │
│                             │
│  ┌────────────────────────┐ │
│  │ localstack-config      │ │  ← extracts headers → request.localstackConfig
│  │ client-cache (LRU)     │ │  ← caches clients per endpoint+region
│  └────────────────────────┘ │
│  ┌───────┐ ┌───────┐ ┌──────┐│
│  │  S3   │ │  SQS  │ │ SNS  ││  ← Fastify plugins
│  │plugin │ │plugin │ │plugin││
│  └───┬───┘ └───┬───┘ └──┬───┘│
│      │         │            │
│  ┌───▼─────────▼──────┐     │
│  │  ClientCache        │    │
│  │  (AWS SDK v3)       │    │
│  └─────────┬───────────┘    │
└────────────┼────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   LocalStack (:4566)        │
│  S3·SQS·SNS·IAM·CFN·DDB    │
└─────────────────────────────┘
```

## Monorepo Structure

The project uses **pnpm workspaces** with two packages:

| Package              | Purpose          | Entry Point      |
|----------------------|------------------|------------------|
| `packages/backend`   | REST API server  | `src/index.ts`   |
| `packages/frontend`  | React SPA        | `src/main.tsx`   |

A shared `tsconfig.base.json` at the root ensures consistent TypeScript settings. Each package extends it with package-specific overrides.

## Backend Architecture

### Fastify Plugin Pattern

Every AWS service is encapsulated as a **Fastify plugin** under `src/plugins/`. Plugins are auto-discovered at startup by [`@fastify/autoload`](https://github.com/fastify/fastify-autoload) — the directory name becomes the URL prefix (e.g., `plugins/s3/` → `/api/s3`). This provides:

- **Isolation**: Each service has its own routes, schemas, and business logic
- **Encapsulation**: Plugins can register their own middleware (e.g., S3 registers `@fastify/multipart`)
- **Independent lifecycle**: Plugins can be added or removed without affecting others
- **Selective enablement**: The `ENABLED_SERVICES` configuration controls which plugins are loaded at startup via autoload's `matchFilter`. Disabled services are not registered at all — no routes, no overhead

```
src/
├── index.ts              # Creates server, autoloads plugins
├── config.ts             # env-schema validated configuration
├── health.ts             # LocalStack connectivity check
├── aws/
│   ├── clients.ts        # AWS SDK client factories (legacy, used by tests)
│   └── client-cache.ts   # ClientCache — LRU cache of AWS clients per endpoint+region
├── shared/
│   ├── errors.ts         # AppError class, global error handler
│   └── types.ts          # Shared TypeBox schemas
└── plugins/
    ├── localstack-config.ts  # Extracts x-localstack-endpoint/region headers → request.localstackConfig
    ├── client-cache.ts       # Registers ClientCache as fastify.clientCache decorator
    ├── s3/               # Complete implementation (auto-discovered by @fastify/autoload)
    │   ├── index.ts      # Plugin entry (default export async fn)
    │   ├── schemas.ts    # TypeBox input/output schemas
    │   ├── service.ts    # Business logic (AWS SDK calls)
    │   └── routes.ts     # HTTP route definitions
    ├── sqs/              # Complete implementation (same structure as s3/)
    │   ├── index.ts      # Plugin entry — creates SQS client and service
    │   ├── schemas.ts    # TypeBox schemas for queues and messages
    │   ├── service.ts    # SQSService — queue and message operations
    │   └── routes.ts     # Queue CRUD, purge, attributes, send/receive/delete messages
    ├── sns/              # Complete implementation (same structure as s3/, sqs/)
    │   ├── index.ts      # Plugin entry — creates SNS client and service
    │   ├── schemas.ts    # TypeBox schemas for topics, subscriptions, publish, tags
    │   ├── service.ts    # SNSService — topic, subscription, publish, and tag operations
    │   └── routes.ts     # Topic CRUD, subscriptions, publish single/batch, tags
    ├── cloudformation/   # Complete implementation (same structure)
    │   ├── index.ts      # Plugin entry — creates CloudFormation client and service
    │   ├── schemas.ts    # TypeBox schemas for stacks, events, templates
    │   ├── service.ts    # CloudFormationService — stack CRUD, update, events, template
    │   └── routes.ts     # Stack CRUD, update, events, template retrieval
    ├── dynamodb/         # Complete implementation
    │   ├── index.ts      # Plugin entry — creates DynamoDB, Document, and Streams clients
    │   ├── schemas.ts    # TypeBox schemas for tables, items, indexes, streams, PartiQL
    │   ├── service.ts    # DynamoDBService — table, item, GSI, stream, and PartiQL operations
    │   └── routes.ts     # Table CRUD, item CRUD, batch, GSI, PartiQL, streams
    └── iam/              # Scaffold
```

> **Important:** Plugin entry points (`index.ts`) must export a plain async function — **not** wrapped with `fastify-plugin`. Autoload needs encapsulation enabled to apply directory-based route prefixes.

### Plugin Internal Layering

Each plugin follows a three-layer architecture:

```
Route Handler → Service → AWS SDK Client (from ClientCache)
```

- **Routes** handle HTTP concerns: request parsing, validation, status codes, response serialization. Each route handler obtains the appropriate AWS clients from `request.server.clientCache.getClients(request.localstackConfig.endpoint, request.localstackConfig.region)` and instantiates the service per-request.
- **Service** contains business logic: orchestrating AWS SDK calls, mapping responses, handling domain errors.
- **AWS Client** is injected into the service via the constructor, making the service testable with mocks. Clients are obtained per-request from the `ClientCache` based on the endpoint and region headers sent by the frontend.

### Schema Validation

[TypeBox](https://github.com/sinclairzx81/typebox) schemas are defined once in `schemas.ts` and serve two purposes:

1. **Runtime validation** — Fastify uses them to validate request params, query, body, and response shape.
2. **Type inference** — TypeScript types are derived from schemas using `Static<typeof Schema>`, ensuring the validation logic and type definitions never diverge.

### Error Handling

A centralized error handler in `shared/errors.ts` catches all errors and returns a consistent JSON envelope:

```json
{ "error": "ERROR_CODE", "message": "Human-readable message", "statusCode": 404 }
```

The `AppError` class is used throughout services to throw domain-specific errors (e.g., `BUCKET_NOT_FOUND`, `NOT_IMPLEMENTED`). AWS SDK errors are caught and mapped to `AppError` instances with appropriate HTTP status codes.

### Configuration

Environment variables are validated at startup using [env-schema](https://github.com/fastify/env-schema) with `.env` file support (via dotenv). Invalid or missing required variables cause an immediate startup failure with a clear error message.

The `ENABLED_SERVICES` variable controls which service plugins are loaded. The `config.ts` module parses the comma-separated value into a typed array of `ServiceName` values, which is then used by `index.ts` to build a `matchFilter` for `@fastify/autoload`. A dedicated endpoint (`GET /api/services`) exposes the enabled list, `defaultEndpoint`, and `defaultRegion` so the frontend can adapt its UI and initialize with the server-configured values.

### AWS Client Configuration

AWS SDK clients are managed by the `ClientCache` (`aws/client-cache.ts`), which caches clients per endpoint+region pair with LRU eviction (max 20 entries). All clients share:

- **Endpoint**: determined per-request from `x-localstack-endpoint` header (default: `LOCALSTACK_ENDPOINT` env var)
- **Region**: determined per-request from `x-localstack-region` header (default: `LOCALSTACK_REGION` env var)
- **Credentials**: `test` / `test` (LocalStack dummy credentials)
- **S3 special**: `forcePathStyle: true` (required for LocalStack S3)

This per-client architecture allows multiple browser tabs to connect to different LocalStack instances (different endpoints and/or regions) simultaneously. The `localstack-config` plugin extracts headers on every request and the `client-cache` plugin provides cached clients to avoid recreating them on each call.

## Frontend Architecture

### Component Hierarchy

```
main.tsx
 └── QueryClientProvider
      └── RouterProvider
           └── __root.tsx (Layout)
                ├── Sidebar
                ├── Header (breadcrumbs, RegionSelector, ConnectionIndicator)
                ├── EndpointModal (controlled by config store)
                ├── ConnectionGuard (auto-opens modal on unreachable endpoint)
                └── <Outlet /> (page content)
                     ├── index.tsx (Dashboard)
                     ├── s3/index.tsx (BucketList)
                     ├── s3/$bucketName.tsx (ObjectBrowser)
                     ├── sqs/index.tsx (QueueList)
                     ├── sqs/$queueName.tsx (QueueDetail)
                     ├── sns/index.tsx (TopicList)
                     ├── sns/$topicName.tsx (TopicDetail)
                     ├── cloudformation/index.tsx (StackList)
                     ├── cloudformation/$stackName.tsx (StackDetail)
                     └── ...service routes
```

### Routing

[TanStack Router](https://tanstack.com/router) is configured with file-based routing. Route files in `src/routes/` are automatically discovered by the Vite plugin, which generates `routeTree.gen.ts` at build/dev time.

Dynamic route parameters use the `$param` convention (e.g., `$bucketName.tsx`).

### Data Fetching

[TanStack Query](https://tanstack.com/query) manages all server state:

- **Queries** fetch data and cache it with a 30-second stale time.
- **Mutations** modify data and automatically invalidate related query cache entries, triggering a refetch.
- **Query keys** follow a hierarchical convention: `[service, resource, ...params]` (e.g., `["s3", "objects", "my-bucket", "images/"]`).

All query hooks are in `src/api/<service>.ts`, one file per service.

### State Management

[Zustand](https://zustand-demo.pmnd.rs/) handles client-side UI state that is not tied to server data:

- **`src/stores/app.ts`** — sidebar open/closed state
- **`src/stores/config.ts`** — LocalStack endpoint, region, and a `userConfigured` flag (all three persisted to `localStorage`), plus ephemeral endpoint modal UI state. On first load, if `userConfigured` is `false`, the store applies server defaults (`defaultEndpoint` and `defaultRegion` from `GET /api/services`) via `applyServerDefaults()` — this reflects the `LOCALSTACK_ENDPOINT`/`LOCALSTACK_REGION` env vars without marking the user as having configured manually. Once the user explicitly changes endpoint or region via the UI, `userConfigured` becomes `true` and server defaults are no longer applied. Each browser tab has its own in-memory state initialized from `localStorage`, allowing tabs to diverge independently.

### API Client

A thin fetch wrapper in `src/lib/api-client.ts` provides typed methods (`get`, `post`, `put`, `delete`, `upload`) with:

- Automatic JSON serialization/deserialization
- Query parameter handling
- Error normalization via `ApiError` class
- FormData support for file uploads
- Automatic injection of `x-localstack-endpoint` and `x-localstack-region` headers from the config store on every request

The client uses `/api` as the base URL, which the Vite dev server proxies to the backend.

### UI Components

The component library is built on [Shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives + Tailwind CSS):

- **Primitive components** (`src/components/ui/`) — Button, Dialog, Table, Input, Card, Badge, Breadcrumb, etc. These are copied into the project (not imported from a package) for full customization control.
- **Layout components** (`src/components/layout/`) — Sidebar and Header, shared across all pages.
- **Settings components** (`src/components/settings/`) — `RegionSelector` (dropdown in header), `EndpointModal` (connection dialog), `ConnectionGuard` (auto-open logic).
- **Feature components** (`src/components/<service>/`) — Service-specific components like `BucketList`, `ObjectBrowser`.

Styling uses **Tailwind CSS v4** with CSS custom properties for theming. The `cn()` utility (clsx + tailwind-merge) handles conditional class composition.

## Data Flow

A typical read operation (e.g., listing S3 buckets):

```
1. User navigates to /s3
2. TanStack Router renders BucketList component
3. BucketList calls useListBuckets() hook
4. React Query checks cache → if stale, fires GET /api/s3
   → api-client injects x-localstack-endpoint + x-localstack-region headers from config store
5. Vite proxy forwards to localhost:3001/api/s3
6. localstack-config plugin extracts headers → request.localstackConfig
7. Fastify matches the route in the S3 plugin
8. Route handler gets S3Client from clientCache.getClients(endpoint, region)
9. Route handler creates S3Service with the client and calls listBuckets()
10. S3Service sends ListBucketsCommand to the target LocalStack via AWS SDK
11. Response flows back: SDK → Service → Route → HTTP → React Query → Component
```

A typical write operation (e.g., deleting a bucket):

```
1. User clicks Delete → confirmation dialog
2. Component calls deleteBucket.mutate("bucket-name")
3. React Query fires DELETE /api/s3/bucket-name
4. Backend validates params, calls s3Service.deleteBucket()
5. On success, React Query invalidates ["s3", "buckets"]
6. Invalidation triggers a refetch of the bucket list
7. UI updates automatically
```

A message send/receive cycle (e.g., SQS):

```
1. User navigates to /sqs/my-queue
2. TanStack Router renders QueueDetail component
3. QueueDetail calls useQueueAttributes() and useReceiveMessages() hooks
4. React Query fires GET /api/sqs/my-queue/attributes and GET /api/sqs/my-queue/messages
5. SQS plugin resolves the queue URL via GetQueueUrlCommand, then fetches data
6. User fills the Send Message form and submits
7. useSendMessage().mutate({ body, delaySeconds }) fires POST /api/sqs/my-queue/messages
8. On success, React Query invalidates ["sqs", "messages", "my-queue"] and ["sqs", "attributes", "my-queue"]
9. QueueDetail re-fetches messages and attributes automatically
```

## Testing Strategy

| Layer    | Tool                           | Approach                                    |
|----------|--------------------------------|---------------------------------------------|
| Backend  | Vitest                         | `fastify.inject()` with mocked services     |
| Frontend | Vitest + React Testing Library | Component rendering with mocked API hooks   |

Backend tests mock the service layer (not the AWS SDK directly), keeping tests fast and focused on HTTP behavior. Frontend tests mock the React Query hooks and wrap components with the necessary providers (QueryClient, Router).
