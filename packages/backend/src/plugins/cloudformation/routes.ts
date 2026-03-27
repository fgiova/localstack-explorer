import { FastifyInstance } from "fastify";
import { CloudFormationService } from "./service.js";
import {
  StackListResponseSchema,
  StackDetailSchema,
  CreateStackBodySchema,
  StackParamsSchema,
  StackEventsResponseSchema,
  TemplateResponseSchema,
  MessageResponseSchema,
  DeleteResponseSchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function cloudformationRoutes(
  app: FastifyInstance,
  opts: { cloudformationService: CloudFormationService }
) {
  const { cloudformationService } = opts;

  app.get("/", {
    schema: { response: { 200: StackListResponseSchema, 500: ErrorResponseSchema } },
    handler: async () => cloudformationService.listStacks(),
  });

  app.get("/:stackName", {
    schema: {
      params: StackParamsSchema,
      response: { 200: StackDetailSchema, 404: ErrorResponseSchema, 500: ErrorResponseSchema },
    },
    handler: async (request) => {
      const { stackName } = request.params as { stackName: string };
      return cloudformationService.getStack(stackName);
    },
  });

  app.get("/:stackName/events", {
    schema: {
      params: StackParamsSchema,
      response: { 200: StackEventsResponseSchema, 404: ErrorResponseSchema, 500: ErrorResponseSchema },
    },
    handler: async (request) => {
      const { stackName } = request.params as { stackName: string };
      return cloudformationService.getStackEvents(stackName);
    },
  });

  app.get("/:stackName/template", {
    schema: {
      params: StackParamsSchema,
      response: { 200: TemplateResponseSchema, 404: ErrorResponseSchema, 500: ErrorResponseSchema },
    },
    handler: async (request) => {
      const { stackName } = request.params as { stackName: string };
      return cloudformationService.getTemplate(stackName);
    },
  });

  app.post("/", {
    schema: {
      body: CreateStackBodySchema,
      response: { 201: MessageResponseSchema, 400: ErrorResponseSchema, 500: ErrorResponseSchema },
    },
    handler: async (request, reply) => {
      const { stackName, templateBody, parameters } = request.body as {
        stackName: string;
        templateBody: string;
        parameters?: { parameterKey: string; parameterValue: string }[];
      };
      const result = await cloudformationService.createStack(stackName, templateBody, parameters);
      return reply.status(201).send(result);
    },
  });

  app.delete("/:stackName", {
    schema: {
      params: StackParamsSchema,
      response: { 200: DeleteResponseSchema, 404: ErrorResponseSchema, 500: ErrorResponseSchema },
    },
    handler: async (request) => {
      const { stackName } = request.params as { stackName: string };
      return cloudformationService.deleteStack(stackName);
    },
  });
}