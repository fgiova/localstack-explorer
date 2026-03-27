import { FastifyInstance } from "fastify";
import { IAMService } from "./service.js";
import { UserListResponseSchema, CreateUserBodySchema, MessageResponseSchema } from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function iamRoutes(app: FastifyInstance, opts: { iamService: IAMService }) {
  const { iamService } = opts;

  app.get("/users", {
    schema: { response: { 200: UserListResponseSchema, 501: ErrorResponseSchema } },
    handler: async () => iamService.listUsers(),
  });

  app.post("/users", {
    schema: { body: CreateUserBodySchema, response: { 201: MessageResponseSchema, 501: ErrorResponseSchema } },
    handler: async (request, reply) => {
      const { userName } = request.body as { userName: string };
      const result = await iamService.createUser(userName);
      return reply.status(201).send(result);
    },
  });
}
