import type { FastifyInstance } from "fastify";
import { snsRoutes } from "./routes.js";

export default async function snsPlugin(app: FastifyInstance) {
  await app.register(snsRoutes);
}
