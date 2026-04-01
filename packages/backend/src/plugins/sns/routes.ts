import type { FastifyInstance } from "fastify";
import { ErrorResponseSchema } from "../../shared/types.js";
import {
	CreateSubscriptionBodySchema,
	CreateTopicBodySchema,
	DeleteResponseSchema,
	FilterPolicyBodySchema,
	MessageResponseSchema,
	PublishBatchBodySchema,
	PublishBatchResponseSchema,
	PublishMessageBodySchema,
	PublishResponseSchema,
	SetAttributeBodySchema,
	SubscriptionArnParamsSchema,
	SubscriptionDetailResponseSchema,
	SubscriptionListResponseSchema,
	SubscriptionsByEndpointQuerySchema,
	TagListResponseSchema,
	TagResourceBodySchema,
	TopicDetailResponseSchema,
	TopicListResponseSchema,
	TopicNameParamsSchema,
	UntagResourceBodySchema,
} from "./schemas.js";
import { SNSService } from "./service.js";

const LOCALSTACK_ACCOUNT = "000000000000";

function buildTopicArn(topicName: string, region: string): string {
	return `arn:aws:sns:${region}:${LOCALSTACK_ACCOUNT}:${topicName}`;
}

export async function snsRoutes(app: FastifyInstance) {
	// ── Topic Routes ────────────────────────────────────────────────────

	// List topics
	app.get("/", {
		schema: {
			response: {
				200: TopicListResponseSchema,
				501: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			return service.listTopics();
		},
	});

	// Create topic
	app.post("/", {
		schema: {
			body: CreateTopicBodySchema,
			response: {
				201: MessageResponseSchema,
				501: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { name } = request.body as { name: string };
			const result = await service.createTopic(name);
			return reply.status(201).send(result);
		},
	});

	// Delete topic
	app.delete("/:topicName", {
		schema: {
			params: TopicNameParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.deleteTopic(topicArn);
		},
	});

	// Get topic attributes
	app.get("/:topicName/attributes", {
		schema: {
			params: TopicNameParamsSchema,
			response: {
				200: TopicDetailResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			const topic = await service.getTopicAttributes(topicArn);
			return { topic };
		},
	});

	// Set topic attribute
	app.put("/:topicName/attributes", {
		schema: {
			params: TopicNameParamsSchema,
			body: SetAttributeBodySchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { attributeName, attributeValue } = request.body as {
				attributeName: string;
				attributeValue: string;
			};
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.setTopicAttributes(
				topicArn,
				attributeName,
				attributeValue,
			);
		},
	});

	// ── Subscription Routes ─────────────────────────────────────────────

	// List subscriptions by endpoint
	app.get("/subscriptions/by-endpoint", {
		schema: {
			querystring: SubscriptionsByEndpointQuerySchema,
			response: {
				200: SubscriptionListResponseSchema,
				501: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { endpoint } = request.query as { endpoint: string };
			const result = await service.listAllSubscriptions();
			const filtered = (result?.subscriptions ?? []).filter(
				(sub) => sub.endpoint === endpoint,
			);
			return { subscriptions: filtered };
		},
	});

	// List subscriptions by topic
	app.get("/:topicName/subscriptions", {
		schema: {
			params: TopicNameParamsSchema,
			response: {
				200: SubscriptionListResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.listSubscriptionsByTopic(topicArn);
		},
	});

	// Create subscription
	app.post("/:topicName/subscriptions", {
		schema: {
			params: TopicNameParamsSchema,
			body: CreateSubscriptionBodySchema,
			response: {
				201: MessageResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { protocol, endpoint, rawMessageDelivery, filterPolicy } =
				request.body as {
					protocol: string;
					endpoint: string;
					rawMessageDelivery?: boolean;
					filterPolicy?: string | Record<string, unknown>;
				};
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			const filterPolicyString = filterPolicy
				? typeof filterPolicy === "string"
					? filterPolicy
					: JSON.stringify(filterPolicy)
				: undefined;
			const result = await service.createSubscription(
				topicArn,
				protocol,
				endpoint,
				{
					rawMessageDelivery,
					filterPolicy: filterPolicyString,
				},
			);
			return reply.status(201).send(result);
		},
	});

	// Delete subscription
	app.delete("/subscriptions/:subscriptionArn", {
		schema: {
			params: SubscriptionArnParamsSchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { subscriptionArn } = request.params as { subscriptionArn: string };
			const decodedArn = decodeURIComponent(subscriptionArn);
			return service.deleteSubscription(decodedArn);
		},
	});

	// Get subscription attributes
	app.get("/subscriptions/:subscriptionArn/attributes", {
		schema: {
			params: SubscriptionArnParamsSchema,
			response: {
				200: SubscriptionDetailResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { subscriptionArn } = request.params as { subscriptionArn: string };
			const decodedArn = decodeURIComponent(subscriptionArn);
			const subscription = await service.getSubscriptionAttributes(decodedArn);
			return { subscription };
		},
	});

	// Set subscription filter policy
	app.put("/subscriptions/:subscriptionArn/filter-policy", {
		schema: {
			params: SubscriptionArnParamsSchema,
			body: FilterPolicyBodySchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { subscriptionArn } = request.params as { subscriptionArn: string };
			const { filterPolicy } = request.body as {
				filterPolicy: string | Record<string, unknown>;
			};
			const decodedArn = decodeURIComponent(subscriptionArn);
			const policyString =
				typeof filterPolicy === "string"
					? filterPolicy
					: JSON.stringify(filterPolicy);
			return service.setSubscriptionFilterPolicy(decodedArn, policyString);
		},
	});

	// ── Publish Routes ──────────────────────────────────────────────────

	// Publish message
	app.post("/:topicName/publish", {
		schema: {
			params: TopicNameParamsSchema,
			body: PublishMessageBodySchema,
			response: {
				201: PublishResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { message, subject, messageAttributes, targetArn } =
				request.body as {
					message: string;
					subject?: string;
					messageAttributes?: Record<
						string,
						{ dataType: string; stringValue: string }
					>;
					targetArn?: string;
				};
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);

			// Map camelCase schema attributes to PascalCase expected by service
			const mappedAttributes = messageAttributes
				? Object.fromEntries(
						Object.entries(messageAttributes).map(([key, val]) => [
							key,
							{ DataType: val.dataType, StringValue: val.stringValue },
						]),
					)
				: undefined;

			const result = await service.publishMessage(topicArn, message, {
				subject,
				messageAttributes: mappedAttributes,
				targetArn,
			});
			return reply.status(201).send(result);
		},
	});

	// Publish batch
	app.post("/:topicName/publish-batch", {
		schema: {
			params: TopicNameParamsSchema,
			body: PublishBatchBodySchema,
			response: {
				201: PublishBatchResponseSchema,
				404: ErrorResponseSchema,
				400: ErrorResponseSchema,
			},
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { entries } = request.body as {
				entries: Array<{
					id: string;
					message: string;
					subject?: string;
					messageAttributes?: Record<
						string,
						{ dataType: string; stringValue: string }
					>;
				}>;
			};
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);

			// Map camelCase schema attributes to PascalCase expected by service
			const mappedEntries = entries.map((entry) => ({
				id: entry.id,
				message: entry.message,
				subject: entry.subject,
				messageAttributes: entry.messageAttributes
					? Object.fromEntries(
							Object.entries(entry.messageAttributes).map(([key, val]) => [
								key,
								{ DataType: val.dataType, StringValue: val.stringValue },
							]),
						)
					: undefined,
			}));

			const result = await service.publishBatch(topicArn, mappedEntries);
			return reply.status(201).send(result);
		},
	});

	// ── Tag Routes ──────────────────────────────────────────────────────

	// List tags
	app.get("/:topicName/tags", {
		schema: {
			params: TopicNameParamsSchema,
			response: {
				200: TagListResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.listTagsForResource(topicArn);
		},
	});

	// Add tags
	app.post("/:topicName/tags", {
		schema: {
			params: TopicNameParamsSchema,
			body: TagResourceBodySchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { tags } = request.body as {
				tags: Array<{ key: string; value: string }>;
			};
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.tagResource(topicArn, tags);
		},
	});

	// Remove tags
	app.delete("/:topicName/tags", {
		schema: {
			params: TopicNameParamsSchema,
			body: UntagResourceBodySchema,
			response: {
				200: DeleteResponseSchema,
				404: ErrorResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new SNSService(clients.sns);
			const { topicName } = request.params as { topicName: string };
			const { tagKeys } = request.body as { tagKeys: string[] };
			const topicArn = buildTopicArn(
				topicName,
				request.localstackConfig.region,
			);
			return service.untagResource(topicArn, tagKeys);
		},
	});
}
