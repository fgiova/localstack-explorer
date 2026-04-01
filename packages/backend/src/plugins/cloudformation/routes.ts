import type { FastifyInstance } from "fastify";
import { ErrorResponseSchema } from "../../shared/types.js";
import {
	CreateStackBodySchema,
	DeleteResponseSchema,
	MessageResponseSchema,
	StackDetailSchema,
	StackEventsResponseSchema,
	StackListResponseSchema,
	StackParamsSchema,
	TemplateResponseSchema,
	UpdateStackBodySchema,
	UpdateStackResponseSchema,
} from "./schemas.js";
import { CloudFormationService } from "./service.js";

export async function cloudformationRoutes(app: FastifyInstance) {
	app.get("/", {
		schema: {
			response: { 200: StackListResponseSchema, 500: ErrorResponseSchema },
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			return service.listStacks();
		},
	});

	app.get("/:stackName", {
		schema: {
			params: StackParamsSchema,
			response: {
				200: StackDetailSchema,
				404: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName } = request.params as { stackName: string };
			return service.getStack(stackName);
		},
	});

	app.get("/:stackName/events", {
		schema: {
			params: StackParamsSchema,
			response: {
				200: StackEventsResponseSchema,
				404: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName } = request.params as { stackName: string };
			return service.getStackEvents(stackName);
		},
	});

	app.get("/:stackName/template", {
		schema: {
			params: StackParamsSchema,
			response: {
				200: TemplateResponseSchema,
				404: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName } = request.params as { stackName: string };
			return service.getTemplate(stackName);
		},
	});

	app.post("/", {
		schema: {
			body: CreateStackBodySchema,
			response: {
				201: MessageResponseSchema,
				400: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName, templateBody, templateURL, parameters } =
				request.body as {
					stackName: string;
					templateBody?: string;
					templateURL?: string;
					parameters?: { parameterKey: string; parameterValue: string }[];
				};
			const result = await service.createStack(
				stackName,
				templateBody,
				templateURL,
				parameters,
			);
			return reply.status(201).send(result);
		},
	});

	app.put("/:stackName", {
		schema: {
			body: UpdateStackBodySchema,
			params: StackParamsSchema,
			response: {
				200: UpdateStackResponseSchema,
				404: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName } = request.params as { stackName: string };
			const { templateBody, templateURL, parameters } = request.body as {
				templateBody?: string;
				templateURL?: string;
				parameters?: { parameterKey: string; parameterValue: string }[];
			};
			return service.updateStack(
				stackName,
				templateBody,
				templateURL,
				parameters,
			);
		},
	});

	app.delete("/:stackName", {
		schema: {
			params: StackParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new CloudFormationService(clients.cloudformation);
			const { stackName } = request.params as { stackName: string };
			return service.deleteStack(stackName);
		},
	});
}
