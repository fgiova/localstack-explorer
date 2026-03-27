import { FastifyInstance } from "fastify";
import { createCloudFormationClient } from "../../aws/clients.js";
import { CloudFormationService } from "./service.js";
import { cloudformationRoutes } from "./routes.js";

export default async function cloudformationPlugin(app: FastifyInstance) {
  const cfnClient = createCloudFormationClient();
  const cloudformationService = new CloudFormationService(cfnClient);
  await app.register(cloudformationRoutes, { cloudformationService });
}