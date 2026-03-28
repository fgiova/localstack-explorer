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
  // TODO: FIFO support
  // fifo: Type.Optional(Type.Boolean()),
});

export const QueueParamsSchema = Type.Object({
  queueName: Type.String(),
});

export const QueueDetailResponseSchema = Type.Object({
  queueUrl: Type.String(),
  queueName: Type.String(),
  queueArn: Type.Optional(Type.String()),
  approximateNumberOfMessages: Type.Number(),
  approximateNumberOfMessagesNotVisible: Type.Number(),
  approximateNumberOfMessagesDelayed: Type.Number(),
  createdTimestamp: Type.Optional(Type.String()),
  lastModifiedTimestamp: Type.Optional(Type.String()),
  visibilityTimeout: Type.Number(),
  maximumMessageSize: Type.Number(),
  messageRetentionPeriod: Type.Number(),
  delaySeconds: Type.Number(),
  receiveMessageWaitTimeSeconds: Type.Number(),
  // TODO: FIFO support
  // fifoQueue: Type.Optional(Type.Boolean()),
  // contentBasedDeduplication: Type.Optional(Type.Boolean()),
});
export type QueueDetailResponse = Static<typeof QueueDetailResponseSchema>;

export const MessageAttributeSchema = Type.Object({
  name: Type.String(),
  dataType: Type.String(),
  stringValue: Type.String(),
});
export type MessageAttribute = Static<typeof MessageAttributeSchema>;

export const MessageSchema = Type.Object({
  messageId: Type.String(),
  body: Type.String(),
  receiptHandle: Type.Optional(Type.String()),
  messageAttributes: Type.Optional(Type.Array(MessageAttributeSchema)),
  // TODO: FIFO support
  // sequenceNumber: Type.Optional(Type.String()),
});
export type Message = Static<typeof MessageSchema>;

export const SendMessageBodySchema = Type.Object({
  body: Type.String(),
  delaySeconds: Type.Optional(Type.Integer({ minimum: 0, maximum: 900 })),
  messageAttributes: Type.Optional(Type.Record(Type.String(), Type.Any())),
  // TODO: FIFO support
  // messageGroupId: Type.Optional(Type.String()),
  // messageDeduplicationId: Type.Optional(Type.String()),
});
export type SendMessageBody = Static<typeof SendMessageBodySchema>;

export const SendMessageResponseSchema = Type.Object({
  messageId: Type.String(),
});
export type SendMessageResponse = Static<typeof SendMessageResponseSchema>;

export const ReceiveMessagesQuerySchema = Type.Object({
  maxMessages: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: 1 })),
  waitTimeSeconds: Type.Optional(Type.Integer({ minimum: 0, maximum: 20, default: 20 })),
});
export type ReceiveMessagesQuery = Static<typeof ReceiveMessagesQuerySchema>;

export const ReceiveMessagesResponseSchema = Type.Object({
  messages: Type.Array(MessageSchema),
});
export type ReceiveMessagesResponse = Static<typeof ReceiveMessagesResponseSchema>;

export const DeleteMessageBodySchema = Type.Object({
  receiptHandle: Type.String(),
});
export type DeleteMessageBody = Static<typeof DeleteMessageBodySchema>;

export const PurgeResponseSchema = Type.Object({
  message: Type.String(),
});
export type PurgeResponse = Static<typeof PurgeResponseSchema>;

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
