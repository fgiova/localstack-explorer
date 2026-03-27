import multipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";
import { createS3Client } from "../../aws/clients.js";
import { S3Service } from "./service.js";
import { s3Routes } from "./routes.js";

export default async function s3Plugin(app: FastifyInstance) {
  // Register multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max
    },
  });

  const s3Client = createS3Client();
  const s3Service = new S3Service(s3Client);

  await app.register(s3Routes, { s3Service });
}
