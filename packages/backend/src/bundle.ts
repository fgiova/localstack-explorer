import path from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import type { ServiceName } from "./config.js";
import { config } from "./config.js";
import { checkLocalstackHealth } from "./health.js";
import clientCachePlugin from "./plugins/client-cache.js";
import cloudformationPlugin from "./plugins/cloudformation/index.js";
import dynamodbPlugin from "./plugins/dynamodb/index.js";
import iamPlugin from "./plugins/iam/index.js";
import lambdaPlugin from "./plugins/lambda/index.js";
import localstackConfigPlugin from "./plugins/localstack-config.js";
// Explicit plugin imports (replaces autoload for bundled builds)
import s3Plugin from "./plugins/s3/index.js";
import snsPlugin from "./plugins/sns/index.js";
import sqsPlugin from "./plugins/sqs/index.js";
import { registerErrorHandler } from "./shared/errors.js";

// __dirname is provided by:
// - CJS: natively by Node.js
// - ESM: tsup banner shim (see tsup.config.ts)
declare const __dirname: string;

const pluginMap: Record<
	ServiceName,
	(app: Parameters<typeof s3Plugin>[0]) => Promise<void>
> = {
	s3: s3Plugin,
	sqs: sqsPlugin,
	sns: snsPlugin,
	iam: iamPlugin,
	lambda: lambdaPlugin,
	cloudformation: cloudformationPlugin,
	dynamodb: dynamodbPlugin,
};

async function main() {
	const app = Fastify({
		// Use sync destination to avoid pino's thread-stream worker
		// (worker .js files don't exist in bundled builds)
	});

	// Register CORS
	await app.register(cors, {
		origin: true,
	});

	// Register centralized error handler
	registerErrorHandler(app);

	// Register localstack config plugin (decorates request with localstackConfig)
	await app.register(localstackConfigPlugin);

	// Register client cache plugin (decorates instance with clientCache)
	await app.register(clientCachePlugin);

	// Health check
	app.get("/api/health", async (request) => {
		const { endpoint, region } = request.localstackConfig;
		return checkLocalstackHealth(endpoint, region);
	});

	// Enabled services endpoint
	app.get("/api/services", async () => ({
		services: config.enabledServices,
		defaultEndpoint: config.localstackEndpoint,
		defaultRegion: config.localstackRegion,
	}));

	// Register only enabled service plugins with /api prefix
	for (const service of config.enabledServices) {
		const plugin = pluginMap[service];
		if (plugin) {
			await app.register(plugin, { prefix: `/api/${service}` });
		}
	}

	// Serve frontend static files
	const publicDir = path.join(__dirname, "public");
	await app.register(fastifyStatic, {
		root: publicDir,
		wildcard: false,
	});

	// SPA fallback: serve index.html for all non-API routes
	app.setNotFoundHandler((_request, reply) => {
		return reply.sendFile("index.html");
	});

	try {
		await app.listen({ port: config.port, host: "0.0.0.0" });
		app.log.info(`Server running on http://localhost:${config.port}`);
		app.log.info(`Enabled services: ${config.enabledServices.join(", ")}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();
