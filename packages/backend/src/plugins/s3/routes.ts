import type { FastifyInstance } from "fastify";
import { ErrorResponseSchema } from "../../shared/types.js";
import {
	BucketListResponseSchema,
	BucketParamsSchema,
	CreateBucketBodySchema,
	DeleteResponseSchema,
	ListObjectsQuerySchema,
	ListObjectsResponseSchema,
	MessageResponseSchema,
	ObjectKeyQuerySchema,
	ObjectPropertiesSchema,
	UploadResponseSchema,
} from "./schemas.js";
import { S3Service } from "./service.js";

export async function s3Routes(app: FastifyInstance) {
	// List buckets
	app.get("/", {
		schema: {
			response: {
				200: BucketListResponseSchema,
			},
		},
		handler: async (request) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			return service.listBuckets();
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { name } = request.body as { name: string };
			const result = await service.createBucket(name);
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			return service.deleteBucket(bucketName);
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			const { prefix, delimiter, continuationToken, maxKeys } =
				request.query as {
					prefix?: string;
					delimiter?: string;
					continuationToken?: string;
					maxKeys?: number;
				};
			return service.listObjects(
				bucketName,
				prefix,
				delimiter,
				continuationToken,
				maxKeys,
			);
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			const { key } = request.query as { key: string };
			return service.getObjectProperties(bucketName, key);
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			const data = await request.file();
			if (!data) {
				throw new (await import("../../shared/errors.js")).AppError(
					"No file provided",
					400,
					"NO_FILE",
				);
			}
			const buffer = await data.toBuffer();
			const key =
				(data.fields.key as { value: string } | undefined)?.value ??
				data.filename;
			return service.uploadObject(bucketName, key, buffer, data.mimetype);
		},
	});

	// Download object
	app.get("/:bucketName/objects/download", {
		schema: {
			params: BucketParamsSchema,
			querystring: ObjectKeyQuerySchema,
		},
		handler: async (request, reply) => {
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			const { key } = request.query as { key: string };
			const result = await service.downloadObject(bucketName, key);
			/* v8 ignore next */
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
			const clients = request.server.clientCache.getClients(
				request.localstackConfig.endpoint,
				request.localstackConfig.region,
			);
			const service = new S3Service(clients.s3);
			const { bucketName } = request.params as { bucketName: string };
			const { key } = request.query as { key: string };
			return service.deleteObject(bucketName, key);
		},
	});
}
