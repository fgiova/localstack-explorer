import Fastify, { type FastifyInstance } from "fastify";
import clientCachePlugin from "../../src/plugins/client-cache.js";
import localstackConfigPlugin from "../../src/plugins/localstack-config.js";
import { registerErrorHandler } from "../../src/shared/errors.js";

export function getLocalstackHeaders() {
	return {
		"x-localstack-endpoint":
			process.env.LOCALSTACK_ENDPOINT ?? "http://localhost:4566",
		"x-localstack-region": process.env.LOCALSTACK_REGION ?? "eu-central-1",
	};
}

export async function buildApp(
	registerPlugin: (app: FastifyInstance) => Promise<void>,
): Promise<FastifyInstance> {
	const app = Fastify();
	registerErrorHandler(app);
	await app.register(localstackConfigPlugin);
	await app.register(clientCachePlugin);
	await registerPlugin(app);
	await app.ready();
	return app;
}
