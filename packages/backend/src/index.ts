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

  // Autoload service plugins from plugins directory
  await app.register(autoload, {
    dir: path.join(__dirname, "plugins"),
    dirNameRoutePrefix: true,
    options: { prefix: "/api" },
  });

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`Server running on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
