import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { ClientCache } from "../../src/aws/client-cache.js";
import { s3Routes } from "../../src/plugins/s3/routes.js";
import { registerErrorHandler } from "../../src/shared/errors.js";

interface MockS3Service {
	listBuckets: Mock;
	createBucket: Mock;
	deleteBucket: Mock;
	listObjects: Mock;
	getObjectProperties: Mock;
	uploadObject: Mock;
	downloadObject: Mock;
	deleteObject: Mock;
	getPresignedUrl: Mock;
}

function createMockS3Service(): MockS3Service {
	return {
		listBuckets: vi.fn().mockResolvedValue({
			buckets: [
				{ name: "test-bucket", creationDate: "2024-01-01T00:00:00.000Z" },
				{ name: "another-bucket", creationDate: "2024-02-01T00:00:00.000Z" },
			],
		}),
		createBucket: vi.fn().mockResolvedValue({
			message: "Bucket 'new-bucket' created successfully",
		}),
		deleteBucket: vi.fn().mockResolvedValue({ success: true }),
		listObjects: vi.fn().mockResolvedValue({
			objects: [
				{
					key: "file.txt",
					size: 1024,
					lastModified: "2024-01-01T00:00:00.000Z",
				},
			],
			commonPrefixes: [{ prefix: "folder/" }],
			nextContinuationToken: undefined,
			isTruncated: false,
		}),
		getObjectProperties: vi.fn().mockResolvedValue({
			key: "file.txt",
			size: 1024,
			lastModified: "2024-01-01T00:00:00.000Z",
			contentType: "text/plain",
			etag: '"abc123"',
		}),
		uploadObject: vi
			.fn()
			.mockResolvedValue({ key: "file.txt", bucket: "test-bucket" }),
		downloadObject: vi.fn().mockResolvedValue({
			body: Buffer.from("file content"),
			contentType: "text/plain",
			contentLength: 12,
		}),
		deleteObject: vi.fn().mockResolvedValue({ success: true }),
		getPresignedUrl: vi.fn().mockResolvedValue("https://presigned-url"),
	};
}

// Mock S3Service constructor to return our mock
vi.mock("../../src/plugins/s3/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../src/plugins/s3/service.js")>();
	return {
		...actual,
		S3Service: vi.fn(),
	};
});

import { S3Service as S3ServiceClass } from "../../src/plugins/s3/service.js";

describe("S3 Routes", () => {
	let app: FastifyInstance;
	let mockService: MockS3Service;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockS3Service();

		// Mock the S3Service constructor to return our mock service
		(S3ServiceClass as unknown as Mock).mockImplementation(() => mockService);

		// Decorate with clientCache mock
		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({
				s3: {}, // The actual S3Client is not used since S3Service is mocked
			}),
		};
		app.decorate("clientCache", mockClientCache as unknown as ClientCache);

		// Decorate request with localstackConfig
		app.decorateRequest("localstackConfig", null);
		app.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		await app.register(s3Routes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("GET / (listBuckets)", () => {
		it("should return list of buckets", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				buckets: Array<{ name: string; creationDate?: string }>;
			}>();
			expect(body.buckets).toHaveLength(2);
			expect(body.buckets[0].name).toBe("test-bucket");
			expect(body.buckets[1].name).toBe("another-bucket");
			expect(mockService.listBuckets).toHaveBeenCalled();
		});
	});

	describe("POST / (createBucket)", () => {
		it("should create a bucket with valid name", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: { name: "new-bucket" },
			});
			expect(response.statusCode).toBe(201);
			const body = response.json<{ message: string }>();
			expect(body.message).toContain("created");
			expect(mockService.createBucket).toHaveBeenCalledWith("new-bucket");
		});

		it("should return 400 for bucket name too short (minLength is 3)", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: { name: "ab" },
			});
			expect(response.statusCode).toBe(400);
		});

		it("should return 400 for missing name in body", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: {},
			});
			expect(response.statusCode).toBe(400);
		});

		it("should return 400 for empty body", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
			});
			expect(response.statusCode).toBe(400);
		});
	});

	describe("DELETE /:bucketName (deleteBucket)", () => {
		it("should delete a bucket", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-bucket",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
			expect(mockService.deleteBucket).toHaveBeenCalledWith("test-bucket");
		});
	});

	describe("GET /:bucketName/objects (listObjects)", () => {
		it("should return objects and common prefixes", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-bucket/objects",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				objects: Array<{ key: string; size?: number }>;
				commonPrefixes: Array<{ prefix: string }>;
				isTruncated: boolean;
			}>();
			expect(body.objects).toHaveLength(1);
			expect(body.objects[0].key).toBe("file.txt");
			expect(body.commonPrefixes).toHaveLength(1);
			expect(body.commonPrefixes[0].prefix).toBe("folder/");
			expect(body.isTruncated).toBe(false);
		});

		it("should pass query parameters to service", async () => {
			mockService.listObjects.mockClear();
			await app.inject({
				method: "GET",
				url: "/test-bucket/objects?prefix=folder/&delimiter=/&maxKeys=50",
			});
			expect(mockService.listObjects).toHaveBeenCalledWith(
				"test-bucket",
				"folder/",
				"/",
				undefined,
				50,
			);
		});

		it("should pass continuationToken to service", async () => {
			mockService.listObjects.mockClear();
			await app.inject({
				method: "GET",
				url: "/test-bucket/objects?continuationToken=abc123",
			});
			expect(mockService.listObjects).toHaveBeenCalledWith(
				"test-bucket",
				undefined,
				undefined,
				"abc123",
				undefined,
			);
		});
	});

	describe("GET /:bucketName/objects/properties (getObjectProperties)", () => {
		it("should return object properties", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-bucket/objects/properties?key=file.txt",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				key: string;
				size: number;
				contentType: string;
				etag: string;
			}>();
			expect(body.key).toBe("file.txt");
			expect(body.size).toBe(1024);
			expect(body.contentType).toBe("text/plain");
			expect(mockService.getObjectProperties).toHaveBeenCalledWith(
				"test-bucket",
				"file.txt",
			);
		});

		it("should return 400 when key query param is missing", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-bucket/objects/properties",
			});
			expect(response.statusCode).toBe(400);
		});
	});

	describe("DELETE /:bucketName/objects (deleteObject)", () => {
		it("should delete an object", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-bucket/objects?key=file.txt",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
			expect(mockService.deleteObject).toHaveBeenCalledWith(
				"test-bucket",
				"file.txt",
			);
		});

		it("should return 400 when key query param is missing", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/test-bucket/objects",
			});
			expect(response.statusCode).toBe(400);
		});
	});

	describe("GET /:bucketName/objects/download (downloadObject)", () => {
		it("should return file content with correct headers", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-bucket/objects/download?key=folder/file.txt",
			});
			expect(response.statusCode).toBe(200);
			expect(response.headers["content-type"]).toBe("text/plain");
			expect(response.headers["content-disposition"]).toBe(
				'attachment; filename="file.txt"',
			);
			expect(response.body).toBe("file content");
			expect(mockService.downloadObject).toHaveBeenCalledWith(
				"test-bucket",
				"folder/file.txt",
			);
		});

		it("should return 400 when key query param is missing", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/test-bucket/objects/download",
			});
			expect(response.statusCode).toBe(400);
		});
	});
});

