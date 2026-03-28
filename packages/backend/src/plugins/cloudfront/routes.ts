import { FastifyInstance } from "fastify";
import { CloudFrontService } from "./service.js";
import {
  DistributionListResponseSchema,
  DistributionDetailSchema,
  DistributionParamsSchema,
  CreateDistributionBodySchema,
  UpdateDistributionBodySchema,
  DeleteResponseSchema,
  MessageResponseSchema,
  InvalidationListResponseSchema,
  CreateInvalidationBodySchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function cloudfrontRoutes(app: FastifyInstance, opts: { cloudfrontService: CloudFrontService }) {
  const { cloudfrontService } = opts;

  // List distributions
  app.get("/", {
    schema: {
      response: {
        200: DistributionListResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async () => {
      return cloudfrontService.listDistributions();
    },
  });

  // Get distribution detail
  app.get("/:distributionId", {
    schema: {
      params: DistributionParamsSchema,
      response: {
        200: DistributionDetailSchema,
        404: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { distributionId } = request.params as { distributionId: string };
      return cloudfrontService.getDistribution(distributionId);
    },
  });

  // Create distribution
  app.post("/", {
    schema: {
      body: CreateDistributionBodySchema,
      response: {
        201: MessageResponseSchema,
        400: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const body = request.body as import("./schemas.js").CreateDistributionBody;
      const result = await cloudfrontService.createDistribution(body);
      return reply.status(201).send(result);
    },
  });

  // Update distribution
  app.put("/:distributionId", {
    schema: {
      params: DistributionParamsSchema,
      body: UpdateDistributionBodySchema,
      response: {
        200: MessageResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { distributionId } = request.params as { distributionId: string };
      const body = request.body as import("./schemas.js").UpdateDistributionBody;
      return cloudfrontService.updateDistribution(distributionId, body);
    },
  });

  // Delete distribution
  app.delete("/:distributionId", {
    schema: {
      params: DistributionParamsSchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { distributionId } = request.params as { distributionId: string };
      return cloudfrontService.deleteDistribution(distributionId);
    },
  });

  // List invalidations
  app.get("/:distributionId/invalidations", {
    schema: {
      params: DistributionParamsSchema,
      response: {
        200: InvalidationListResponseSchema,
        404: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { distributionId } = request.params as { distributionId: string };
      return cloudfrontService.listInvalidations(distributionId);
    },
  });

  // Create invalidation
  app.post("/:distributionId/invalidations", {
    schema: {
      params: DistributionParamsSchema,
      body: CreateInvalidationBodySchema,
      response: {
        201: MessageResponseSchema,
        404: ErrorResponseSchema,
        429: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { distributionId } = request.params as { distributionId: string };
      const { paths } = request.body as { paths: string[] };
      const result = await cloudfrontService.createInvalidation(distributionId, paths);
      return reply.status(201).send(result);
    },
  });
}
