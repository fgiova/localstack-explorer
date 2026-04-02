import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import s3Plugin from "../../src/plugins/s3/index.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

describe("S3 Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const bucketName = `test-bucket-${Date.now()}`;

	beforeAll(async () => {
		app = await buildApp(async (a) => {
			await a.register(s3Plugin);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list buckets (initially may be empty)", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("buckets");
	});

	it("should create a bucket", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: { name: bucketName },
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should list the created bucket", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		const body = res.json();
		expect(
			body.buckets.some((b: { name: string }) => b.name === bucketName),
		).toBe(true);
	});

	it("should upload an object", async () => {
		const _boundary = "----FormBoundary";
		const payload =
			`------FormBoundary\r\n` +
			`Content-Disposition: form-data; name="key"\r\n\r\n` +
			`hello.txt\r\n` +
			`------FormBoundary\r\n` +
			`Content-Disposition: form-data; name="file"; filename="hello.txt"\r\n` +
			`Content-Type: text/plain\r\n\r\n` +
			`Hello LocalStack!\r\n` +
			`------FormBoundary--\r\n`;

		const res = await app.inject({
			method: "POST",
			url: `/${bucketName}/objects/upload`,
			headers: {
				...headers,
				"content-type": `multipart/form-data; boundary=----FormBoundary`,
			},
			payload,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ key: "hello.txt", bucket: bucketName });
	});

	it("should list objects in bucket", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${bucketName}/objects`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(
			body.objects.some((o: { key: string }) => o.key === "hello.txt"),
		).toBe(true);
	});

	it("should get object properties", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${bucketName}/objects/properties?key=hello.txt`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.key).toBe("hello.txt");
		expect(body.contentType).toBe("text/plain");
		expect(body.size).toBeGreaterThan(0);
	});

	it("should download an object", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${bucketName}/objects/download?key=hello.txt`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.body).toContain("Hello LocalStack!");
	});

	it("should delete an object", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${bucketName}/objects?key=hello.txt`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should delete the bucket", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${bucketName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});
});
