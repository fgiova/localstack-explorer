import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandler } from "../../src/shared/errors.js";
import { s3Routes } from "../../src/plugins/s3/routes.js";
import type { S3Service } from "../../src/plugins/s3/service.js";

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
    createBucket: vi.fn().mockResolvedValue({ message: "Bucket 'new-bucket' created successfully" }),
    deleteBucket: vi.fn().mockResolvedValue({ success: true }),
    listObjects: vi.fn().mockResolvedValue({
      objects: [
        { key: "file.txt", size: 1024, lastModified: "2024-01-01T00:00:00.000Z" },
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
    uploadObject: vi.fn().mockResolvedValue({ key: "file.txt", bucket: "test-bucket" }),
    downloadObject: vi.fn().mockResolvedValue({
      body: Buffer.from("file content"),
      contentType: "text/plain",
      contentLength: 12,
    }),
    deleteObject: vi.fn().mockResolvedValue({ success: true }),
    getPresignedUrl: vi.fn().mockResolvedValue("https://presigned-url"),
  };
}

describe("S3 Routes", () => {
  let app: FastifyInstance;
  let mockService: MockS3Service;

  beforeAll(async () => {
    app = Fastify();
    registerErrorHandler(app);
    mockService = createMockS3Service();
    await app.register(s3Routes, { s3Service: mockService as unknown as S3Service });
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
      const body = response.json<{ buckets: Array<{ name: string; creationDate?: string }> }>();
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
      expect(mockService.getObjectProperties).toHaveBeenCalledWith("test-bucket", "file.txt");
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
      expect(mockService.deleteObject).toHaveBeenCalledWith("test-bucket", "file.txt");
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
      expect(response.headers["content-disposition"]).toBe('attachment; filename="file.txt"');
      expect(response.body).toBe("file content");
      expect(mockService.downloadObject).toHaveBeenCalledWith("test-bucket", "folder/file.txt");
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
