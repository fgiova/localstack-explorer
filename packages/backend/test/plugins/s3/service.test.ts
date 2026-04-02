import type { S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { S3Service } from "../../../src/plugins/s3/service.js";
import { AppError } from "../../../src/shared/errors.js";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(),
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function createMockS3Client() {
	return {
		send: vi.fn(),
	} as unknown as S3Client;
}

describe("S3Service", () => {
	let client: S3Client;
	let service: S3Service;

	beforeEach(() => {
		client = createMockS3Client();
		service = new S3Service(client);
		vi.clearAllMocks();
	});

	describe("listBuckets", () => {
		it("returns formatted bucket list with name and creation date", async () => {
			const creationDate = new Date("2024-01-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Buckets: [
					{ Name: "bucket-one", CreationDate: creationDate },
					{ Name: "bucket-two", CreationDate: creationDate },
				],
			});

			const result = await service.listBuckets();

			expect(result).toEqual({
				buckets: [
					{ name: "bucket-one", creationDate: creationDate.toISOString() },
					{ name: "bucket-two", creationDate: creationDate.toISOString() },
				],
			});
		});

		it("returns empty bucket list when Buckets is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listBuckets();

			expect(result).toEqual({ buckets: [] });
		});

		it("returns empty bucket list when Buckets is empty array", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Buckets: [],
			});

			const result = await service.listBuckets();

			expect(result).toEqual({ buckets: [] });
		});

		it("uses empty string for bucket name when Name is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Buckets: [{ /* Name intentionally absent */ }],
			});

			const result = await service.listBuckets();
			expect(result.buckets[0].name).toBe("");
		});
	});

	describe("createBucket", () => {
		it("creates a bucket successfully and returns message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.createBucket("my-bucket");

			expect(result).toEqual({
				message: "Bucket 'my-bucket' created successfully",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError with 409 when BucketAlreadyOwnedByYou", async () => {
			const error = new Error("Bucket already owned by you") as Error & {
				name: string;
			};
			error.name = "BucketAlreadyOwnedByYou";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.createBucket("my-bucket")).rejects.toThrow(AppError);
			await expect(service.createBucket("my-bucket")).rejects.toMatchObject({
				statusCode: 409,
				code: "BUCKET_EXISTS",
				message: "Bucket 'my-bucket' already exists",
			});
		});

		it("throws AppError with 409 when BucketAlreadyExists", async () => {
			const error = new Error("Bucket already exists") as Error & {
				name: string;
			};
			error.name = "BucketAlreadyExists";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.createBucket("my-bucket")).rejects.toThrow(AppError);
			await expect(service.createBucket("my-bucket")).rejects.toMatchObject({
				statusCode: 409,
				code: "BUCKET_EXISTS",
				message: "Bucket 'my-bucket' already exists",
			});
		});

		it("re-throws unknown errors from createBucket", async () => {
			const error = new Error("Unknown error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.createBucket("my-bucket")).rejects.toThrow(
				"Unknown error",
			);
		});
	});

	describe("deleteBucket", () => {
		it("deletes a bucket successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteBucket("my-bucket");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError with 404 when NoSuchBucket", async () => {
			const error = new Error("No such bucket") as Error & { name: string };
			error.name = "NoSuchBucket";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.deleteBucket("missing-bucket")).rejects.toThrow(
				AppError,
			);
			await expect(service.deleteBucket("missing-bucket")).rejects.toMatchObject(
				{
					statusCode: 404,
					code: "BUCKET_NOT_FOUND",
					message: "Bucket 'missing-bucket' not found",
				},
			);
		});

		it("throws AppError with 409 when BucketNotEmpty", async () => {
			const error = new Error("Bucket is not empty") as Error & {
				name: string;
			};
			error.name = "BucketNotEmpty";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.deleteBucket("non-empty-bucket")).rejects.toThrow(
				AppError,
			);
			await expect(
				service.deleteBucket("non-empty-bucket"),
			).rejects.toMatchObject({
				statusCode: 409,
				code: "BUCKET_NOT_EMPTY",
				message: "Bucket 'non-empty-bucket' is not empty",
			});
		});

		it("re-throws unknown errors from deleteBucket", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.deleteBucket("my-bucket")).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	describe("listObjects", () => {
		it("returns formatted object list with common prefixes and pagination info", async () => {
			const lastModified = new Date("2024-06-01T12:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Contents: [
					{
						Key: "file.txt",
						Size: 1024,
						LastModified: lastModified,
						ETag: '"abc123"',
						StorageClass: "STANDARD",
					},
				],
				CommonPrefixes: [{ Prefix: "folder/" }],
				NextContinuationToken: "token-xyz",
				IsTruncated: true,
			});

			const result = await service.listObjects("my-bucket");

			expect(result).toEqual({
				objects: [
					{
						key: "file.txt",
						size: 1024,
						lastModified: lastModified.toISOString(),
						etag: '"abc123"',
						storageClass: "STANDARD",
					},
				],
				commonPrefixes: [{ prefix: "folder/" }],
				nextContinuationToken: "token-xyz",
				isTruncated: true,
			});
		});

		it("returns empty lists when Contents and CommonPrefixes are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listObjects("my-bucket");

			expect(result).toEqual({
				objects: [],
				commonPrefixes: [],
				nextContinuationToken: undefined,
				isTruncated: false,
			});
		});

		it("uses empty string for prefix when CommonPrefixes entry has no Prefix", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Contents: [],
				CommonPrefixes: [{ /* Prefix intentionally absent */ }],
				IsTruncated: false,
			});

			const result = await service.listObjects("my-bucket");
			expect(result.commonPrefixes[0].prefix).toBe("");
		});

		it("uses empty string for object key when Key is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Contents: [{ /* Key intentionally absent */ }],
				IsTruncated: false,
			});

			const result = await service.listObjects("my-bucket");
			expect(result.objects[0].key).toBe("");
		});

		it("throws AppError with 404 when NoSuchBucket", async () => {
			const error = new Error("No such bucket") as Error & { name: string };
			error.name = "NoSuchBucket";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.listObjects("missing-bucket")).rejects.toThrow(
				AppError,
			);
			await expect(service.listObjects("missing-bucket")).rejects.toMatchObject({
				statusCode: 404,
				code: "BUCKET_NOT_FOUND",
				message: "Bucket 'missing-bucket' not found",
			});
		});

		it("re-throws unknown errors from listObjects", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listObjects("my-bucket")).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	describe("getObjectProperties", () => {
		it("returns object properties from HeadObject response", async () => {
			const lastModified = new Date("2024-03-15T08:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ContentLength: 2048,
				LastModified: lastModified,
				ContentType: "text/plain",
				ETag: '"def456"',
			});

			const result = await service.getObjectProperties("my-bucket", "file.txt");

			expect(result).toEqual({
				key: "file.txt",
				size: 2048,
				lastModified: lastModified.toISOString(),
				contentType: "text/plain",
				etag: '"def456"',
			});
		});

		it("throws AppError with 404 when NotFound", async () => {
			const error = new Error("Not found") as Error & { name: string };
			error.name = "NotFound";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(
				service.getObjectProperties("my-bucket", "missing.txt"),
			).rejects.toThrow(AppError);
			await expect(
				service.getObjectProperties("my-bucket", "missing.txt"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "OBJECT_NOT_FOUND",
				message: "Object 'missing.txt' not found in bucket 'my-bucket'",
			});
		});

		it("throws AppError with 404 when NoSuchKey", async () => {
			const error = new Error("No such key") as Error & { name: string };
			error.name = "NoSuchKey";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(
				service.getObjectProperties("my-bucket", "missing.txt"),
			).rejects.toThrow(AppError);
			await expect(
				service.getObjectProperties("my-bucket", "missing.txt"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "OBJECT_NOT_FOUND",
				message: "Object 'missing.txt' not found in bucket 'my-bucket'",
			});
		});

		it("re-throws unknown errors from getObjectProperties", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.getObjectProperties("my-bucket", "file.txt"),
			).rejects.toThrow("Unexpected error");
		});

		it("uses default values when all HeadObject response fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				// All fields intentionally absent to trigger ?? fallbacks
			});

			const result = await service.getObjectProperties("my-bucket", "file.txt");
			expect(result.size).toBe(0);
			expect(result.lastModified).toBe("");
			expect(result.contentType).toBe("application/octet-stream");
			expect(result.etag).toBe("");
		});
	});

	describe("downloadObject", () => {
		it("downloads an object and returns body, contentType, and contentLength", async () => {
			const mockBody = Buffer.from("file contents");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Body: mockBody,
				ContentType: "text/plain",
				ContentLength: 13,
			});

			const result = await service.downloadObject("my-bucket", "file.txt");

			expect(result).toEqual({
				body: mockBody,
				contentType: "text/plain",
				contentLength: 13,
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError with 404 when NoSuchKey", async () => {
			const error = new Error("No such key") as Error & { name: string };
			error.name = "NoSuchKey";
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(
				service.downloadObject("my-bucket", "missing.txt"),
			).rejects.toThrow(AppError);
			await expect(
				service.downloadObject("my-bucket", "missing.txt"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "OBJECT_NOT_FOUND",
				message: "Object 'missing.txt' not found in bucket 'my-bucket'",
			});
		});

		it("re-throws unknown errors from downloadObject", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.downloadObject("my-bucket", "file.txt"),
			).rejects.toThrow("Unexpected error");
		});

		it("uses application/octet-stream when ContentType is undefined in response", async () => {
			const mockBody = Buffer.from("binary content");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Body: mockBody,
				// ContentType intentionally absent to trigger ?? fallback
				ContentLength: 14,
			});

			const result = await service.downloadObject("my-bucket", "file.bin");
			expect(result.contentType).toBe("application/octet-stream");
		});
	});

	describe("uploadObject", () => {
		it("uploads an object and returns key and bucket", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const body = Buffer.from("hello world");
			const result = await service.uploadObject(
				"my-bucket",
				"uploads/file.txt",
				body,
				"text/plain",
			);

			expect(result).toEqual({ key: "uploads/file.txt", bucket: "my-bucket" });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("uses application/octet-stream as default content type", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const body = Buffer.from("binary data");
			await service.uploadObject("my-bucket", "data.bin", body);

			const putCall = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(putCall.input).toMatchObject({
				Bucket: "my-bucket",
				Key: "data.bin",
				ContentType: "application/octet-stream",
			});
		});
	});

	describe("deleteObject", () => {
		it("deletes an object and returns success", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteObject("my-bucket", "file.txt");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("sends DeleteObjectCommand with correct bucket and key", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			await service.deleteObject("my-bucket", "folder/file.txt");

			const deleteCall = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			expect(deleteCall.input).toMatchObject({
				Bucket: "my-bucket",
				Key: "folder/file.txt",
			});
		});
	});

	describe("getPresignedUrl", () => {
		it("returns a presigned URL for the given bucket and key", async () => {
			(getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				"https://s3.amazonaws.com/my-bucket/file.txt?X-Amz-Signature=abc",
			);

			const result = await service.getPresignedUrl("my-bucket", "file.txt");

			expect(result).toBe(
				"https://s3.amazonaws.com/my-bucket/file.txt?X-Amz-Signature=abc",
			);
			expect(getSignedUrl).toHaveBeenCalledOnce();
			expect(getSignedUrl).toHaveBeenCalledWith(
				client,
				expect.objectContaining({ input: { Bucket: "my-bucket", Key: "file.txt" } }),
				{ expiresIn: 3600 },
			);
		});

		it("uses the default expiresIn of 3600 seconds", async () => {
			(getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				"https://presigned-url.example.com",
			);

			await service.getPresignedUrl("my-bucket", "file.txt");

			expect(getSignedUrl).toHaveBeenCalledWith(
				client,
				expect.anything(),
				{ expiresIn: 3600 },
			);
		});

		it("passes custom expiresIn to getSignedUrl", async () => {
			(getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				"https://presigned-url.example.com",
			);

			await service.getPresignedUrl("my-bucket", "file.txt", 7200);

			expect(getSignedUrl).toHaveBeenCalledWith(
				client,
				expect.anything(),
				{ expiresIn: 7200 },
			);
		});
	});
});
