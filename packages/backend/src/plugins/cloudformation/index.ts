import type { FastifyInstance } from "fastify";
import { cloudformationRoutes } from "./routes.js";

export default async function cloudformationPlugin(app: FastifyInstance) {
  await app.register(cloudformationRoutes);
}