# Adding New Services

This guide walks through adding a new AWS service to LocalStack Explorer. The architecture is designed so that a new service only requires creating a backend plugin and corresponding frontend components — no changes to shared infrastructure.

We will use a hypothetical **Lambda** service as an example.

## Overview

Adding a service involves these steps:

1. Create a backend plugin (`packages/backend/src/plugins/lambda/`)
2. Add a client factory in `aws/clients.ts`
3. Add a frontend API hook, route, and component
4. Add the service to the sidebar navigation

> **Note:** The backend uses `@fastify/autoload` to auto-discover plugins. Creating a folder under `plugins/` is enough — no manual registration in `index.ts` is needed. The folder name becomes the route prefix (e.g., `plugins/lambda/` → `/api/lambda`).

## Step 1: Backend Plugin

Create four files under `packages/backend/src/plugins/lambda/`:

### `schemas.ts` — TypeBox Validation Schemas

Define schemas for all request inputs and response outputs.

```typescript
import Type, { type Static } from "typebox";

export const FunctionSchema = Type.Object({
  functionName: Type.String(),
  runtime: Type.String(),
  handler: Type.String(),
  lastModified: Type.Optional(Type.String()),
});
export type LambdaFunction = Static<typeof FunctionSchema>;

export const FunctionListResponseSchema = Type.Object({
  functions: Type.Array(FunctionSchema),
});

export const CreateFunctionBodySchema = Type.Object({
  functionName: Type.String({ minLength: 1 }),
  runtime: Type.String(),
  handler: Type.String(),
});

export const FunctionParamsSchema = Type.Object({
  functionName: Type.String(),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
```

### `service.ts` — Business Logic

Wrap the AWS SDK client with methods for each operation.

```typescript
import { LambdaClient, ListFunctionsCommand, /* ... */ } from "@aws-sdk/client-lambda";
import { AppError } from "../../shared/errors.js";

export class LambdaService {
  constructor(private client: LambdaClient) {}

  async listFunctions() {
    const response = await this.client.send(new ListFunctionsCommand({}));
    return {
      functions: (response.Functions ?? []).map((fn) => ({
        functionName: fn.FunctionName ?? "",
        runtime: fn.Runtime ?? "",
        handler: fn.Handler ?? "",
        lastModified: fn.LastModified,
      })),
    };
  }

  async createFunction(params: { functionName: string; runtime: string; handler: string }) {
    // Implementation using CreateFunctionCommand
    throw new AppError("Lambda createFunction not implemented", 501, "NOT_IMPLEMENTED");
  }

  async deleteFunction(functionName: string) {
    // Implementation using DeleteFunctionCommand
    throw new AppError("Lambda deleteFunction not implemented", 501, "NOT_IMPLEMENTED");
  }
}
```

### `routes.ts` — Fastify Route Definitions

Define routes with full schema validation on both input and output.

```typescript
import { FastifyInstance } from "fastify";
import { LambdaService } from "./service.js";
import {
  FunctionListResponseSchema,
  CreateFunctionBodySchema,
  FunctionParamsSchema,
  MessageResponseSchema,
  DeleteResponseSchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function lambdaRoutes(
  app: FastifyInstance,
  opts: { lambdaService: LambdaService }
) {
  const { lambdaService } = opts;

  app.get("/", {
    schema: {
      response: { 200: FunctionListResponseSchema },
    },
    handler: async () => lambdaService.listFunctions(),
  });

  app.post("/", {
    schema: {
      body: CreateFunctionBodySchema,
      response: { 201: MessageResponseSchema, 400: ErrorResponseSchema },
    },
    handler: async (request, reply) => {
      const body = request.body as { functionName: string; runtime: string; handler: string };
      const result = await lambdaService.createFunction(body);
      return reply.status(201).send(result);
    },
  });

  app.delete("/:functionName", {
    schema: {
      params: FunctionParamsSchema,
      response: { 200: DeleteResponseSchema, 404: ErrorResponseSchema },
    },
    handler: async (request) => {
      const { functionName } = request.params as { functionName: string };
      return lambdaService.deleteFunction(functionName);
    },
  });
}
```

### `index.ts` — Plugin Entry Point

Export a default async function. **Do not** wrap with `fastify-plugin` — autoload needs encapsulation enabled to apply the directory-based route prefix.

```typescript
import { FastifyInstance } from "fastify";
import { createLambdaClient } from "../../aws/clients.js";
import { LambdaService } from "./service.js";
import { lambdaRoutes } from "./routes.js";

export default async function lambdaPlugin(app: FastifyInstance) {
  const client = createLambdaClient();
  const lambdaService = new LambdaService(client);
  await app.register(lambdaRoutes, { lambdaService });
}
```

## Step 2: Add Client Factory

Add a factory function in `packages/backend/src/aws/clients.ts`:

```typescript
import { LambdaClient } from "@aws-sdk/client-lambda";

export function createLambdaClient(): LambdaClient {
  return new LambdaClient(commonConfig);
}
```

