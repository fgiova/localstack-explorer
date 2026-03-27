import { FastifyInstance } from "fastify";
import { createIAMClient } from "../../aws/clients.js";
import { IAMService } from "./service.js";
import { iamRoutes } from "./routes.js";

export default async function iamPlugin(app: FastifyInstance) {
  const iamClient = createIAMClient();
  const iamService = new IAMService(iamClient);
  await app.register(iamRoutes, { iamService });
}
