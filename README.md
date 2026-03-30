# LocalStack Explorer

A full-stack web dashboard for managing AWS resources exposed through [LocalStack](https://localstack.cloud). Built with Fastify, React, and the AWS SDK v3.

LocalStack Explorer provides an AWS Console-like experience for your local development environment, letting you browse, create, and manage resources without leaving the browser.

## Supported Services

| Service        | Status            | Description                                                       |
|----------------|-------------------|-------------------------------------------------------------------|
| S3             | Fully implemented | Buckets, objects, upload/download                                 |
| SQS            | Fully implemented | Queue management, message operations, queue attributes, purge     |
| SNS            | Fully implemented | Topics, subscriptions, publish, tags, filter policies              |
| IAM            | Fully implemented | Users, groups, managed/inline policies, access keys, versioning   |
| CloudFront     | Fully implemented | Distribution create, update, delete, list, detail (**Pro only**)  |
| CloudFormation | Fully implemented | Stack CRUD, update, template editor, events, cross-service links  |
| DynamoDB       | Fully implemented | Table management, create, list, detail views                      |

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** (for LocalStack)

### Installation

```bash
git clone https://github.com/fgiova/localstack-explorer.git
cd localstack-explorer
pnpm install
```

### Start LocalStack

```bash
docker compose up -d
```

This starts LocalStack with all required services (S3, SQS, SNS, IAM, CloudFront, CloudFormation, DynamoDB) on `http://localhost:4566`.

### Development

Start both backend and frontend in parallel:

```bash
pnpm dev
```

Or start them separately:

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd packages/backend && pnpm dev

# Terminal 2 — Frontend (http://localhost:5173)
cd packages/frontend && pnpm dev
```

The frontend dev server proxies `/api` requests to the backend automatically.

### Build

```bash
pnpm build
```

### Standalone Build (single server)

Build backend and frontend together, then run with a single `node` command. The backend serves the frontend static files automatically.

```bash
pnpm run build:standalone
pnpm start
# → http://localhost:3001
```

### Desktop App (Electron)

Package the application as a native desktop app:

```bash
pnpm run build:desktop
```

Output in `packages/desktop/out/` (DMG on macOS, AppImage on Linux, NSIS on Windows).

### Test

```bash
pnpm test
```

## Configuration

The backend uses [env-schema](https://github.com/fastify/env-schema) for environment variable validation with `.env` file support.

| Variable              | Default                          | Description                              |
|-----------------------|----------------------------------|------------------------------------------|
| `PORT`                | `3001`                           | Backend server port                      |
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566`          | LocalStack endpoint URL                  |
| `LOCALSTACK_REGION`   | `us-east-1`                     | AWS region for LocalStack clients        |
| `ENABLED_SERVICES`    | `s3,sqs,sns,iam,cloudformation,dynamodb` | Comma-separated list of enabled services |

Create a `.env` file in `packages/backend/` to override defaults.

### Selective Service Enablement

By default, only a subset of services is enabled. You can control which services are available by setting the `ENABLED_SERVICES` environment variable to a comma-separated list of service names:

```bash
# Enable only S3 and SQS
ENABLED_SERVICES=s3,sqs

# Enable all available services
ENABLED_SERVICES=s3,sqs,sns,iam,cloudfront,cloudformation,dynamodb
```

Available service names: `s3`, `sqs`, `sns`, `iam`, `cloudfront` (requires [LocalStack Pro](https://localstack.cloud/pricing)), `cloudformation`, `dynamodb`.

When a service is disabled:
- Its backend API routes are **not registered** (requests return 404)
- Its card is **hidden** from the dashboard
- Its entry is **removed** from the sidebar navigation

The frontend fetches the list of enabled services from the `GET /api/services` endpoint at startup and filters the UI accordingly.

## Project Structure

```
localstack-explorer/
├── bundle/                 # tsup bundle output (build:bundle)
├── packages/
│   ├── backend/            # Fastify API server
│   │   └── src/
│   │       ├── index.ts        # Entry point (autoload plugins, serves frontend)
│   │       ├── bundle.ts       # Bundle entry point (explicit plugin imports)
│   │       ├── config.ts       # env-schema configuration
│   │       ├── aws/            # AWS SDK client factories
│   │       ├── plugins/        # Auto-loaded plugins (one per service)
│   │       │   ├── s3/         # Complete implementation
│   │       │   ├── sqs/        # Complete implementation
│   │       │   ├── sns/        # Complete implementation
│   │       │   ├── iam/        # Complete implementation
│   │       │   ├── cloudfront/ # Complete implementation
│   │       │   ├── cloudformation/ # Complete implementation
│   │       │   └── dynamodb/  # Complete implementation
│   │       └── shared/         # Error handling, shared types
│   └── frontend/           # React SPA
│       └── src/
│           ├── routes/         # TanStack Router file-based routes
│           ├── components/     # UI components (Shadcn/ui + custom)
│           ├── api/            # TanStack Query hooks
│           ├── stores/         # Zustand state management
│           └── lib/            # Utilities and API client
│   └── desktop/            # Electron desktop app
│       ├── main.cjs            # Electron main process
│       ├── electron-builder.json
│       └── scripts/            # Build helpers
├── docker-compose.yaml     # LocalStack dev environment
├── package.json            # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json      # Shared TypeScript config
```

## Tech Stack

| Layer            | Technology                              |
|------------------|-----------------------------------------|
| Monorepo         | pnpm workspaces                         |
| Backend          | Fastify 5, TypeScript                   |
| Frontend         | React 19, Vite 6, TypeScript            |
| UI Components    | Shadcn/ui, Radix UI, Tailwind CSS 4     |
| State Management | Zustand 5                               |
| Data Fetching    | TanStack Query 5                        |
| Routing          | TanStack Router 1 (file-based)          |
| AWS SDK          | @aws-sdk/* v3                           |
| Validation       | TypeBox 1                               |
| Config           | env-schema (with dotenv)                |
| Plugin Loading   | @fastify/autoload                       |
| Static Serving   | @fastify/static (standalone/bundle mode)|
| Bundler          | tsup (single-file CJS bundle)           |
| Desktop          | Electron 33, electron-builder           |
| Testing          | Vitest, React Testing Library           |

## Documentation

- **[S3 Service Guide](docs/s3-service.md)** — Complete reference for S3 operations: buckets, objects, upload/download, and API endpoints.
- **[SQS Service Guide](docs/sqs.md)** — Complete reference for SQS operations: queue management, message send/receive/delete, queue attributes, and purge.
- **[SNS Service Guide](docs/sns.md)** — Complete reference for SNS operations: topics, subscriptions, publish (single/batch), filter policies, and tags.
- **[IAM Service Guide](docs/iam.md)** — Complete reference for IAM operations: users, groups, managed/inline policies, access keys, policy versioning, and cascading deletes.
- **[CloudFront Service Guide](docs/cloudfront.md)** — Complete reference for CloudFront operations: distribution create, update, delete, list, and detail views. Requires LocalStack Pro.
- **[CloudFormation Service Guide](docs/cloudformation.md)** — Complete reference for CloudFormation operations: stack CRUD, update, template editor, events timeline, and cross-service resource navigation.
- **[DynamoDB Service Guide](docs/dynamodb.md)** — Complete reference for DynamoDB operations: table management, creation, listing, and detail views.
- **[Adding New Services](docs/adding-new-services.md)** — Step-by-step guide to implement a new AWS service following the established plugin pattern.
- **[Architecture](docs/architecture.md)** — System design, backend plugin pattern, frontend data flow, and project conventions.
- **[Development Guide](docs/development.md)** — Local setup, testing, coding standards, and contribution workflow.

## License

MIT
