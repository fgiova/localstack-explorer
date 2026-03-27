import Type, { type Static } from "typebox";

export const TopicSchema = Type.Object({
  topicArn: Type.String(),
  name: Type.String(),
});
export type Topic = Static<typeof TopicSchema>;

export const TopicListResponseSchema = Type.Object({
  topics: Type.Array(TopicSchema),
});

export const CreateTopicBodySchema = Type.Object({
  name: Type.String({ minLength: 1 }),
});

export const SubscriptionSchema = Type.Object({
  subscriptionArn: Type.String(),
  topicArn: Type.String(),
  protocol: Type.String(),
  endpoint: Type.String(),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
