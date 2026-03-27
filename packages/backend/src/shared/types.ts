import Type, { type Static } from "typebox";

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
});

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const PaginatedResponseSchema = <T extends ReturnType<typeof Type.Object>>(itemSchema: T) =>
  Type.Object({
    items: Type.Array(itemSchema),
    nextToken: Type.Optional(Type.String()),
  });
