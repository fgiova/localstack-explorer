import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { s3Routes } from "./routes.js";

export default async function s3Plugin(app: FastifyInstance) {
	// Register multipart support for file uploads
	await app.register(multipart, {
		limits: {
			fileSize: 100 * 1024 * 1024, // 100MB max
		},
	});

	await app.register(s3Routes);
}
