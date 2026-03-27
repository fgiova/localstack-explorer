import { FastifyInstance } from "fastify";
import { SQSService } from "./service.js";
import { QueueListResponseSchema, CreateQueueBodySchema, MessageResponseSchema } from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function sqsRoutes(app: FastifyInstance, opts: { sqsService: SQSService }) {
  const { sqsService } = opts;

  app.get("/", {
    schema: { response: { 200: QueueListResponseSchema, 501: ErrorResponseSchema } },
    handler: async () => sqsService.listQueues(),
  });

  app.post("/", {
    schema: { body: CreateQueueBodySchema, response: { 201: MessageResponseSchema, 501: ErrorResponseSchema } },
    handler: async (request, reply) => {
      const { name } = request.body as { name: string };
      const result = await sqsService.createQueue(name);
      return reply.status(201).send(result);
    },
  });
}
