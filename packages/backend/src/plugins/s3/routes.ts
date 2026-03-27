import { FastifyInstance } from "fastify";
import { S3Service } from "./service.js";
import {
  BucketListResponseSchema,
  CreateBucketBodySchema,
  BucketParamsSchema,
  ListObjectsQuerySchema,
  ObjectKeyQuerySchema,
  ListObjectsResponseSchema,
  ObjectPropertiesSchema,
  UploadResponseSchema,
  DeleteResponseSchema,
  MessageResponseSchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function s3Routes(app: FastifyInstance, opts: { s3Service: S3Service }) {
  const { s3Service } = opts;

  // List buckets
  app.get("/", {
    schema: {
      response: {
        200: BucketListResponseSchema,
      },
    },
    handler: async () => {
      return s3Service.listBuckets();
    },
  });

  // Create bucket
  app.post("/", {
    schema: {
      body: CreateBucketBodySchema,
      response: {
        201: MessageResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { name } = request.body as { name: string };
      const result = await s3Service.createBucket(name);
      return reply.status(201).send(result);
    },
  });

  // Delete bucket
  app.delete("/:bucketName", {
    schema: {
      params: BucketParamsSchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { bucketName } = request.params as { bucketName: string };
      return s3Service.deleteBucket(bucketName);
    },
  });

  // List objects
  app.get("/:bucketName/objects", {
    schema: {
      params: BucketParamsSchema,
      querystring: ListObjectsQuerySchema,
      response: {
        200: ListObjectsResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { bucketName } = request.params as { bucketName: string };
      const { prefix, delimiter, continuationToken, maxKeys } = request.query as {
        prefix?: string;
        delimiter?: string;
        continuationToken?: string;
        maxKeys?: number;
      };
      return s3Service.listObjects(bucketName, prefix, delimiter, continuationToken, maxKeys);
    },
  });

  // Get object properties
  app.get("/:bucketName/objects/properties", {
    schema: {
      params: BucketParamsSchema,
      querystring: ObjectKeyQuerySchema,
      response: {
        200: ObjectPropertiesSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { bucketName } = request.params as { bucketName: string };
      const { key } = request.query as { key: string };
      return s3Service.getObjectProperties(bucketName, key);
    },
  });

  // Upload object (multipart)
  app.post("/:bucketName/objects/upload", {
    schema: {
      params: BucketParamsSchema,
      response: {
        200: UploadResponseSchema,
      },
    },
    handler: async (request) => {
      const { bucketName } = request.params as { bucketName: string };
      const data = await request.file();
      if (!data) {
        throw new (await import("../../shared/errors.js")).AppError("No file provided", 400, "NO_FILE");
      }
      const buffer = await data.toBuffer();
      const key = (data.fields.key as { value: string } | undefined)?.value ?? data.filename;
      return s3Service.uploadObject(bucketName, key, buffer, data.mimetype);
    },
  });

  // Download object
  app.get("/:bucketName/objects/download", {
    schema: {
      params: BucketParamsSchema,
      querystring: ObjectKeyQuerySchema,
    },
    handler: async (request, reply) => {
      const { bucketName } = request.params as { bucketName: string };
      const { key } = request.query as { key: string };
      const result = await s3Service.downloadObject(bucketName, key);
      const filename = key.split("/").pop() ?? key;
      return reply
        .header("Content-Type", result.contentType)
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(result.body);
    },
  });

  // Delete object
  app.delete("/:bucketName/objects", {
    schema: {
      params: BucketParamsSchema,
      querystring: ObjectKeyQuerySchema,
      response: {
        200: DeleteResponseSchema,
      },
    },
    handler: async (request) => {
      const { bucketName } = request.params as { bucketName: string };
      const { key } = request.query as { key: string };
      return s3Service.deleteObject(bucketName, key);
    },
  });
}
