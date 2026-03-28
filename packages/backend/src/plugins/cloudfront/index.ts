import type { FastifyInstance } from "fastify";
import { createCloudFrontClient } from "../../aws/clients.js";
import { CloudFrontService } from "./service.js";
import { cloudfrontRoutes } from "./routes.js";

export default async function cloudfrontPlugin(app: FastifyInstance) {
  const cfClient = createCloudFrontClient();
  const cfService = new CloudFrontService(cfClient);
  await app.register(cloudfrontRoutes, { cloudfrontService: cfService });
}
