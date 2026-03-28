import Type, { type Static } from "typebox";

export const OriginSchema = Type.Object({
  id: Type.String(),
  domainName: Type.String(),
  originPath: Type.Optional(Type.String()),
  httpPort: Type.Optional(Type.Number({ default: 80 })),
  httpsPort: Type.Optional(Type.Number({ default: 443 })),
  protocolPolicy: Type.Union([
    Type.Literal("http-only"),
    Type.Literal("https-only"),
    Type.Literal("match-viewer"),
  ]),
});
export type Origin = Static<typeof OriginSchema>;

export const CacheBehaviorSchema = Type.Object({
  pathPattern: Type.String(),
  targetOriginId: Type.String(),
  viewerProtocolPolicy: Type.Union([
    Type.Literal("allow-all"),
    Type.Literal("https-only"),
    Type.Literal("redirect-to-https"),
  ]),
  allowedMethods: Type.Array(Type.String()),
  cachedMethods: Type.Array(Type.String()),
  defaultTTL: Type.Number(),
  maxTTL: Type.Number(),
  minTTL: Type.Number(),
  compress: Type.Boolean(),
});
export type CacheBehavior = Static<typeof CacheBehaviorSchema>;

export const DistributionSummarySchema = Type.Object({
  id: Type.String(),
  domainName: Type.String(),
  status: Type.String(),
  enabled: Type.Boolean(),
  originsCount: Type.Number(),
  lastModified: Type.Optional(Type.String()),
});
export type DistributionSummary = Static<typeof DistributionSummarySchema>;

export const DistributionDetailSchema = Type.Object({
  id: Type.String(),
  arn: Type.String(),
  domainName: Type.String(),
  status: Type.String(),
  enabled: Type.Boolean(),
  comment: Type.Optional(Type.String()),
  defaultRootObject: Type.Optional(Type.String()),
  origins: Type.Array(OriginSchema),
  defaultCacheBehavior: CacheBehaviorSchema,
  cacheBehaviors: Type.Array(CacheBehaviorSchema),
  lastModified: Type.Optional(Type.String()),
});
export type DistributionDetail = Static<typeof DistributionDetailSchema>;

export const InvalidationSchema = Type.Object({
  id: Type.String(),
  status: Type.String(),
  createTime: Type.String(),
  paths: Type.Array(Type.String()),
});
export type Invalidation = Static<typeof InvalidationSchema>;

export const InvalidationListResponseSchema = Type.Object({
  invalidations: Type.Array(InvalidationSchema),
});
export type InvalidationListResponse = Static<typeof InvalidationListResponseSchema>;

export const DistributionListResponseSchema = Type.Object({
  distributions: Type.Array(DistributionSummarySchema),
});
export type DistributionListResponse = Static<typeof DistributionListResponseSchema>;

export const CreateDistributionBodySchema = Type.Object({
  origins: Type.Array(OriginSchema, { minItems: 1 }),
  defaultRootObject: Type.Optional(Type.String()),
  comment: Type.Optional(Type.String()),
  enabled: Type.Boolean(),
  defaultCacheBehavior: CacheBehaviorSchema,
});
export type CreateDistributionBody = Static<typeof CreateDistributionBodySchema>;

export const UpdateDistributionBodySchema = Type.Object({
  comment: Type.Optional(Type.String()),
  enabled: Type.Optional(Type.Boolean()),
  defaultRootObject: Type.Optional(Type.String()),
});
export type UpdateDistributionBody = Static<typeof UpdateDistributionBodySchema>;

export const CreateInvalidationBodySchema = Type.Object({
  paths: Type.Array(Type.String(), { minItems: 1 }),
});
export type CreateInvalidationBody = Static<typeof CreateInvalidationBodySchema>;

export const DistributionParamsSchema = Type.Object({
  distributionId: Type.String(),
});
export type DistributionParams = Static<typeof DistributionParamsSchema>;

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
export type DeleteResponse = Static<typeof DeleteResponseSchema>;

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});
export type MessageResponse = Static<typeof MessageResponseSchema>;
