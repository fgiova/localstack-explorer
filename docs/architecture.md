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
└──────────┬──────────────────┘
           │  /api/* (proxy in dev,
           │         same origin in prod)
           ▼
┌─────────────────────────────┐
│     Fastify API (:3001)     │
│                             │
│  ┌───────┐ ┌───────┐ ┌──────┐│
│  │  S3   │ │  SQS  │ │ SNS  ││  ← Fastify plugins
│  │plugin │ │plugin │ │plugin││
│  └───┬───┘ └───┬───┘ └──┬───┘│
│      │         │            │
│  ┌───▼─────────▼──────┐     │
│  │  AWS SDK v3 Clients │    │
│  └─────────┬───────────┘    │
└────────────┼────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   LocalStack (:4566)        │
│   S3·SQS·SNS·IAM·CF·CFN    │
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

```
src/
├── index.ts              # Creates server, autoloads plugins
├── config.ts             # env-schema validated configuration
├── aws/clients.ts        # AWS SDK client factories
├── shared/
│   ├── errors.ts         # AppError class, global error handler
│   └── types.ts          # Shared TypeBox schemas
└── plugins/              # Auto-discovered by @fastify/autoload
    ├── s3/               # Complete implementation
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
    ├── iam/              # Scaffold
    ├── cloudfront/       # Scaffold
    └── cloudformation/   # Scaffold
```

> **Important:** Plugin entry points (`index.ts`) must export a plain async function — **not** wrapped with `fastify-plugin`. Autoload needs encapsulation enabled to apply directory-based route prefixes.

### Plugin Internal Layering

Each plugin follows a three-layer architecture:

```
Route Handler → Service → AWS SDK Client
```

- **Routes** handle HTTP concerns: request parsing, validation, status codes, response serialization.
- **Service** contains business logic: orchestrating AWS SDK calls, mapping responses, handling domain errors.
- **AWS Client** is injected into the service via the constructor, making the service testable with mocks.

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

### AWS Client Configuration

All clients share a common configuration pointing to LocalStack:

- **Endpoint**: `LOCALSTACK_ENDPOINT` environment variable (default `http://localhost:4566`)
- **Region**: `us-east-1`
- **Credentials**: `test` / `test` (LocalStack dummy credentials)
- **S3 special**: `forcePathStyle: true` (required for LocalStack S3)

Client factories in `aws/clients.ts` centralize this configuration.

## Frontend Architecture

### Component Hierarchy

```
main.tsx
 └── QueryClientProvider
      └── RouterProvider
           └── __root.tsx (Layout)
                ├── Sidebar
                ├── Header (breadcrumbs)
                └── <Outlet /> (page content)
                     ├── index.tsx (Dashboard)
                     ├── s3/index.tsx (BucketList)
                     ├── s3/$bucketName.tsx (ObjectBrowser)
                     ├── sqs/index.tsx (QueueList)
                     ├── sqs/$queueName.tsx (QueueDetail)
                     ├── sns/index.tsx (TopicList)
                     ├── sns/$topicName.tsx (TopicDetail)
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

[Zustand](https://zustand-demo.pmnd.rs/) handles client-side UI state that is not tied to server data. Currently it manages sidebar open/closed state. The store is in `src/stores/app.ts`.

### API Client

A thin fetch wrapper in `src/lib/api-client.ts` provides typed methods (`get`, `post`, `put`, `delete`, `upload`) with:

- Automatic JSON serialization/deserialization
- Query parameter handling
- Error normalization via `ApiError` class
- FormData support for file uploads

The client uses `/api` as the base URL, which the Vite dev server proxies to the backend.

### UI Components

The component library is built on [Shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives + Tailwind CSS):

- **Primitive components** (`src/components/ui/`) — Button, Dialog, Table, Input, Card, Badge, Breadcrumb, etc. These are copied into the project (not imported from a package) for full customization control.
- **Layout components** (`src/components/layout/`) — Sidebar and Header, shared across all pages.
- **Feature components** (`src/components/<service>/`) — Service-specific components like `BucketList`, `ObjectBrowser`.

Styling uses **Tailwind CSS v4** with CSS custom properties for theming. The `cn()` utility (clsx + tailwind-merge) handles conditional class composition.

## Data Flow

A typical read operation (e.g., listing S3 buckets):

```
1. User navigates to /s3
2. TanStack Router renders BucketList component
3. BucketList calls useListBuckets() hook
4. React Query checks cache → if stale, fires GET /api/s3
5. Vite proxy forwards to localhost:3001/api/s3
6. Fastify matches the route in the S3 plugin
7. Route handler calls s3Service.listBuckets()
8. S3Service sends ListBucketsCommand to LocalStack via AWS SDK
9. Response flows back: SDK → Service → Route → HTTP → React Query → Component
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
