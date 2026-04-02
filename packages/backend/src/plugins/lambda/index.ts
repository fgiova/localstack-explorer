import type { FastifyInstance } from "fastify";
import { lambdaRoutes } from "./routes.js";

export default async function lambdaPlugin(app: FastifyInstance) {
	await app.register(lambdaRoutes);
}
