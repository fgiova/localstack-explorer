# LocalStack Explorer

A full-stack web dashboard for managing AWS resources exposed through [LocalStack](https://localstack.cloud). Built with Fastify, React, and the AWS SDK v3.

LocalStack Explorer provides an AWS Console-like experience for your local development environment, letting you browse, create, and manage resources without leaving the browser.

## Supported Services

| Service        | Status            | Description                        |
|----------------|-------------------|------------------------------------|
| S3             | Fully implemented | Buckets, objects, upload/download  |
| SQS            | Scaffold          | Queue management (coming soon)     |
| SNS            | Scaffold          | Topic & subscription management    |
| IAM            | Scaffold          | User, role, and policy management  |
| CloudFront     | Scaffold          | Distribution management            |
| CloudFormation | Scaffold          | Stack & template management        |

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** (for LocalStack)

### Installation

```bash
git clone <repository-url>
cd localstack-explorer
pnpm install
```

### Start LocalStack

```bash
docker compose up -d
```

This starts LocalStack with all required services (S3, SQS, SNS, IAM, CloudFront, CloudFormation) on `http://localhost:4566`.

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

### Test

```bash
pnpm test
```

## Configuration

The backend uses [env-schema](https://github.com/fastify/env-schema) for environment variable validation with `.env` file support.

| Variable              | Default                   | Description              |
|-----------------------|---------------------------|--------------------------|
| `PORT`                | `3001`                    | Backend server port      |
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566`   | LocalStack endpoint URL  |

Create a `.env` file in `packages/backend/` to override defaults.

## Project Structure

```
localstack-explorer/
├── packages/
│   ├── backend/            # Fastify API server
│   │   └── src/
│   │       ├── index.ts        # Entry point (autoload plugins)
│   │       ├── config.ts       # env-schema configuration
│   │       ├── aws/            # AWS SDK client factories
│   │       ├── plugins/        # Auto-loaded plugins (one per service)
│   │       │   ├── s3/         # Complete implementation
│   │       │   ├── sqs/        # Scaffold
│   │       │   ├── sns/        # Scaffold
│   │       │   ├── iam/        # Scaffold
│   │       │   ├── cloudfront/ # Scaffold
│   │       │   └── cloudformation/ # Scaffold
│   │       └── shared/         # Error handling, shared types
│   └── frontend/           # React SPA
│       └── src/
│           ├── routes/         # TanStack Router file-based routes
│           ├── components/     # UI components (Shadcn/ui + custom)
│           ├── api/            # TanStack Query hooks
│           ├── stores/         # Zustand state management
│           └── lib/            # Utilities and API client
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
| Testing          | Vitest, React Testing Library           |

## Documentation

- **[S3 Service Guide](docs/s3-service.md)** — Complete reference for S3 operations: buckets, objects, upload/download, and API endpoints.
- **[Adding New Services](docs/adding-new-services.md)** — Step-by-step guide to implement a new AWS service following the established plugin pattern.
- **[Architecture](docs/architecture.md)** — System design, backend plugin pattern, frontend data flow, and project conventions.
- **[Development Guide](docs/development.md)** — Local setup, testing, coding standards, and contribution workflow.

## License

MIT
