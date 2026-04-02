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
import { sqsRoutes } from "../../../src/plugins/sqs/routes.js";
import { registerErrorHandler } from "../../../src/shared/errors.js";

interface MockSQSService {
	listQueues: Mock;
	createQueue: Mock;
	getQueueUrl: Mock;
	deleteQueue: Mock;
	purgeQueue: Mock;
	getQueueDetail: Mock;
	sendMessage: Mock;
	receiveMessages: Mock;
	deleteMessage: Mock;
}

function createMockSQSService(): MockSQSService {
	return {
		listQueues: vi.fn().mockResolvedValue({ queues: [] }),
		createQueue: vi
			.fn()
			.mockResolvedValue({ message: "Queue created", queueUrl: "http://sqs/test-queue" }),
		getQueueUrl: vi.fn().mockResolvedValue("http://sqs/test-queue"),
		deleteQueue: vi.fn().mockResolvedValue({ success: true }),
		purgeQueue: vi.fn().mockResolvedValue({ success: true }),
		getQueueDetail: vi.fn().mockResolvedValue({
			queueUrl: "http://sqs/test-queue",
			queueName: "test-queue",
			queueArn: "arn:aws:sqs:us-east-1:000000000000:test-queue",
			approximateNumberOfMessages: 0,
			approximateNumberOfMessagesNotVisible: 0,
			approximateNumberOfMessagesDelayed: 0,
			createdTimestamp: "1000000000",
			lastModifiedTimestamp: "1000000000",
			visibilityTimeout: 30,
			maximumMessageSize: 262144,
			messageRetentionPeriod: 345600,
			delaySeconds: 0,
			receiveMessageWaitTimeSeconds: 0,
		}),
		sendMessage: vi.fn().mockResolvedValue({ messageId: "msg-123" }),
		receiveMessages: vi.fn().mockResolvedValue([]),
		deleteMessage: vi.fn().mockResolvedValue({ success: true }),
	};
}

vi.mock("../../../src/plugins/sqs/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../../src/plugins/sqs/service.js")
		>();
	return {
		...actual,
		SQSService: vi.fn(),
	};
});

import { SQSService as SQSServiceClass } from "../../../src/plugins/sqs/service.js";

describe("SQS Routes", () => {
	let app: FastifyInstance;
	let mockService: MockSQSService;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockSQSService();

		(SQSServiceClass as unknown as Mock).mockImplementation(() => mockService);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({
				sqs: {},
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

		await app.register(sqsRoutes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("DELETE /:queueName/messages (deleteMessage)", () => {
		it("should delete a message with a receipt handle", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-queue/messages",
				payload: { receiptHandle: "test-receipt-handle" },
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
			expect(mockService.deleteMessage).toHaveBeenCalledWith(
				"test-queue",
				"test-receipt-handle",
			);
		});

		it("should return 400 when receiptHandle is missing", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-queue/messages",
				payload: {},
			});
			expect(response.statusCode).toBe(400);
		});
	});
});
