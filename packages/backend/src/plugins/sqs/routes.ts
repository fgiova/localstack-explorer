import type { FastifyInstance } from "fastify";
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

export async function sqsRoutes(app: FastifyInstance) {
  // List queues
  app.get("/", {
    schema: {
      response: {
        200: QueueListResponseSchema,
        501: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      return service.listQueues();
    },
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { name } = request.body as { name: string };
      const result = await service.createQueue(name);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      const queueUrl = await service.getQueueUrl(queueName);
      return service.deleteQueue(queueUrl);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      const queueUrl = await service.getQueueUrl(queueName);
      return service.purgeQueue(queueUrl);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      return service.getQueueDetail(queueName);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      const { body, delaySeconds, messageAttributes } = request.body as {
        body: string;
        delaySeconds?: number;
        messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
      };
      const result = await service.sendMessage(queueName, body, delaySeconds, messageAttributes);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      const { maxMessages, waitTimeSeconds } = request.query as {
        maxMessages?: number;
        waitTimeSeconds?: number;
      };
      const messages = await service.receiveMessages(queueName, maxMessages, waitTimeSeconds, request.signal);
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
      const clients = request.server.clientCache.getClients(
        request.localstackConfig.endpoint,
        request.localstackConfig.region
      );
      const service = new SQSService(clients.sqs);
      const { queueName } = request.params as { queueName: string };
      const { receiptHandle } = request.body as { receiptHandle: string };
      return service.deleteMessage(queueName, receiptHandle);
    },
  });
}
