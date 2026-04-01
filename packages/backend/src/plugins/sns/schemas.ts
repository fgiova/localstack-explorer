import Type, { type Static } from "typebox";

// --- Topic schemas ---

export const TopicSchema = Type.Object({
	topicArn: Type.String(),
	name: Type.String(),
});
export type Topic = Static<typeof TopicSchema>;

export const TopicListResponseSchema = Type.Object({
	topics: Type.Array(TopicSchema),
});
export type TopicListResponse = Static<typeof TopicListResponseSchema>;

export const TopicParamsSchema = Type.Object({
	topicArn: Type.String(),
});
export type TopicParams = Static<typeof TopicParamsSchema>;

export const TopicNameParamsSchema = Type.Object({
	topicName: Type.String(),
});
export type TopicNameParams = Static<typeof TopicNameParamsSchema>;

export const SubscriptionArnParamsSchema = Type.Object({
	subscriptionArn: Type.String(),
});
export type SubscriptionArnParams = Static<typeof SubscriptionArnParamsSchema>;

export const CreateTopicBodySchema = Type.Object({
	name: Type.String({ minLength: 1 }),
});
export type CreateTopicBody = Static<typeof CreateTopicBodySchema>;

export const TopicDetailSchema = Type.Object({
	topicArn: Type.String(),
	displayName: Type.Optional(Type.String()),
	owner: Type.Optional(Type.String()),
	policy: Type.Optional(Type.String()),
	deliveryPolicy: Type.Optional(Type.String()),
	effectiveDeliveryPolicy: Type.Optional(Type.String()),
	subscriptionsConfirmed: Type.Optional(Type.Number()),
	subscriptionsPending: Type.Optional(Type.Number()),
	subscriptionsDeleted: Type.Optional(Type.Number()),
});
export type TopicDetail = Static<typeof TopicDetailSchema>;

export const TopicDetailResponseSchema = Type.Object({
	topic: TopicDetailSchema,
});
export type TopicDetailResponse = Static<typeof TopicDetailResponseSchema>;

// --- Subscription schemas ---

export const SubscriptionSchema = Type.Object({
	subscriptionArn: Type.String(),
	topicArn: Type.String(),
	protocol: Type.String(),
	endpoint: Type.String(),
});
export type Subscription = Static<typeof SubscriptionSchema>;

export const SubscriptionDetailSchema = Type.Object({
	subscriptionArn: Type.String(),
	topicArn: Type.String(),
	protocol: Type.String(),
	endpoint: Type.String(),
	owner: Type.Optional(Type.String()),
	filterPolicy: Type.Optional(Type.String()),
	filterPolicyScope: Type.Optional(Type.String()),
	rawMessageDelivery: Type.Optional(Type.Boolean()),
	confirmationWasAuthenticated: Type.Optional(Type.Boolean()),
	deliveryPolicy: Type.Optional(Type.String()),
	effectiveDeliveryPolicy: Type.Optional(Type.String()),
	pendingConfirmation: Type.Optional(Type.Boolean()),
});
export type SubscriptionDetail = Static<typeof SubscriptionDetailSchema>;

export const SubscriptionDetailResponseSchema = Type.Object({
	subscription: SubscriptionDetailSchema,
});
export type SubscriptionDetailResponse = Static<
	typeof SubscriptionDetailResponseSchema
>;

export const SubscriptionListResponseSchema = Type.Object({
	subscriptions: Type.Array(SubscriptionSchema),
});
export type SubscriptionListResponse = Static<
	typeof SubscriptionListResponseSchema
>;

export const CreateSubscriptionBodySchema = Type.Object({
	protocol: Type.Union([
		Type.Literal("sqs"),
		Type.Literal("http"),
		Type.Literal("https"),
		Type.Literal("email"),
		Type.Literal("email-json"),
		Type.Literal("lambda"),
	]),
	endpoint: Type.String(),
	rawMessageDelivery: Type.Optional(Type.Boolean()),
	filterPolicy: Type.Optional(
		Type.Union([Type.String(), Type.Record(Type.String(), Type.Any())]),
	),
});
export type CreateSubscriptionBody = Static<
	typeof CreateSubscriptionBodySchema
