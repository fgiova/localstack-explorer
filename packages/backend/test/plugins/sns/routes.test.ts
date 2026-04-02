import Fastify, { type FastifyInstance } from "fastify";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { ClientCache } from "../../../src/aws/client-cache.js";
import { snsRoutes } from "../../../src/plugins/sns/routes.js";
import { registerErrorHandler } from "../../../src/shared/errors.js";

interface MockSNSService {
	listTopics: Mock;
	createTopic: Mock;
	deleteTopic: Mock;
	getTopicAttributes: Mock;
	setTopicAttributes: Mock;
	listAllSubscriptions: Mock;
	listSubscriptionsByTopic: Mock;
	createSubscription: Mock;
	deleteSubscription: Mock;
	getSubscriptionAttributes: Mock;
	setSubscriptionFilterPolicy: Mock;
	publishMessage: Mock;
	publishBatch: Mock;
	listTagsForResource: Mock;
	tagResource: Mock;
	untagResource: Mock;
}

function createMockSNSService(): MockSNSService {
	return {
		listTopics: vi.fn().mockResolvedValue({ topics: [] }),
		createTopic: vi
			.fn()
			.mockResolvedValue({ message: "Topic created successfully" }),
		deleteTopic: vi.fn().mockResolvedValue({ success: true }),
		getTopicAttributes: vi.fn().mockResolvedValue({
			topicArn: "arn:aws:sns:us-east-1:000000000000:test-topic",
		}),
		setTopicAttributes: vi.fn().mockResolvedValue({ success: true }),
		listAllSubscriptions: vi.fn().mockResolvedValue({ subscriptions: [] }),
		listSubscriptionsByTopic: vi.fn().mockResolvedValue({ subscriptions: [] }),
		createSubscription: vi
			.fn()
			.mockResolvedValue({ message: "Subscription created successfully" }),
		deleteSubscription: vi.fn().mockResolvedValue({ success: true }),
		getSubscriptionAttributes: vi.fn().mockResolvedValue({
			subscriptionArn: "arn:aws:sns:us-east-1:000000000000:test-topic:abc-123",
			topicArn: "arn:aws:sns:us-east-1:000000000000:test-topic",
			protocol: "sqs",
			endpoint: "arn:aws:sqs:us-east-1:000000000000:test-queue",
		}),
		setSubscriptionFilterPolicy: vi.fn().mockResolvedValue({ success: true }),
		publishMessage: vi.fn().mockResolvedValue({ messageId: "msg-abc-123" }),
		publishBatch: vi.fn().mockResolvedValue({
			successful: [{ id: "entry-1", messageId: "msg-batch-1" }],
			failed: [],
		}),
		listTagsForResource: vi.fn().mockResolvedValue({ tags: [] }),
		tagResource: vi.fn().mockResolvedValue({ success: true }),
		untagResource: vi.fn().mockResolvedValue({ success: true }),
	};
}

vi.mock("../../../src/plugins/sns/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../../src/plugins/sns/service.js")
		>();
	return {
		...actual,
		SNSService: vi.fn(),
	};
});

import { SNSService as SNSServiceClass } from "../../../src/plugins/sns/service.js";

