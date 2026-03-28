import { FastifyInstance } from "fastify";
import { SQSService } from "./service.js";
import {
  QueueListResponseSchema,
  CreateQueueBodySchema,
  QueueParamsSchema,
  QueueDetailResponseSchema,
  SendMessageBodySchema,
  SendMessageResponseSchema,
  ReceiveMessagesQuerySchema,
  ReceiveMessagesResponseSchema,
  DeleteMessageBodySchema,
  MessageResponseSchema,
  DeleteResponseSchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function sqsRoutes(app: FastifyInstance, opts: { sqsService: SQSService }) {
  const { sqsService } = opts;

  // List queues
  app.get("/", {
    schema: {
      response: {
        200: QueueListResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async () => sqsService.listQueues(),
  });

  // Create queue
  app.post("/", {
    schema: {
      body: CreateQueueBodySchema,
      response: {
        201: MessageResponseSchema,
        409: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { name } = request.body as { name: string };
      const result = await sqsService.createQueue(name);
      return reply.status(201).send(result);
    },
  });

  // Delete queue
  app.delete("/:queueName", {
    schema: {
      params: QueueParamsSchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { queueName } = request.params as { queueName: string };
      const queueUrl = await sqsService.getQueueUrl(queueName);
      return sqsService.deleteQueue(queueUrl);
    },
  });

  // Purge queue
  app.post("/:queueName/purge", {
    schema: {
      params: QueueParamsSchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { queueName } = request.params as { queueName: string };
      const queueUrl = await sqsService.getQueueUrl(queueName);
      return sqsService.purgeQueue(queueUrl);
    },
  });

  // Get queue attributes
  app.get("/:queueName/attributes", {
    schema: {
      params: QueueParamsSchema,
      response: {
        200: QueueDetailResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { queueName } = request.params as { queueName: string };
      return sqsService.getQueueDetail(queueName);
    },
  });

  // Send message
  app.post("/:queueName/messages", {
    schema: {
      params: QueueParamsSchema,
      body: SendMessageBodySchema,
      response: {
        201: SendMessageResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { queueName } = request.params as { queueName: string };
      const { body, delaySeconds, messageAttributes } = request.body as {
        body: string;
        delaySeconds?: number;
        messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
      };
      const result = await sqsService.sendMessage(queueName, body, delaySeconds, messageAttributes);
      return reply.status(201).send(result);
    },
  });

  // Receive messages
  app.get("/:queueName/messages", {
    schema: {
      params: QueueParamsSchema,
      querystring: ReceiveMessagesQuerySchema,
      response: {
        200: ReceiveMessagesResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { queueName } = request.params as { queueName: string };
      const { maxMessages, waitTimeSeconds } = request.query as {
        maxMessages?: number;
        waitTimeSeconds?: number;
      };
      const messages = await sqsService.receiveMessages(queueName, maxMessages, waitTimeSeconds, request.signal);
      return { messages };
    },
  });

  // Delete message
  app.delete("/:queueName/messages", {
    schema: {
      params: QueueParamsSchema,
      body: DeleteMessageBodySchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { queueName } = request.params as { queueName: string };
      const { receiptHandle } = request.body as { receiptHandle: string };
      return sqsService.deleteMessage(queueName, receiptHandle);
    },
  });
}
