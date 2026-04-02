import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import autoload from "@fastify/autoload";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.js";
import { checkLocalstackHealth } from "./health.js";
import clientCachePlugin from "./plugins/client-cache.js";
import localstackConfigPlugin from "./plugins/localstack-config.js";
import { registerErrorHandler } from "./shared/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp(
	options: { logger?: boolean } = {},
): Promise<FastifyInstance> {
	const app = Fastify({
		logger: options.logger ?? false,
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

	// Autoload service plugins from plugins directory (only enabled services)
	const enabledSet = new Set<string>(config.enabledServices);
	await app.register(autoload, {
		dir: path.join(__dirname, "plugins"),
		dirNameRoutePrefix: true,
		options: { prefix: "/api" },
		matchFilter: (pluginPath) => {
			// pluginPath from autoload is like "/s3/index.ts" — extract top-level dir
			const topDir = pluginPath.split("/")[1];
			return enabledSet.has(topDir);
		},
	});

	// Serve frontend static files if public directory exists
	const publicDir = path.join(__dirname, "public");
	if (fs.existsSync(publicDir)) {
		await app.register(fastifyStatic, {
			root: publicDir,
			wildcard: false,
		});

		// SPA fallback: serve index.html for all non-API routes
		app.setNotFoundHandler((_request, reply) => {
			return reply.sendFile("index.html");
		});
	}

	return app;
}

/* v8 ignore start */
async function main() {
	const app = await buildApp({ logger: true });

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
/* v8 ignore stop */
