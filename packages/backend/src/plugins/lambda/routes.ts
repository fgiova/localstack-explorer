import type { FastifyInstance } from "fastify";
import { ErrorResponseSchema } from "../../shared/types.js";
import {
	CreateFunctionBodySchema,
	DeleteResponseSchema,
	FunctionDetailSchema,
	FunctionNameParamsSchema,
	InvokeFunctionBodySchema,
	InvokeFunctionResponseSchema,
	ListAliasesResponseSchema,
	ListFunctionsResponseSchema,
	ListVersionsResponseSchema,
	MessageResponseSchema,
	UpdateFunctionCodeBodySchema,
	UpdateFunctionConfigBodySchema,
} from "./schemas.js";
import { LambdaService } from "./service.js";

export async function lambdaRoutes(app: FastifyInstance) {
	// List functions
	app.get("/", {
		schema: {
			response: {
				200: ListFunctionsResponseSchema,
				501: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { marker } = request.query as { marker?: string };
			return service.listFunctions(marker);
		},
	});

	// Create function
	app.post("/", {
		schema: {
			body: CreateFunctionBodySchema,
			response: {
				201: MessageResponseSchema,
				400: ErrorResponseSchema,
				409: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const result = await service.createFunction(
				request.body as {
					functionName: string;
					runtime: string;
					handler: string;
					role: string;
					code: { zipFile?: string; s3Bucket?: string; s3Key?: string };
					description?: string;
					timeout?: number;
					memorySize?: number;
					environment?: Record<string, string>;
					architectures?: string[];
				},
			);
			return reply.status(201).send(result);
		},
	});

	// Get function detail
	app.get("/:functionName", {
		schema: {
			params: FunctionNameParamsSchema,
			response: {
				200: FunctionDetailSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			return service.getFunction(functionName);
		},
	});

	// Update function code
	app.put("/:functionName/code", {
		schema: {
			params: FunctionNameParamsSchema,
			body: UpdateFunctionCodeBodySchema,
			response: {
				200: MessageResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			return service.updateFunctionCode(
				functionName,
				request.body as {
					zipFile?: string;
					s3Bucket?: string;
					s3Key?: string;
				},
			);
		},
	});

	// Update function configuration
	app.put("/:functionName/config", {
		schema: {
			params: FunctionNameParamsSchema,
			body: UpdateFunctionConfigBodySchema,
			response: {
				200: MessageResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			return service.updateFunctionConfig(
				functionName,
				request.body as {
					handler?: string;
					runtime?: string;
					description?: string;
					timeout?: number;
					memorySize?: number;
					environment?: Record<string, string>;
					role?: string;
				},
			);
		},
	});

	// Delete function
	app.delete("/:functionName", {
		schema: {
			params: FunctionNameParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			return service.deleteFunction(functionName);
		},
	});

	// Invoke function
	app.post("/:functionName/invoke", {
		schema: {
			params: FunctionNameParamsSchema,
			body: InvokeFunctionBodySchema,
			response: {
				200: InvokeFunctionResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			const { payload, invocationType } = request.body as {
				payload?: string;
				invocationType?: string;
			};
			return service.invokeFunction(functionName, payload, invocationType);
		},
	});

	// List function versions
	app.get("/:functionName/versions", {
		schema: {
			params: FunctionNameParamsSchema,
			response: {
				200: ListVersionsResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			const { marker } = request.query as { marker?: string };
			return service.listVersions(functionName, marker);
		},
	});

	// List function aliases
	app.get("/:functionName/aliases", {
		schema: {
			params: FunctionNameParamsSchema,
			response: {
				200: ListAliasesResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new LambdaService(clients.lambda);
			const { functionName } = request.params as { functionName: string };
			const { marker } = request.query as { marker?: string };
			return service.listAliases(functionName, marker);
		},
	});
}