describe("S3 Routes - Upload (multipart)", () => {
	let uploadApp: FastifyInstance;
	let mockService: MockS3Service;

	beforeAll(async () => {
		uploadApp = Fastify();
		registerErrorHandler(uploadApp);

		mockService = createMockS3Service();

		(S3ServiceClass as unknown as Mock).mockImplementation(() => mockService);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({ s3: {} }),
		};
		uploadApp.decorate(
			"clientCache",
			mockClientCache as unknown as ClientCache,
		);

		uploadApp.decorateRequest("localstackConfig", null);
		uploadApp.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		// Register multipart support so request.file() is available
		await uploadApp.register(multipart);
		await uploadApp.register(s3Routes);
		await uploadApp.ready();
	});

	afterAll(async () => {
		await uploadApp.close();
	});

	describe("POST /:bucketName/objects/upload (uploadObject)", () => {
		it("should upload a file and return key and bucket (key from field)", async () => {
			mockService.uploadObject.mockClear();
			mockService.uploadObject.mockResolvedValueOnce({
				key: "my-key.txt",
				bucket: "test-bucket",
			});

			// Build a multipart body with a key field and a file part
			const boundary = "----TestBoundary123";
			const fileContent = "hello world";
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="key"',
				"",
				"my-key.txt",
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="upload.txt"',
				"Content-Type: text/plain",
				"",
				fileContent,
				`--${boundary}--`,
				"",
			].join("\r\n");

			const response = await uploadApp.inject({
				method: "POST",
				url: "/test-bucket/objects/upload",
				payload: body,
				headers: {
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
			});

			expect(response.statusCode).toBe(200);
			const respBody = response.json<{ key: string; bucket: string }>();
			expect(respBody.key).toBe("my-key.txt");
			expect(respBody.bucket).toBe("test-bucket");
			expect(mockService.uploadObject).toHaveBeenCalledWith(
				"test-bucket",
				"my-key.txt",
				expect.any(Buffer),
				"text/plain",
			);
		});

		it("should use filename when no key field is provided", async () => {
			mockService.uploadObject.mockClear();
			mockService.uploadObject.mockResolvedValueOnce({
				key: "upload.txt",
				bucket: "test-bucket",
			});

			const boundary = "----TestBoundary456";
			const fileContent = "file without key field";
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="upload.txt"',
				"Content-Type: text/plain",
				"",
				fileContent,
				`--${boundary}--`,
				"",
			].join("\r\n");

			const response = await uploadApp.inject({
				method: "POST",
				url: "/test-bucket/objects/upload",
				payload: body,
				headers: {
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockService.uploadObject).toHaveBeenCalledWith(
				"test-bucket",
				"upload.txt",
				expect.any(Buffer),
				"text/plain",
			);
		});

		it("should throw AppError 400 when no file is provided", async () => {
			// Send a non-multipart request so request.file() returns undefined
			const boundary = "----TestBoundaryEmpty";
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="otherField"',
				"",
				"some value",
				`--${boundary}--`,
				"",
			].join("\r\n");

			const response = await uploadApp.inject({
				method: "POST",
				url: "/test-bucket/objects/upload",
				payload: body,
				headers: {
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
			});

			// When no file part is present, request.file() returns undefined
			// and the handler should return 400
			expect(response.statusCode).toBe(400);
		});
	});
});
