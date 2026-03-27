import Type, { type Static } from "typebox";

export const QueueSchema = Type.Object({
  queueUrl: Type.String(),
  queueName: Type.String(),
});
export type Queue = Static<typeof QueueSchema>;

export const QueueListResponseSchema = Type.Object({
  queues: Type.Array(QueueSchema),
});

export const CreateQueueBodySchema = Type.Object({
  name: Type.String({ minLength: 1 }),
});

export const QueueParamsSchema = Type.Object({
  queueName: Type.String(),
});

export const MessageSchema = Type.Object({
  messageId: Type.String(),
  body: Type.String(),
  receiptHandle: Type.Optional(Type.String()),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