>;

export const SubscriptionsByEndpointQuerySchema = Type.Object({
	endpoint: Type.String(),
});
export type SubscriptionsByEndpointQuery = Static<
	typeof SubscriptionsByEndpointQuerySchema
>;

// --- Publish schemas ---

export const MessageAttributeSchema = Type.Object({
	dataType: Type.Union([
		Type.Literal("String"),
		Type.Literal("Number"),
		Type.Literal("Binary"),
	]),
	stringValue: Type.String(),
});
export type MessageAttribute = Static<typeof MessageAttributeSchema>;

export const PublishMessageBodySchema = Type.Object({
	message: Type.String(),
	subject: Type.Optional(Type.String()),
	messageAttributes: Type.Optional(
		Type.Record(Type.String(), MessageAttributeSchema),
	),
	targetArn: Type.Optional(Type.String()),
});
export type PublishMessageBody = Static<typeof PublishMessageBodySchema>;

export const PublishBatchEntrySchema = Type.Object({
	id: Type.String(),
	message: Type.String(),
	subject: Type.Optional(Type.String()),
	messageAttributes: Type.Optional(
		Type.Record(Type.String(), MessageAttributeSchema),
	),
});
export type PublishBatchEntry = Static<typeof PublishBatchEntrySchema>;

export const PublishBatchBodySchema = Type.Object({
	entries: Type.Array(PublishBatchEntrySchema),
});
export type PublishBatchBody = Static<typeof PublishBatchBodySchema>;

export const PublishResponseSchema = Type.Object({
	messageId: Type.String(),
});
export type PublishResponse = Static<typeof PublishResponseSchema>;

export const PublishBatchResponseSchema = Type.Object({
	successful: Type.Array(
		Type.Object({
			id: Type.String(),
			messageId: Type.String(),
		}),
	),
	failed: Type.Array(
		Type.Object({
			id: Type.String(),
			code: Type.String(),
			message: Type.Optional(Type.String()),
			senderFault: Type.Optional(Type.Boolean()),
		}),
	),
});
export type PublishBatchResponse = Static<typeof PublishBatchResponseSchema>;

// --- Tag schemas ---

export const TagSchema = Type.Object({
	key: Type.String(),
	value: Type.String(),
});
export type Tag = Static<typeof TagSchema>;

export const TagListResponseSchema = Type.Object({
	tags: Type.Array(TagSchema),
});
export type TagListResponse = Static<typeof TagListResponseSchema>;

export const TagResourceBodySchema = Type.Object({
	tags: Type.Array(TagSchema),
});
export type TagResourceBody = Static<typeof TagResourceBodySchema>;

export const UntagResourceBodySchema = Type.Object({
	tagKeys: Type.Array(Type.String()),
});
export type UntagResourceBody = Static<typeof UntagResourceBodySchema>;

// --- Attribute schemas ---

export const SetAttributeBodySchema = Type.Object({
	attributeName: Type.String(),
	attributeValue: Type.String(),
});
export type SetAttributeBody = Static<typeof SetAttributeBodySchema>;

export const FilterPolicyBodySchema = Type.Object({
	filterPolicy: Type.Union([
		Type.String(),
		Type.Record(Type.String(), Type.Any()),
	]),
});
export type FilterPolicyBody = Static<typeof FilterPolicyBodySchema>;

// --- Common response schemas ---

export const MessageResponseSchema = Type.Object({
	message: Type.String(),
});
export type MessageResponse = Static<typeof MessageResponseSchema>;

export const DeleteResponseSchema = Type.Object({
	success: Type.Boolean(),
});
export type DeleteResponse = Static<typeof DeleteResponseSchema>;
