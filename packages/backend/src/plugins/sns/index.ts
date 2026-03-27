import { FastifyInstance } from "fastify";
import { createSNSClient } from "../../aws/clients.js";
import { SNSService } from "./service.js";
import { snsRoutes } from "./routes.js";

export default async function snsPlugin(app: FastifyInstance) {
  const snsClient = createSNSClient();
  const snsService = new SNSService(snsClient);
  await app.register(snsRoutes, { snsService });
}
