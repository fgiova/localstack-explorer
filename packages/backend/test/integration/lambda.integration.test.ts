import { deflateRawSync } from "node:zlib";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lambdaRoutes } from "../../src/plugins/lambda/routes.js";
import { buildApp, getLocalstackHeaders } from "./app-helper.js";

// ---------------------------------------------------------------------------
// Minimal base64-encoded zip containing a valid Node.js Lambda handler.
// We build the zip programmatically using raw deflate so we have no external
// dependency.  The zip contains a single file "index.js" with:
//   exports.handler = async () => ({ statusCode: 200, body: "hello" });
// ---------------------------------------------------------------------------
function buildMinimalZip(): string {
	const fileName = "index.js";
	const fileContent = Buffer.from(
		'exports.handler = async () => ({ statusCode: 200, body: "hello" });\n',
	);

	// Compress with raw deflate (no zlib header/trailer)
	const compressed = deflateRawSync(fileContent);

	// CRC-32 of the uncompressed content
	function crc32(buf: Buffer): number {
		const table = new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			let c = i;
			for (let j = 0; j < 8; j++) {
				c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			}
			table[i] = c;
		}
		let crc = 0xffffffff;
		for (const byte of buf) {
			crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
		}
		return (crc ^ 0xffffffff) >>> 0;
	}

	const nameBytes = Buffer.from(fileName, "utf8");
	const crc = crc32(fileContent);
	const uncompressedSize = fileContent.length;
	const compressedSize = compressed.length;

	// Local file header
	const localHeader = Buffer.alloc(30 + nameBytes.length);
	localHeader.writeUInt32LE(0x04034b50, 0); // signature
	localHeader.writeUInt16LE(20, 4); // version needed
	localHeader.writeUInt16LE(0, 6); // flags
	localHeader.writeUInt16LE(8, 8); // compression: deflate
	localHeader.writeUInt16LE(0, 10); // last mod time
	localHeader.writeUInt16LE(0, 12); // last mod date
	localHeader.writeUInt32LE(crc, 14); // crc-32
	localHeader.writeUInt32LE(compressedSize, 18); // compressed size
	localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
	localHeader.writeUInt16LE(nameBytes.length, 26); // file name length
	localHeader.writeUInt16LE(0, 28); // extra field length
	nameBytes.copy(localHeader, 30);

	const localOffset = 0;
	const localEntry = Buffer.concat([localHeader, compressed]);

	// Central directory header
	const centralHeader = Buffer.alloc(46 + nameBytes.length);
	centralHeader.writeUInt32LE(0x02014b50, 0); // signature
	centralHeader.writeUInt16LE(20, 4); // version made by
	centralHeader.writeUInt16LE(20, 6); // version needed
	centralHeader.writeUInt16LE(0, 8); // flags
	centralHeader.writeUInt16LE(8, 10); // compression: deflate
	centralHeader.writeUInt16LE(0, 12); // last mod time
	centralHeader.writeUInt16LE(0, 14); // last mod date
	centralHeader.writeUInt32LE(crc, 16); // crc-32
	centralHeader.writeUInt32LE(compressedSize, 20); // compressed size
	centralHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
	centralHeader.writeUInt16LE(nameBytes.length, 28); // file name length
	centralHeader.writeUInt16LE(0, 30); // extra field length
	centralHeader.writeUInt16LE(0, 32); // file comment length
	centralHeader.writeUInt16LE(0, 34); // disk number start
	centralHeader.writeUInt16LE(0, 36); // internal attributes
	centralHeader.writeUInt32LE(0, 38); // external attributes
	centralHeader.writeUInt32LE(localOffset, 42); // relative offset of local header
	nameBytes.copy(centralHeader, 46);

	const centralOffset = localEntry.length;
	const centralSize = centralHeader.length;

	// End of central directory
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0); // signature
	eocd.writeUInt16LE(0, 4); // disk number
	eocd.writeUInt16LE(0, 6); // disk with start of central directory
	eocd.writeUInt16LE(1, 8); // number of entries on this disk
	eocd.writeUInt16LE(1, 10); // total number of entries
	eocd.writeUInt32LE(centralSize, 12); // size of central directory
	eocd.writeUInt32LE(centralOffset, 16); // offset of central directory
	eocd.writeUInt16LE(0, 20); // comment length

	return Buffer.concat([localEntry, centralHeader, eocd]).toString("base64");
}

describe("Lambda Integration", () => {
	let app: FastifyInstance;
	const headers = getLocalstackHeaders();
	const functionName = `test-fn-${Date.now()}`;
	let zipBase64: string;

	beforeAll(async () => {
		zipBase64 = buildMinimalZip();

		app = await buildApp(async (a) => {
			await a.register(lambdaRoutes);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("should list functions (empty initially)", async () => {
		const res = await app.inject({ method: "GET", url: "/", headers });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveProperty("functions");
		expect(Array.isArray(body.functions)).toBe(true);
	});

	it("should create a function", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/",
			headers,
			payload: {
				functionName,
				runtime: "nodejs20.x",
				handler: "index.handler",
				role: "arn:aws:iam::000000000000:role/lambda-role",
				code: { zipFile: zipBase64 },
				description: "Integration test function",
				timeout: 10,
				memorySize: 128,
			},
		});
		expect(res.statusCode).toBe(201);
		expect(res.json().message).toContain("created");
	});

	it("should get function detail", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${functionName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.functionName).toBe(functionName);
		expect(body.handler).toBe("index.handler");
		expect(body.runtime).toBe("nodejs20.x");
		expect(body).toHaveProperty("functionArn");
	});

	it("should update function configuration (change description)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/${functionName}/config`,
			headers,
			payload: { description: "Updated description" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().message).toContain("updated");
	});

	it("should invoke function", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/${functionName}/invoke`,
			headers,
			payload: { invocationType: "RequestResponse" },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveProperty("statusCode");
		expect(body.statusCode).toBe(200);
	});

	it("should list function versions", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${functionName}/versions`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveProperty("versions");
		expect(Array.isArray(body.versions)).toBe(true);
		expect(body.versions.length).toBeGreaterThanOrEqual(1);
	});

	it("should list function aliases (empty)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${functionName}/aliases`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveProperty("aliases");
		expect(Array.isArray(body.aliases)).toBe(true);
	});

	it("should delete the function", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/${functionName}`,
			headers,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ success: true });
	});

	it("should return 404 after deletion", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/${functionName}`,
			headers,
		});
		expect(res.statusCode).toBe(404);
	});
});
