import Type, { type Static } from "typebox";

export const StackSchema = Type.Object({
  stackId: Type.Optional(Type.String()),
  stackName: Type.String(),
  status: Type.String(),
  creationTime: Type.Optional(Type.String()),
  lastUpdatedTime: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
});
export type Stack = Static<typeof StackSchema>;

export const StackListResponseSchema = Type.Object({
  stacks: Type.Array(StackSchema),
});

export const StackDetailSchema = Type.Object({
  stackId: Type.Optional(Type.String()),
  stackName: Type.String(),
  status: Type.String(),
  creationTime: Type.Optional(Type.String()),
  lastUpdatedTime: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  outputs: Type.Array(
    Type.Object({
      outputKey: Type.Optional(Type.String()),
      outputValue: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
    })
  ),
  parameters: Type.Array(
    Type.Object({
      parameterKey: Type.Optional(Type.String()),
      parameterValue: Type.Optional(Type.String()),
    })
  ),
  resources: Type.Array(
    Type.Object({
      logicalResourceId: Type.Optional(Type.String()),
      physicalResourceId: Type.Optional(Type.String()),
      resourceType: Type.Optional(Type.String()),
      resourceStatus: Type.Optional(Type.String()),
    })
  ),
});
export type StackDetail = Static<typeof StackDetailSchema>;

export const CreateStackBodySchema = Type.Object({
  stackName: Type.String({ minLength: 1 }),
  templateBody: Type.String({ minLength: 1 }),
  parameters: Type.Optional(
    Type.Array(
      Type.Object({
        parameterKey: Type.String(),
        parameterValue: Type.String(),
      })
    )
  ),
});

export const StackParamsSchema = Type.Object({
  stackName: Type.String(),
});

export const StackEventSchema = Type.Object({
  eventId: Type.Optional(Type.String()),
  logicalResourceId: Type.Optional(Type.String()),
  resourceType: Type.Optional(Type.String()),
  resourceStatus: Type.Optional(Type.String()),
  timestamp: Type.Optional(Type.String()),
  resourceStatusReason: Type.Optional(Type.String()),
});

export const StackEventsResponseSchema = Type.Object({
  events: Type.Array(StackEventSchema),
});

export const TemplateResponseSchema = Type.Object({
  templateBody: Type.String(),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
  stackId: Type.Optional(Type.String()),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});