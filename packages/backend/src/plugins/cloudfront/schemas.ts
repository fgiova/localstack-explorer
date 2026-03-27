import Type, { type Static } from "typebox";

export const DistributionSchema = Type.Object({
  id: Type.String(),
  domainName: Type.String(),
  status: Type.String(),
  lastModified: Type.Optional(Type.String()),
});
export type Distribution = Static<typeof DistributionSchema>;

export const DistributionListResponseSchema = Type.Object({
  distributions: Type.Array(DistributionSchema),
});

export const CreateDistributionBodySchema = Type.Object({
  originDomainName: Type.String({ minLength: 1 }),
});

export const DistributionParamsSchema = Type.Object({
  distributionId: Type.String(),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
