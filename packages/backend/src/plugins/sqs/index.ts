import type { FastifyInstance } from "fastify";
import { sqsRoutes } from "./routes.js";

export default async function sqsPlugin(app: FastifyInstance) {
  await app.register(sqsRoutes);
}
