import type { FastifyInstance } from "fastify";
import { dynamodbRoutes } from "./routes.js";

export default async function dynamodbPlugin(app: FastifyInstance) {
  await app.register(dynamodbRoutes);
}
