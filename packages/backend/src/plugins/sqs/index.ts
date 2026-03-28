import type { FastifyInstance } from "fastify";
import { createSQSClient } from "../../aws/clients.js";
import { SQSService } from "./service.js";
import { sqsRoutes } from "./routes.js";

export default async function sqsPlugin(app: FastifyInstance) {
  const sqsClient = createSQSClient();
  const sqsService = new SQSService(sqsClient);
  await app.register(sqsRoutes, { sqsService });
}
