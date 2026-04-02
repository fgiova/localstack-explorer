import type { SNSClient } from "@aws-sdk/client-sns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SNSService } from "../../../src/plugins/sns/service.js";
import { AppError } from "../../../src/shared/errors.js";

function createMockSNSClient() {
	return {
		send: vi.fn(),
	} as unknown as SNSClient;
}

describe("SNSService", () => {
	let client: SNSClient;
	let service: SNSService;

	beforeEach(() => {
		client = createMockSNSClient();
		service = new SNSService(client);
	});

	// ── mapSnsError ───────────────────────────────────────────────────────────

	describe("mapSnsError (via createTopic)", () => {
		it("throws AppError 404 NOT_FOUND for NotFoundException", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 404 NOT_FOUND for NotFound", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFound";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 INVALID_PARAMETER for InvalidParameterException", async () => {
			const error = new Error("bad param") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
				message: "bad param",
			});
		});

		it("throws AppError 400 INVALID_PARAMETER for InvalidParameterValueException", async () => {
			const error = new Error("bad value") as Error & { name: string };
			error.name = "InvalidParameterValueException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 400 INVALID_PARAMETER for InvalidParameter", async () => {
			const error = new Error("invalid") as Error & { name: string };
			error.name = "InvalidParameter";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 400 INVALID_PARAMETER for ValidationException", async () => {
			const error = new Error("validation failed") as Error & { name: string };
			error.name = "ValidationException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 403 AUTHORIZATION_ERROR for AuthorizationErrorException", async () => {
			const error = new Error("not authorized") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
				message: "not authorized",
			});
		});

		it("throws AppError 403 AUTHORIZATION_ERROR for AuthorizationError", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationError";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("uses fallbackMessage for INVALID_PARAMETER when error.message is empty", async () => {
			const error = new Error("") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
				message: "Failed to create topic 't'",
			});
		});

		it("uses fallbackMessage for AUTHORIZATION_ERROR when error.message is empty", async () => {
			const error = new Error("") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
				message: "Failed to create topic 't'",
			});
		});

		it("re-throws unknown errors as-is (default case)", async () => {
			const error = new Error("some unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("t")).rejects.toThrow(
				"some unexpected error",
			);
			await expect(
				(async () => {
					const e = new Error("some unexpected error");
					(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(e);
					await service.createTopic("t");
				})(),
			).rejects.not.toBeInstanceOf(AppError);
		});
	});

	// ── listTopics ────────────────────────────────────────────────────────────

	describe("listTopics", () => {
		it("returns formatted topic list with names extracted from ARNs", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Topics: [
					{ TopicArn: "arn:aws:sns:us-east-1:000000000000:my-topic" },
					{ TopicArn: "arn:aws:sns:us-east-1:000000000000:another-topic" },
				],
			});

			const result = await service.listTopics();

			expect(result).toEqual({
				topics: [
					{
						topicArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
						name: "my-topic",
					},
					{
						topicArn: "arn:aws:sns:us-east-1:000000000000:another-topic",
						name: "another-topic",
					},
				],
			});
		});

		it("returns empty topic list when no topics exist", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Topics: [],
			});

			const result = await service.listTopics();

			expect(result).toEqual({ topics: [] });
		});

		it("returns empty topic list when Topics is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listTopics();

			expect(result).toEqual({ topics: [] });
		});

		it("uses empty string for topicArn and name when TopicArn is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Topics: [{}],
			});

			const result = await service.listTopics();

			expect(result.topics[0]).toEqual({ topicArn: "", name: "" });
		});
	});

	// ── createTopic ───────────────────────────────────────────────────────────

	describe("createTopic", () => {
		it("creates a topic and returns success message with ARN", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				TopicArn: "arn:aws:sns:us-east-1:000000000000:new-topic",
			});

			const result = await service.createTopic("new-topic");

			expect(result).toEqual({
				message: "Topic 'new-topic' created successfully",
				topicArn: "arn:aws:sns:us-east-1:000000000000:new-topic",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("my-topic")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("bad name") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createTopic("bad name")).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});
	});

	// ── deleteTopic ───────────────────────────────────────────────────────────

	describe("deleteTopic", () => {
		it("deletes a topic successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteTopic(
				"arn:aws:sns:us-east-1:000000000000:my-topic",
			);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 when topic does not exist", async () => {
			const topicArn = "arn:aws:sns:us-east-1:000000000000:missing-topic";
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.deleteTopic(topicArn)).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
				message: `Topic '${topicArn}' not found`,
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteTopic("arn:aws:sns:us-east-1:000000000000:my-topic"),
			).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("re-throws unknown errors from deleteTopic", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteTopic("arn:aws:sns:us-east-1:000000000000:my-topic"),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── getTopicAttributes ────────────────────────────────────────────────────

	describe("getTopicAttributes", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("returns all topic attributes mapped from AWS response", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Attributes: {
					TopicArn: topicArn,
					DisplayName: "My Topic",
					Owner: "000000000000",
					Policy: '{"Version":"2012-10-17"}',
					SubscriptionsConfirmed: "5",
					SubscriptionsPending: "2",
					SubscriptionsDeleted: "1",
					DeliveryPolicy: '{"http":{"defaultHealthyRetryPolicy":{}}}',
					EffectiveDeliveryPolicy: '{"http":{"defaultHealthyRetryPolicy":{}}}',
					KmsMasterKeyId: "alias/my-key",
					FifoTopic: "true",
					ContentBasedDeduplication: "true",
				},
			});

			const result = await service.getTopicAttributes(topicArn);

			expect(result).toEqual({
				topicArn,
				displayName: "My Topic",
				owner: "000000000000",
				policy: '{"Version":"2012-10-17"}',
				subscriptionsConfirmed: 5,
				subscriptionsPending: 2,
				subscriptionsDeleted: 1,
				deliveryPolicy: '{"http":{"defaultHealthyRetryPolicy":{}}}',
				effectiveDeliveryPolicy: '{"http":{"defaultHealthyRetryPolicy":{}}}',
				kmsMasterKeyId: "alias/my-key",
				fifoTopic: true,
				contentBasedDeduplication: true,
			});
		});

		it("returns default values when attributes are missing", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Attributes: {},
			});

			const result = await service.getTopicAttributes(topicArn);

			expect(result).toEqual({
				topicArn,
				displayName: "",
				owner: "",
				policy: "",
				subscriptionsConfirmed: 0,
				subscriptionsPending: 0,
				subscriptionsDeleted: 0,
				deliveryPolicy: "",
				effectiveDeliveryPolicy: "",
				kmsMasterKeyId: "",
				fifoTopic: false,
				contentBasedDeduplication: false,
			});
		});

		it("returns default values when Attributes is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.getTopicAttributes(topicArn);

			expect(result).toMatchObject({
				topicArn,
				fifoTopic: false,
				contentBasedDeduplication: false,
			});
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.getTopicAttributes(topicArn)).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
				message: `Topic '${topicArn}' not found`,
			});
		});
	});

	// ── setTopicAttributes ────────────────────────────────────────────────────

	describe("setTopicAttributes", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("sets a topic attribute successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.setTopicAttributes(
				topicArn,
				"DisplayName",
				"New Name",
			);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setTopicAttributes(topicArn, "DisplayName", "x"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("invalid attribute") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setTopicAttributes(topicArn, "BadAttr", "value"),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("re-throws unknown errors from setTopicAttributes", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setTopicAttributes(topicArn, "DisplayName", "x"),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── listAllSubscriptions ──────────────────────────────────────────────────

	describe("listAllSubscriptions", () => {
		it("returns formatted subscription list", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Subscriptions: [
					{
						SubscriptionArn:
							"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001",
						Owner: "000000000000",
						Protocol: "https",
						Endpoint: "https://example.com/hook",
						TopicArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
					},
				],
			});

			const result = await service.listAllSubscriptions();

			expect(result).toEqual({
				subscriptions: [
					{
						subscriptionArn:
							"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001",
						owner: "000000000000",
						protocol: "https",
						endpoint: "https://example.com/hook",
						topicArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
					},
				],
			});
		});

		it("returns empty subscriptions list when Subscriptions is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listAllSubscriptions();

			expect(result).toEqual({ subscriptions: [] });
		});

		it("uses empty strings for subscription fields when all are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Subscriptions: [
					{
						/* all fields intentionally absent */
					},
				],
			});

			const result = await service.listAllSubscriptions();
			expect(result?.subscriptions[0]).toEqual({
				subscriptionArn: "",
				owner: "",
				protocol: "",
				endpoint: "",
				topicArn: "",
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listAllSubscriptions()).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});
	});

	// ── listSubscriptionsByTopic ──────────────────────────────────────────────

	describe("listSubscriptionsByTopic", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("returns subscriptions for the given topic", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Subscriptions: [
					{
						SubscriptionArn:
							"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001",
						Owner: "000000000000",
						Protocol: "sqs",
						Endpoint: "arn:aws:sqs:us-east-1:000000000000:my-queue",
						TopicArn: topicArn,
					},
				],
			});

			const result = await service.listSubscriptionsByTopic(topicArn);

			expect(result).toEqual({
				subscriptions: [
					{
						subscriptionArn:
							"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001",
						owner: "000000000000",
						protocol: "sqs",
						endpoint: "arn:aws:sqs:us-east-1:000000000000:my-queue",
						topicArn,
					},
				],
			});
		});

		it("returns empty subscriptions when Subscriptions is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listSubscriptionsByTopic(topicArn);

			expect(result).toEqual({ subscriptions: [] });
		});

		it("uses empty strings for subscription fields when all are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Subscriptions: [
					{
						// All fields intentionally absent to trigger ?? "" fallbacks
					},
				],
			});

			const result = await service.listSubscriptionsByTopic(topicArn);
			expect(result?.subscriptions[0]).toEqual({
				subscriptionArn: "",
				owner: "",
				protocol: "",
				endpoint: "",
				topicArn: "",
			});
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.listSubscriptionsByTopic(topicArn),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
				message: `Topic '${topicArn}' not found`,
			});
		});

		it("re-throws unknown errors from listSubscriptionsByTopic", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listSubscriptionsByTopic(topicArn)).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	// ── createSubscription ────────────────────────────────────────────────────

	describe("createSubscription", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";
		const subscriptionArn =
			"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001";

		it("creates a subscription with no options", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				SubscriptionArn: subscriptionArn,
			});

			const result = await service.createSubscription(
				topicArn,
				"https",
				"https://example.com/hook",
			);

			expect(result).toEqual({
				message: "Subscription created successfully",
				subscriptionArn,
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("sets RawMessageDelivery attribute when rawMessageDelivery option is true", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ SubscriptionArn: subscriptionArn })
				.mockResolvedValueOnce({});

			const result = await service.createSubscription(
				topicArn,
				"https",
				"https://example.com/hook",
				{ rawMessageDelivery: true },
			);

			expect(result).toEqual({
				message: "Subscription created successfully",
				subscriptionArn,
			});
			expect(client.send).toHaveBeenCalledTimes(2);

			const rawDeliveryCall = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[1][0];
			expect(rawDeliveryCall.input).toMatchObject({
				SubscriptionArn: subscriptionArn,
				AttributeName: "RawMessageDelivery",
				AttributeValue: "true",
			});
		});

		it("sets FilterPolicy attribute when filterPolicy option is provided", async () => {
			const filterPolicy = '{"eventType":["order_placed"]}';
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ SubscriptionArn: subscriptionArn })
				.mockResolvedValueOnce({});

			const result = await service.createSubscription(
				topicArn,
				"sqs",
				"arn:aws:sqs:us-east-1:000000000000:my-queue",
				{ filterPolicy },
			);

			expect(result).toEqual({
				message: "Subscription created successfully",
				subscriptionArn,
			});
			expect(client.send).toHaveBeenCalledTimes(2);

			const filterCall = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[1][0];
			expect(filterCall.input).toMatchObject({
				SubscriptionArn: subscriptionArn,
				AttributeName: "FilterPolicy",
				AttributeValue: filterPolicy,
			});
		});

		it("sets both RawMessageDelivery and FilterPolicy when both options are provided", async () => {
			const filterPolicy = '{"type":["alert"]}';
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ SubscriptionArn: subscriptionArn })
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({});

			await service.createSubscription(
				topicArn,
				"https",
				"https://example.com/hook",
				{ rawMessageDelivery: true, filterPolicy },
			);

			expect(client.send).toHaveBeenCalledTimes(3);

			const rawCall = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[1][0];
			expect(rawCall.input).toMatchObject({
				AttributeName: "RawMessageDelivery",
			});

			const filterCall = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[2][0];
			expect(filterCall.input).toMatchObject({
				AttributeName: "FilterPolicy",
				AttributeValue: filterPolicy,
			});
		});

		it("skips attribute calls when SubscriptionArn is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				SubscriptionArn: undefined,
			});

			const result = await service.createSubscription(
				topicArn,
				"https",
				"https://example.com/hook",
				{ rawMessageDelivery: true, filterPolicy: '{"x":["y"]}' },
			);

			expect(result).toEqual({
				message: "Subscription created successfully",
				subscriptionArn: undefined,
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createSubscription(topicArn, "https", "https://example.com"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("invalid protocol") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createSubscription(topicArn, "bad", "endpoint"),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("re-throws unknown errors from createSubscription", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createSubscription(topicArn, "https", "https://example.com"),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── deleteSubscription ────────────────────────────────────────────────────

	describe("deleteSubscription", () => {
		const subscriptionArn =
			"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001";

		it("deletes a subscription successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteSubscription(subscriptionArn);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 when subscription does not exist", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteSubscription(subscriptionArn),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
				message: `Subscription '${subscriptionArn}' not found`,
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteSubscription(subscriptionArn),
			).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("re-throws unknown errors from deleteSubscription", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.deleteSubscription(subscriptionArn)).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	// ── getSubscriptionAttributes ─────────────────────────────────────────────

	describe("getSubscriptionAttributes", () => {
		const subscriptionArn =
			"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001";

		it("returns all subscription attributes mapped from AWS response", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Attributes: {
					SubscriptionArn: subscriptionArn,
					TopicArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
					Owner: "000000000000",
					Protocol: "https",
					Endpoint: "https://example.com/hook",
					ConfirmationWasAuthenticated: "true",
					PendingConfirmation: "false",
					RawMessageDelivery: "true",
					FilterPolicy: '{"eventType":["order_placed"]}',
					FilterPolicyScope: "MessageAttributes",
					DeliveryPolicy: '{"healthyRetryPolicy":{}}',
					EffectiveDeliveryPolicy: '{"healthyRetryPolicy":{}}',
				},
			});

			const result = await service.getSubscriptionAttributes(subscriptionArn);

			expect(result).toEqual({
				subscriptionArn,
				topicArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
				owner: "000000000000",
				protocol: "https",
				endpoint: "https://example.com/hook",
				confirmationWasAuthenticated: true,
				pendingConfirmation: false,
				rawMessageDelivery: true,
				filterPolicy: '{"eventType":["order_placed"]}',
				filterPolicyScope: "MessageAttributes",
				deliveryPolicy: '{"healthyRetryPolicy":{}}',
				effectiveDeliveryPolicy: '{"healthyRetryPolicy":{}}',
			});
		});

		it("returns default values when attributes are missing", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Attributes: {},
			});

			const result = await service.getSubscriptionAttributes(subscriptionArn);

			expect(result).toEqual({
				subscriptionArn,
				topicArn: "",
				owner: "",
				protocol: "",
				endpoint: "",
				confirmationWasAuthenticated: false,
				pendingConfirmation: false,
				rawMessageDelivery: false,
				filterPolicy: "",
				filterPolicyScope: "",
				deliveryPolicy: "",
				effectiveDeliveryPolicy: "",
			});
		});

		it("returns default values when Attributes is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.getSubscriptionAttributes(subscriptionArn);

			expect(result).toMatchObject({
				subscriptionArn,
				rawMessageDelivery: false,
				pendingConfirmation: false,
			});
		});

		it("throws AppError 404 when subscription is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.getSubscriptionAttributes(subscriptionArn),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
				message: `Subscription '${subscriptionArn}' not found`,
			});
		});
	});

	// ── setSubscriptionFilterPolicy ───────────────────────────────────────────

	describe("setSubscriptionFilterPolicy", () => {
		const subscriptionArn =
			"arn:aws:sns:us-east-1:000000000000:my-topic:sub-001";

		it("sets the filter policy successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const filterPolicy = '{"eventType":["order_placed"]}';
			const result = await service.setSubscriptionFilterPolicy(
				subscriptionArn,
				filterPolicy,
			);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				SubscriptionArn: subscriptionArn,
				AttributeName: "FilterPolicy",
				AttributeValue: filterPolicy,
			});
		});

		it("throws AppError 404 when subscription is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setSubscriptionFilterPolicy(subscriptionArn, "{}"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid filter policy", async () => {
			const error = new Error("invalid filter") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setSubscriptionFilterPolicy(subscriptionArn, "bad-json"),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setSubscriptionFilterPolicy(subscriptionArn, "{}"),
			).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("re-throws unknown errors from setSubscriptionFilterPolicy", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.setSubscriptionFilterPolicy(subscriptionArn, "{}"),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── publishMessage ────────────────────────────────────────────────────────

	describe("publishMessage", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("publishes a message with body only and returns messageId", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				MessageId: "msg-id-001",
			});

			const result = await service.publishMessage(topicArn, "Hello, SNS!");

			expect(result).toEqual({ messageId: "msg-id-001" });
			expect(client.send).toHaveBeenCalledOnce();

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				TopicArn: topicArn,
				Message: "Hello, SNS!",
			});
			expect(call.input.Subject).toBeUndefined();
			expect(call.input.MessageAttributes).toBeUndefined();
			expect(call.input.TargetArn).toBeUndefined();
		});

		it("publishes a message with subject, messageAttributes, and targetArn", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				MessageId: "msg-id-002",
			});

			const result = await service.publishMessage(topicArn, "Alert!", {
				subject: "Important",
				messageAttributes: {
					severity: { DataType: "String", StringValue: "high" },
					count: { DataType: "Number", StringValue: "3" },
				},
				targetArn: "arn:aws:sns:us-east-1:000000000000:my-topic:endpoint-001",
			});

			expect(result).toEqual({ messageId: "msg-id-002" });

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				TopicArn: topicArn,
				Message: "Alert!",
				Subject: "Important",
				MessageAttributes: {
					severity: { DataType: "String", StringValue: "high" },
					count: { DataType: "Number", StringValue: "3" },
				},
				TargetArn: "arn:aws:sns:us-east-1:000000000000:my-topic:endpoint-001",
			});
		});

		it("does not include Subject when not provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				MessageId: "msg-id-003",
			});

			await service.publishMessage(topicArn, "No subject", {
				messageAttributes: {
					key: { DataType: "String", StringValue: "val" },
				},
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input.Subject).toBeUndefined();
			expect(call.input.MessageAttributes).toBeDefined();
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.publishMessage(topicArn, "Hello"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("invalid") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.publishMessage(topicArn, "Hello"),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("re-throws unknown errors from publishMessage", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.publishMessage(topicArn, "Hello")).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	// ── publishBatch ──────────────────────────────────────────────────────────

	describe("publishBatch", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("publishes a batch and returns successful and failed entries", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Successful: [
					{ Id: "entry-1", MessageId: "msg-001" },
					{ Id: "entry-2", MessageId: "msg-002" },
				],
				Failed: [
					{
						Id: "entry-3",
						Code: "InvalidParameter",
						Message: "bad entry",
						SenderFault: true,
					},
				],
			});

			const result = await service.publishBatch(topicArn, [
				{ id: "entry-1", message: "Message 1" },
				{ id: "entry-2", message: "Message 2" },
				{ id: "entry-3", message: "Bad entry" },
			]);

			expect(result).toEqual({
				successful: [
					{ id: "entry-1", messageId: "msg-001" },
					{ id: "entry-2", messageId: "msg-002" },
				],
				failed: [
					{
						id: "entry-3",
						code: "InvalidParameter",
						message: "bad entry",
						senderFault: true,
					},
				],
			});
		});

		it("returns empty successful and failed arrays when both are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.publishBatch(topicArn, [
				{ id: "e1", message: "msg" },
			]);

			expect(result).toEqual({ successful: [], failed: [] });
		});

		it("includes subject and messageAttributes in batch entries when provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Successful: [{ Id: "e1", MessageId: "m1" }],
				Failed: [],
			});

			await service.publishBatch(topicArn, [
				{
					id: "e1",
					message: "msg",
					subject: "Subject Line",
					messageAttributes: {
						color: { DataType: "String", StringValue: "red" },
					},
				},
			]);

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input.PublishBatchRequestEntries[0]).toMatchObject({
				Id: "e1",
				Message: "msg",
				Subject: "Subject Line",
				MessageAttributes: {
					color: { DataType: "String", StringValue: "red" },
				},
			});
		});

		it("omits Subject and MessageAttributes from batch entries when not provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Successful: [{ Id: "e1", MessageId: "m1" }],
				Failed: [],
			});

			await service.publishBatch(topicArn, [{ id: "e1", message: "msg" }]);

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			const entry = call.input.PublishBatchRequestEntries[0];
			expect(entry.Subject).toBeUndefined();
			expect(entry.MessageAttributes).toBeUndefined();
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.publishBatch(topicArn, [{ id: "e1", message: "msg" }]),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("bad batch") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.publishBatch(topicArn, [{ id: "e1", message: "msg" }]),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("re-throws unknown errors from publishBatch", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.publishBatch(topicArn, [{ id: "e1", message: "msg" }]),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── listTagsForResource ───────────────────────────────────────────────────

	describe("listTagsForResource", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("returns formatted tag list", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Tags: [
					{ Key: "env", Value: "production" },
					{ Key: "team", Value: "backend" },
				],
			});

			const result = await service.listTagsForResource(topicArn);

			expect(result).toEqual({
				tags: [
					{ key: "env", value: "production" },
					{ key: "team", value: "backend" },
				],
			});
		});

		it("returns empty tags list when Tags is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listTagsForResource(topicArn);

			expect(result).toEqual({ tags: [] });
		});

		it("uses empty strings for tag key and value when undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Tags: [
					{
						/* Key and Value intentionally absent */
					},
				],
			});

			const result = await service.listTagsForResource(topicArn);
			expect(result?.tags[0]).toEqual({ key: "", value: "" });
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listTagsForResource(topicArn)).rejects.toMatchObject(
				{
					statusCode: 404,
					code: "NOT_FOUND",
				},
			);
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listTagsForResource(topicArn)).rejects.toMatchObject(
				{
					statusCode: 403,
					code: "AUTHORIZATION_ERROR",
				},
			);
		});
	});

	// ── tagResource ───────────────────────────────────────────────────────────

	describe("tagResource", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("tags a resource successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.tagResource(topicArn, [
				{ key: "env", value: "staging" },
				{ key: "owner", value: "alice" },
			]);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				ResourceArn: topicArn,
				Tags: [
					{ Key: "env", Value: "staging" },
					{ Key: "owner", Value: "alice" },
				],
			});
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.tagResource(topicArn, [{ key: "k", value: "v" }]),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("bad tag") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.tagResource(topicArn, [{ key: "k", value: "v" }]),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.tagResource(topicArn, [{ key: "k", value: "v" }]),
			).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("re-throws unknown errors from tagResource", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.tagResource(topicArn, [{ key: "k", value: "v" }]),
			).rejects.toThrow("Unexpected error");
		});
	});

	// ── untagResource ─────────────────────────────────────────────────────────

	describe("untagResource", () => {
		const topicArn = "arn:aws:sns:us-east-1:000000000000:my-topic";

		it("untags a resource successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.untagResource(topicArn, ["env", "owner"]);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				ResourceArn: topicArn,
				TagKeys: ["env", "owner"],
			});
		});

		it("throws AppError 404 when topic is not found", async () => {
			const error = new Error("not found") as Error & { name: string };
			error.name = "NotFoundException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.untagResource(topicArn, ["env"]),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("throws AppError 400 on invalid parameter", async () => {
			const error = new Error("bad tag key") as Error & { name: string };
			error.name = "InvalidParameterException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.untagResource(topicArn, ["bad-key"]),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("throws AppError 403 on authorization error", async () => {
			const error = new Error("forbidden") as Error & { name: string };
			error.name = "AuthorizationErrorException";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.untagResource(topicArn, ["env"]),
			).rejects.toMatchObject({
				statusCode: 403,
				code: "AUTHORIZATION_ERROR",
			});
		});

		it("re-throws unknown errors from untagResource", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.untagResource(topicArn, ["env"])).rejects.toThrow(
				"Unexpected error",
			);
		});
	});
});