No manual plugin registration is needed — `@fastify/autoload` discovers the new `plugins/lambda/` folder automatically and registers it with prefix `/api/lambda`.

## Step 3: Register the Service Name

Add the service name to the `ALL_SERVICES` array in `packages/backend/src/config.ts`:

```typescript
const ALL_SERVICES = ["s3", "sqs", "sns", "iam", "cloudfront", "cloudformation", "lambda"] as const;
```

Then update the default value of `ENABLED_SERVICES` in the config schema if the new service should be enabled by default:

```typescript
ENABLED_SERVICES: Type.String({ default: "s3,sqs,sns,iam,cloudformation,lambda" }),
```

This ensures the service is recognized by the selective enablement system. Without this step, the service will be filtered out by the `matchFilter` and its routes will not be registered.

## Step 4: Install SDK Dependency

If the new service requires an AWS SDK package not already installed:

```bash
pnpm --filter @localstack-explorer/backend add @aws-sdk/client-lambda
```

## Step 5: Frontend — API Hooks

Create `packages/frontend/src/api/lambda.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface LambdaFunction {
  functionName: string;
  runtime: string;
  handler: string;
  lastModified?: string;
}

interface ListFunctionsResponse {
  functions: LambdaFunction[];
}

export function useListFunctions() {
  return useQuery({
    queryKey: ["lambda", "functions"],
    queryFn: () => apiClient.get<ListFunctionsResponse>("/lambda"),
  });
}

export function useDeleteFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.delete<{ success: boolean }>(`/lambda/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lambda", "functions"] });
    },
  });
}
```

## Step 6: Frontend — Component and Route

Create the component in `packages/frontend/src/components/lambda/FunctionList.tsx`:

```tsx
import { useListFunctions } from "@/api/lambda";
// Build your UI using components from @/components/ui/
```

Create the route file at `packages/frontend/src/routes/lambda/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { FunctionList } from "@/components/lambda/FunctionList";

export const Route = createFileRoute("/lambda/")({
  component: LambdaPage,
});

function LambdaPage() {
  return <FunctionList />;
}
```

The TanStack Router plugin will automatically pick up the new route file and regenerate `routeTree.gen.ts`.

## Step 7: Add to Sidebar and Dashboard

Edit `packages/frontend/src/components/layout/Sidebar.tsx` and add an entry to the `services` array. The `key` field must match the service name in `ALL_SERVICES` (used for selective enablement filtering):

```typescript
import { Code } from "lucide-react";  // or any appropriate icon

const services = [
  // ...existing services
  { name: "Lambda", key: "lambda", path: "/lambda", icon: Code, description: "Functions" },
];
```

Also add the same entry (with `key` and additional dashboard fields) to the `services` array in `packages/frontend/src/routes/index.tsx`:

```typescript
{ name: "Lambda", key: "lambda", path: "/lambda", icon: Code, description: "Serverless Functions — Manage Lambda functions", color: "text-yellow-600" },
```

The `key` field is critical: the frontend fetches the list of enabled services from `GET /api/services` and uses it to filter which service cards and sidebar entries are visible.

## Checklist

- [ ] Backend: `schemas.ts` with TypeBox schemas for all inputs and outputs
- [ ] Backend: `service.ts` with AWS SDK integration
- [ ] Backend: `routes.ts` with Fastify route definitions and validation
- [ ] Backend: `index.ts` plugin entry point (default export async function, **no** `fastify-plugin` wrapper)
- [ ] Backend: Client factory in `aws/clients.ts`
- [ ] Backend: Service name added to `ALL_SERVICES` in `config.ts`
- [ ] Backend: Default `ENABLED_SERVICES` updated if needed
- [ ] Frontend: API hooks in `src/api/<service>.ts`
- [ ] Frontend: Component(s) in `src/components/<service>/`
- [ ] Frontend: Route file in `src/routes/<service>/index.tsx`
- [ ] Frontend: Added to Sidebar and Dashboard (with `key` field matching service name)
- [ ] Dependencies: Any new `@aws-sdk/client-*` packages installed

## Reference

Use the [S3 plugin](../packages/backend/src/plugins/s3/), the [SQS plugin](../packages/backend/src/plugins/sqs/), the [SNS plugin](../packages/backend/src/plugins/sns/), the [CloudFormation plugin](../packages/backend/src/plugins/cloudformation/), or the [DynamoDB plugin](../packages/backend/src/plugins/dynamodb/) as reference implementations. All five are complete and follow the same four-file plugin structure (`index.ts`, `schemas.ts`, `service.ts`, `routes.ts`). The SNS plugin is a particularly good reference for services with sub-resources (subscriptions), tag management, and batch operations. The CloudFormation plugin is a good reference for services with tabbed detail views, Monaco editor integration, and cross-service resource navigation. The DynamoDB plugin is a good reference for services with multiple AWS SDK clients (DynamoDBClient, DynamoDBDocumentClient, DynamoDBStreamsClient), complex query building, batch operations with automatic chunking, and a multi-tab detail page with seven feature areas. Scaffold services (IAM, CloudFront) provide the minimal skeleton as a starting template.
