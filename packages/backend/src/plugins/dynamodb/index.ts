import type { FastifyInstance } from "fastify";
import { createDynamoDBClient, createDynamoDBDocumentClient, createDynamoDBStreamsClient } from "../../aws/clients.js";
import { DynamoDBService } from "./service.js";
import { dynamodbRoutes } from "./routes.js";

export default async function dynamodbPlugin(app: FastifyInstance) {
  const dynamoDBClient = createDynamoDBClient();
  const docClient = createDynamoDBDocumentClient();
  const streamsClient = createDynamoDBStreamsClient();
  const dynamodbService = new DynamoDBService(dynamoDBClient, docClient, streamsClient);

  await app.register(dynamodbRoutes, { dynamodbService });
}
