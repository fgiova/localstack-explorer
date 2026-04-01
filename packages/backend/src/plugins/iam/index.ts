import type { FastifyInstance } from "fastify";
import { iamRoutes } from "./routes.js";

export default async function iamPlugin(app: FastifyInstance) {
	await app.register(iamRoutes);
}
