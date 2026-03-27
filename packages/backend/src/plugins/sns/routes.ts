import { FastifyInstance } from "fastify";
import { SNSService } from "./service.js";
import { TopicListResponseSchema, CreateTopicBodySchema, MessageResponseSchema } from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function snsRoutes(app: FastifyInstance, opts: { snsService: SNSService }) {
  const { snsService } = opts;

  app.get("/", {
    schema: { response: { 200: TopicListResponseSchema, 501: ErrorResponseSchema } },
    handler: async () => snsService.listTopics(),
  });

  app.post("/", {
    schema: { body: CreateTopicBodySchema, response: { 201: MessageResponseSchema, 501: ErrorResponseSchema } },
    handler: async (request, reply) => {
      const { name } = request.body as { name: string };
      const result = await snsService.createTopic(name);
      return reply.status(201).send(result);
    },
  });
}