describe("SNS Routes - messageAttributes mapping", () => {
	let app: FastifyInstance;
	let mockService: MockSNSService;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockSNSService();

		(SNSServiceClass as unknown as Mock).mockImplementation(() => mockService);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({
				sns: {},
			}),
		};
		app.decorate("clientCache", mockClientCache as unknown as ClientCache);

		app.decorateRequest("localstackConfig", null);
		app.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		await app.register(snsRoutes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("POST /:topicName/publish with messageAttributes", () => {
		it("should map camelCase messageAttributes to PascalCase before calling service", async () => {
			mockService.publishMessage.mockClear();

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/publish",
				payload: {
					message: "Hello world",
					subject: "Test subject",
					messageAttributes: {
						myAttr: {
							dataType: "String",
							stringValue: "attr-value",
						},
					},
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json<{ messageId: string }>();
			expect(body.messageId).toBe("msg-abc-123");

			expect(mockService.publishMessage).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				"Hello world",
				expect.objectContaining({
					subject: "Test subject",
					messageAttributes: {
						myAttr: {
							DataType: "String",
							StringValue: "attr-value",
						},
					},
				}),
			);
		});

		it("should publish without messageAttributes when not provided", async () => {
			mockService.publishMessage.mockClear();

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/publish",
				payload: {
					message: "Hello world",
				},
			});

			expect(response.statusCode).toBe(201);
			expect(mockService.publishMessage).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				"Hello world",
				expect.objectContaining({
					messageAttributes: undefined,
				}),
			);
		});
	});

	describe("GET /subscriptions/by-endpoint", () => {
		it("should return empty subscriptions when listAllSubscriptions returns undefined", async () => {
			mockService.listAllSubscriptions.mockResolvedValueOnce(undefined);

			const response = await app.inject({
				method: "GET",
				url: "/subscriptions/by-endpoint?endpoint=arn:aws:sqs:us-east-1:000000000000:test-queue",
			});

			expect(response.statusCode).toBe(200);
			const body = response.json<{
				subscriptions: unknown[];
			}>();
			expect(body.subscriptions).toEqual([]);
		});
	});

	describe("POST /:topicName/subscriptions with filterPolicy as object", () => {
		it("should JSON.stringify filterPolicy when it is an object", async () => {
			mockService.createSubscription.mockClear();

			const filterPolicyObj = { event: ["order_placed", "order_cancelled"] };

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/subscriptions",
				payload: {
					protocol: "sqs",
					endpoint: "arn:aws:sqs:us-east-1:000000000000:test-queue",
					filterPolicy: filterPolicyObj,
				},
			});

			expect(response.statusCode).toBe(201);
			expect(mockService.createSubscription).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				"sqs",
				"arn:aws:sqs:us-east-1:000000000000:test-queue",
				expect.objectContaining({
					filterPolicy: JSON.stringify(filterPolicyObj),
				}),
			);
		});

		it("should pass filterPolicy as-is when it is a string", async () => {
			mockService.createSubscription.mockClear();

			const filterPolicyStr = '{"event":["order_placed"]}';

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/subscriptions",
				payload: {
					protocol: "sqs",
					endpoint: "arn:aws:sqs:us-east-1:000000000000:test-queue",
					filterPolicy: filterPolicyStr,
				},
			});

			expect(response.statusCode).toBe(201);
			expect(mockService.createSubscription).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				"sqs",
				"arn:aws:sqs:us-east-1:000000000000:test-queue",
				expect.objectContaining({
					filterPolicy: filterPolicyStr,
				}),
			);
		});
	});

	describe("PUT /subscriptions/:subscriptionArn/filter-policy with filterPolicy as object", () => {
		it("should JSON.stringify filterPolicy when it is an object", async () => {
			mockService.setSubscriptionFilterPolicy.mockClear();

			const filterPolicyObj = { event: ["order_placed"] };
			const encodedArn = encodeURIComponent(
				"arn:aws:sns:us-east-1:000000000000:test-topic:abc-123",
			);

			const response = await app.inject({
				method: "PUT",
				url: `/subscriptions/${encodedArn}/filter-policy`,
				payload: {
					filterPolicy: filterPolicyObj,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockService.setSubscriptionFilterPolicy).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic:abc-123",
				JSON.stringify(filterPolicyObj),
			);
		});

		it("should pass filterPolicy as-is when it is a string", async () => {
			mockService.setSubscriptionFilterPolicy.mockClear();

			const filterPolicyStr = '{"event":["order_placed"]}';
			const encodedArn = encodeURIComponent(
				"arn:aws:sns:us-east-1:000000000000:test-topic:abc-123",
			);

			const response = await app.inject({
				method: "PUT",
				url: `/subscriptions/${encodedArn}/filter-policy`,
				payload: {
					filterPolicy: filterPolicyStr,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockService.setSubscriptionFilterPolicy).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic:abc-123",
				filterPolicyStr,
			);
		});
	});

	describe("POST /:topicName/publish-batch with messageAttributes on entries", () => {
		it("should map camelCase messageAttributes to PascalCase for each entry", async () => {
			mockService.publishBatch.mockClear();

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/publish-batch",
				payload: {
					entries: [
						{
							id: "entry-1",
							message: "Batch message 1",
							subject: "Subject 1",
							messageAttributes: {
								batchAttr: {
									dataType: "String",
									stringValue: "batch-value",
								},
							},
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json<{
				successful: Array<{ id: string; messageId: string }>;
				failed: unknown[];
			}>();
			expect(body.successful).toHaveLength(1);
			expect(body.successful[0].id).toBe("entry-1");

			expect(mockService.publishBatch).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				[
					expect.objectContaining({
						id: "entry-1",
						message: "Batch message 1",
						subject: "Subject 1",
						messageAttributes: {
							batchAttr: {
								DataType: "String",
								StringValue: "batch-value",
							},
						},
					}),
				],
			);
		});

		it("should handle batch entries without messageAttributes", async () => {
			mockService.publishBatch.mockClear();

			const response = await app.inject({
				method: "POST",
				url: "/test-topic/publish-batch",
				payload: {
					entries: [
						{
							id: "entry-2",
							message: "Batch message 2",
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
			expect(mockService.publishBatch).toHaveBeenCalledWith(
				"arn:aws:sns:us-east-1:000000000000:test-topic",
				[
					expect.objectContaining({
						id: "entry-2",
						message: "Batch message 2",
						messageAttributes: undefined,
					}),
				],
			);
		});
	});
});
