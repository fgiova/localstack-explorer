import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SQSClient } from "@aws-sdk/client-sqs";
import { SQSService } from "../../../src/plugins/sqs/service.js";
import { AppError } from "../../../src/shared/errors.js";

function createMockSQSClient() {
  return {
    send: vi.fn(),
  } as unknown as SQSClient;
}

describe("SQSService", () => {
  let client: SQSClient;
  let service: SQSService;

  beforeEach(() => {
    client = createMockSQSClient();
    service = new SQSService(client);
  });

  describe("listQueues", () => {
    it("returns formatted queue list with names extracted from URLs", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        QueueUrls: [
          "http://localhost:4566/000000000000/my-queue",
          "http://localhost:4566/000000000000/another-queue",
        ],
      });

      const result = await service.listQueues();

      expect(result).toEqual({
        queues: [
          { queueUrl: "http://localhost:4566/000000000000/my-queue", queueName: "my-queue" },
          { queueUrl: "http://localhost:4566/000000000000/another-queue", queueName: "another-queue" },
        ],
      });
    });

    it("returns empty queue list when no queues exist", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        QueueUrls: [],
      });

      const result = await service.listQueues();

      expect(result).toEqual({ queues: [] });
    });

    it("returns empty queue list when QueueUrls is undefined", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await service.listQueues();

      expect(result).toEqual({ queues: [] });
    });
  });

  describe("createQueue", () => {
    it("creates a queue successfully and returns message and URL", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        QueueUrl: "http://localhost:4566/000000000000/new-queue",
      });

      const result = await service.createQueue("new-queue");

      expect(result).toEqual({
        message: "Queue 'new-queue' created successfully",
        queueUrl: "http://localhost:4566/000000000000/new-queue",
      });
      expect(client.send).toHaveBeenCalledOnce();
    });

    it("throws AppError with 409 when queue already exists", async () => {
      const error = new Error("Queue already exists") as Error & { name: string };
      error.name = "QueueAlreadyExists";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(service.createQueue("existing-queue")).rejects.toThrow(AppError);
      await expect(service.createQueue("existing-queue")).rejects.toMatchObject({
        statusCode: 409,
        code: "QUEUE_EXISTS",
        message: "Queue 'existing-queue' already exists",
      });
    });

    it("re-throws unknown errors from createQueue", async () => {
      const error = new Error("Unknown error");
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(service.createQueue("my-queue")).rejects.toThrow("Unknown error");
    });
  });

  describe("deleteQueue", () => {
    it("deletes a queue successfully", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await service.deleteQueue("http://localhost:4566/000000000000/my-queue");

      expect(result).toEqual({ success: true });
      expect(client.send).toHaveBeenCalledOnce();
    });

    it("throws AppError with 404 when queue does not exist", async () => {
      const error = new Error("Queue does not exist") as Error & { name: string };
      error.name = "NonExistentQueue";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const queueUrl = "http://localhost:4566/000000000000/missing-queue";
      await expect(service.deleteQueue(queueUrl)).rejects.toThrow(AppError);
      await expect(service.deleteQueue(queueUrl)).rejects.toMatchObject({
        statusCode: 404,
        code: "QUEUE_NOT_FOUND",
        message: `Queue '${queueUrl}' not found`,
      });
    });

    it("re-throws unknown errors from deleteQueue", async () => {
      const error = new Error("Unexpected error");
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(
        service.deleteQueue("http://localhost:4566/000000000000/my-queue")
      ).rejects.toThrow("Unexpected error");
    });
  });

  describe("purgeQueue", () => {
    it("purges a queue successfully", async () => {
      (client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await service.purgeQueue("http://localhost:4566/000000000000/my-queue");

      expect(result).toEqual({ success: true });
      expect(client.send).toHaveBeenCalledOnce();
    });

    it("throws AppError with 404 when queue does not exist during purge", async () => {
      const error = new Error("Queue does not exist") as Error & { name: string };
      error.name = "NonExistentQueue";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const queueUrl = "http://localhost:4566/000000000000/missing-queue";
      await expect(service.purgeQueue(queueUrl)).rejects.toMatchObject({
        statusCode: 404,
        code: "QUEUE_NOT_FOUND",
      });
    });

    it("throws AppError with 409 when purge is already in progress", async () => {
      const error = new Error("Purge in progress") as Error & { name: string };
      error.name = "PurgeQueueInProgress";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const queueUrl = "http://localhost:4566/000000000000/my-queue";
      await expect(service.purgeQueue(queueUrl)).rejects.toMatchObject({
        statusCode: 409,
        code: "PURGE_IN_PROGRESS",
        message: `Queue '${queueUrl}' purge already in progress`,
      });
    });

    it("re-throws unknown errors from purgeQueue", async () => {
      const error = new Error("Unexpected error");
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(
        service.purgeQueue("http://localhost:4566/000000000000/my-queue")
      ).rejects.toThrow("Unexpected error");
    });
  });

  describe("getQueueDetail", () => {
    it("returns queue detail with attributes mapped from AWS response", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({
          Attributes: {
            ApproximateNumberOfMessages: "42",
            ApproximateNumberOfMessagesNotVisible: "3",
            ApproximateNumberOfMessagesDelayed: "1",
            CreatedTimestamp: "1700000000",
            DelaySeconds: "0",
            VisibilityTimeout: "30",
            MaximumMessageSize: "262144",
            MessageRetentionPeriod: "345600",
          },
        });

      const result = await service.getQueueDetail("my-queue");

      expect(result).toEqual({
        queueUrl: "http://localhost:4566/000000000000/my-queue",
        queueName: "my-queue",
        queueArn: undefined,
        approximateNumberOfMessages: 42,
        approximateNumberOfMessagesNotVisible: 3,
        approximateNumberOfMessagesDelayed: 1,
        createdTimestamp: "1700000000",
        lastModifiedTimestamp: undefined,
        delaySeconds: 0,
        visibilityTimeout: 30,
        maximumMessageSize: 262144,
        messageRetentionPeriod: 345600,
        receiveMessageWaitTimeSeconds: 0,
      });
    });

    it("returns default values when attributes are missing", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({
          Attributes: {},
        });

      const result = await service.getQueueDetail("my-queue");

      expect(result.approximateNumberOfMessages).toBe(0);
      expect(result.createdTimestamp).toBeUndefined();
    });

    it("throws AppError with 404 when queue does not exist", async () => {
      const error = new Error("Queue does not exist") as Error & { name: string };
      error.name = "QueueDoesNotExist";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(service.getQueueDetail("missing-queue")).rejects.toMatchObject({
        statusCode: 404,
        code: "QUEUE_NOT_FOUND",
      });
    });
  });

  describe("sendMessage", () => {
    it("sends a message with body only", async () => {
      // First call: getQueueUrl
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        // Second call: sendMessage
        .mockResolvedValueOnce({ MessageId: "msg-id-001" });

      const result = await service.sendMessage("my-queue", "Hello, World!");

      expect(result).toEqual({ messageId: "msg-id-001" });
      expect(client.send).toHaveBeenCalledTimes(2);
    });

    it("sends a message with delay and message attributes", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({ MessageId: "msg-id-002" });

      const result = await service.sendMessage("my-queue", "Delayed message", 10, {
        color: { DataType: "String", StringValue: "blue" },
        count: { DataType: "Number", StringValue: "5" },
      });

      expect(result).toEqual({ messageId: "msg-id-002" });

      // Verify the SendMessageCommand was called with delay and attributes
      const sendCall = (client.send as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(sendCall.input).toMatchObject({
        QueueUrl: "http://localhost:4566/000000000000/my-queue",
        MessageBody: "Delayed message",
        DelaySeconds: 10,
        MessageAttributes: {
          color: { DataType: "String", StringValue: "blue" },
          count: { DataType: "Number", StringValue: "5" },
        },
      });
    });

    it("throws AppError with 404 when queue not found during sendMessage", async () => {
      const error = new Error("Queue does not exist") as Error & { name: string };
      error.name = "QueueDoesNotExist";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(service.sendMessage("missing-queue", "Hello")).rejects.toMatchObject({
        statusCode: 404,
        code: "QUEUE_NOT_FOUND",
      });
    });
  });

  describe("receiveMessages", () => {
    it("receives messages with body, receipt handle, and attributes", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({
          Messages: [
            {
              MessageId: "msg-001",
              Body: "Test message body",
              ReceiptHandle: "receipt-handle-001",
              Attributes: { SenderId: "123456" },
              MessageAttributes: {
                priority: { DataType: "String", StringValue: "high" },
              },
            },
          ],
        });

      const result = await service.receiveMessages("my-queue");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        messageId: "msg-001",
        body: "Test message body",
        receiptHandle: "receipt-handle-001",
        attributes: { SenderId: "123456" },
        messageAttributes: {
          priority: { DataType: "String", StringValue: "high" },
        },
      });
    });

    it("handles empty response when no messages are available", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({ Messages: [] });

      const result = await service.receiveMessages("my-queue");

      expect(result).toEqual([]);
    });

    it("handles undefined Messages in response", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({});

      const result = await service.receiveMessages("my-queue");

      expect(result).toEqual([]);
    });

    it("uses default maxMessages and waitTimeSeconds when not provided", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({ Messages: [] });

      await service.receiveMessages("my-queue");

      const receiveCall = (client.send as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(receiveCall.input).toMatchObject({
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ["All"],
      });
    });

    it("passes custom maxMessages and waitTimeSeconds", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({ Messages: [] });

      await service.receiveMessages("my-queue", 5, 20);

      const receiveCall = (client.send as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(receiveCall.input).toMatchObject({
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20,
      });
    });
  });

  describe("deleteMessage", () => {
    it("deletes a message with the given receipt handle", async () => {
      (client.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ QueueUrl: "http://localhost:4566/000000000000/my-queue" })
        .mockResolvedValueOnce({});

      const result = await service.deleteMessage("my-queue", "receipt-handle-abc");

      expect(result).toEqual({ success: true });
      expect(client.send).toHaveBeenCalledTimes(2);

      const deleteCall = (client.send as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(deleteCall.input).toMatchObject({
        QueueUrl: "http://localhost:4566/000000000000/my-queue",
        ReceiptHandle: "receipt-handle-abc",
      });
    });

    it("throws AppError with 404 when queue not found during deleteMessage", async () => {
      const error = new Error("Queue does not exist") as Error & { name: string };
      error.name = "NonExistentQueue";
      (client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(
        service.deleteMessage("missing-queue", "receipt-handle-abc")
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "QUEUE_NOT_FOUND",
      });
    });
  });
});
