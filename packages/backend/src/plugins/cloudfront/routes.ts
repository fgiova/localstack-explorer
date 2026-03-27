import { FastifyInstance } from "fastify";
import { CloudFrontService } from "./service.js";
import { DistributionListResponseSchema, CreateDistributionBodySchema, MessageResponseSchema } from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function cloudfrontRoutes(app: FastifyInstance, opts: { cloudfrontService: CloudFrontService }) {
  const { cloudfrontService } = opts;

  app.get("/", {
    schema: { response: { 200: DistributionListResponseSchema, 501: ErrorResponseSchema } },
    handler: async () => cloudfrontService.listDistributions(),
  });

  app.post("/", {
    schema: { body: CreateDistributionBodySchema, response: { 201: MessageResponseSchema, 501: ErrorResponseSchema } },
    handler: async (request, reply) => {
      const { originDomainName } = request.body as { originDomainName: string };
      const result = await cloudfrontService.createDistribution(originDomainName);
      return reply.status(201).send(result);
    },
  });
}
