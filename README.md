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
| Lambda         | Fully implemented | Functions CRUD, invoke, code/config update, versions, aliases     |
| CloudFormation | Fully implemented | Stack CRUD, update, template editor, events, cross-service links  |
| DynamoDB       | Fully implemented | Table management, create, list, detail views                      |

## Quick Start

### Prerequisites

- **Node.js** >= 24 (see `.nvmrc`)
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

This starts LocalStack with all required services (S3, SQS, SNS, IAM, Lambda, CloudFormation, DynamoDB) on `http://localhost:4566`.

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

### Docker

A pre-built multi-arch image is available on Docker Hub:

```bash
docker run -d -p 3001:3001 \
  -e LOCALSTACK_ENDPOINT=http://host.docker.internal:4566 \
  fgiova/localstack-explorer:latest
```

Then open [http://localhost:3001](http://localhost:3001).

To build the Docker image locally for multiple platforms and push to a registry:

```bash
docker buildx build --push --platform linux/arm64,linux/amd64 --tag yourname/localstack-explorer:latest .
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

| Variable              | Default                                  | Description                               |
|-----------------------|------------------------------------------|-------------------------------------------|
| `PORT`                | `3001`                                   | Backend server port                       |
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566`                  | Default LocalStack endpoint URL           |
| `LOCALSTACK_REGION`   | `us-east-1`                              | Default AWS region for LocalStack clients |
| `ENABLED_SERVICES`    | `s3,sqs,sns,iam,lambda,cloudformation,dynamodb` | Comma-separated list of enabled services  |

Create a `.env` file in `packages/backend/` to override defaults.

### Runtime Region & Endpoint Selection

Region and endpoint can be changed at runtime from the UI without restarting the server:

- **Region selector** — a dropdown in the header lists all 30 AWS regions. The change takes effect immediately for all subsequent API calls.
- **Endpoint modal** — click the connection indicator (server icon) in the header to enter a custom LocalStack endpoint. The modal tests connectivity against `GET /api/health` (which returns `{ connected, error? }`) and only allows saving after a successful test.
- **Auto-detection** — if the configured endpoint is unreachable at startup, the endpoint modal opens automatically so you can enter a valid URL.
- **Server defaults** — on first load (before the user has ever changed settings), the frontend fetches `defaultEndpoint` and `defaultRegion` from `GET /api/services` and applies them. This means the values of `LOCALSTACK_ENDPOINT` and `LOCALSTACK_REGION` configured on the server are always reflected in the UI for new sessions.

Each browser tab maintains its own endpoint and region settings (persisted in `localStorage`), so you can connect multiple tabs to different LocalStack instances simultaneously. Once a user explicitly changes endpoint or region via the UI, those values take precedence over server defaults.

### Selective Service Enablement

By default, only a subset of services is enabled. You can control which services are available by setting the `ENABLED_SERVICES` environment variable to a comma-separated list of service names:

```bash
# Enable only S3 and SQS
ENABLED_SERVICES=s3,sqs

# Enable all available services
ENABLED_SERVICES=s3,sqs,sns,iam,lambda,cloudformation,dynamodb
```

Available service names: `s3`, `sqs`, `sns`, `iam`, `lambda`, `cloudformation`, `dynamodb`.

When a service is disabled:
- Its backend API routes are **not registered** (requests return 404)
- Its card is **hidden** from the dashboard
- Its entry is **removed** from the sidebar navigation

The frontend fetches the list of enabled services from the `GET /api/services` endpoint at startup and filters the UI accordingly.

### Active Service Detection

The health endpoint (`GET /api/health`) queries LocalStack's native `/_localstack/health` API and returns the list of services that are actually running. The frontend uses this data (refreshed every 30 seconds) to visually disable services that are configured but not currently active on the LocalStack instance — they appear greyed out and are not clickable.

## Project Structure

```
localstack-explorer/
├── bundle/                 # tsup bundle output (build:bundle)
├── packages/
│   ├── backend/            # Fastify API server
│   │   └── src/
│   │       ├── index.ts        # App factory (autoload plugins, serves frontend)
│   │       ├── server.ts       # Server entry point (starts listening)
│   │       ├── bundle.ts       # Bundle entry point (explicit plugin imports)
│   │       ├── config.ts       # env-schema configuration
│   │       ├── health.ts       # LocalStack connectivity check
│   │       ├── aws/            # AWS SDK client factories & cache
│   │       ├── plugins/        # Auto-loaded plugins (one per service)
│   │       │   ├── s3/         # Complete implementation
│   │       │   ├── sqs/        # Complete implementation
│   │       │   ├── sns/        # Complete implementation
│   │       │   ├── iam/        # Complete implementation
│   │       │   ├── lambda/     # Complete implementation
│   │       │   ├── cloudformation/ # Complete implementation
│   │       │   └── dynamodb/  # Complete implementation
│   │       └── shared/         # Error handling, shared types
│   └── frontend/           # React SPA
│       └── src/
│           ├── routes/         # TanStack Router file-based routes
│           ├── components/     # UI components (Shadcn/ui + custom)
│           │   └── settings/   # Region selector, endpoint modal
│           ├── api/            # TanStack Query hooks
│           ├── stores/         # Zustand state management (app + config)
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

| Layer            | Technology                               |
|------------------|------------------------------------------|
| Monorepo         | pnpm workspaces                          |
| Backend          | Fastify 5, TypeScript                    |
| Frontend         | React 19, Vite 6, TypeScript             |
| UI Components    | Shadcn/ui, Radix UI, Tailwind CSS 4      |
| State Management | Zustand 5                                |
| Data Fetching    | TanStack Query 5                         |
| Routing          | TanStack Router 1 (file-based)           |
| AWS SDK          | @aws-sdk/* v3                            |
| Validation       | TypeBox 1                                |
| Config           | env-schema (with dotenv)                 |
| Plugin Loading   | @fastify/autoload                        |
| Static Serving   | @fastify/static (standalone/bundle mode) |
| Bundler          | tsup (single-file CJS bundle)            |
| Desktop          | Electron 33, electron-builder            |
| Testing          | Vitest, React Testing Library            |

## Documentation

- **[S3 Service Guide](docs/s3-service.md)** — Complete reference for S3 operations: buckets, objects, upload/download, and API endpoints.
- **[SQS Service Guide](docs/sqs.md)** — Complete reference for SQS operations: queue management, message send/receive/delete, queue attributes, and purge.
- **[SNS Service Guide](docs/sns.md)** — Complete reference for SNS operations: topics, subscriptions, publish (single/batch), filter policies, and tags.
- **[IAM Service Guide](docs/iam.md)** — Complete reference for IAM operations: users, groups, managed/inline policies, access keys, policy versioning, and cascading deletes.
- **[Lambda Service Guide](docs/lambda.md)** — Complete reference for Lambda operations: functions CRUD, invoke with log output, code/config updates, versions, and aliases.
- **[CloudFormation Service Guide](docs/cloudformation.md)** — Complete reference for CloudFormation operations: stack CRUD, update, template editor, events timeline, and cross-service resource navigation.
- **[DynamoDB Service Guide](docs/dynamodb.md)** — Complete reference for DynamoDB operations: table management, creation, listing, and detail views.
- **[Adding New Services](docs/adding-new-services.md)** — Step-by-step guide to implement a new AWS service following the established plugin pattern.
- **[Architecture](docs/architecture.md)** — System design, backend plugin pattern, frontend data flow, and project conventions.
- **[Development Guide](docs/development.md)** — Local setup, testing, coding standards, and contribution workflow.

## License

MIT
