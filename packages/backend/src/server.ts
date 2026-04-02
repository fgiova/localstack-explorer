/* v8 ignore start */
import { config } from "./config.js";
import { buildApp } from "./index.js";

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

main().catch((err) => {
	console.error("Error starting server:", err);
	process.exit(1);
});
/* v8 ignore stop */
