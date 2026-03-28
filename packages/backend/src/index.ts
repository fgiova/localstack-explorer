import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import autoload from "@fastify/autoload";
import { config } from "./config.js";
import { registerErrorHandler } from "./shared/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = Fastify({
    logger: true,
  });

  // Register CORS
  await app.register(cors, {
    origin: true,
  });

  // Register centralized error handler
  registerErrorHandler(app);

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  // Enabled services endpoint
  app.get("/api/services", async () => ({
    services: config.enabledServices,
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
