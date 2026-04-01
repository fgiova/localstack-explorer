import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkLocalstackHealth } from "../src/health.js";

const ENDPOINT = "http://localhost:4566";
const REGION = "us-east-1";

describe("checkLocalstackHealth", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns connected: true when fetch resolves with an ok response", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
		});

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: true,
			endpoint: ENDPOINT,
			region: REGION,
		});
		expect(fetch).toHaveBeenCalledWith(
			`${ENDPOINT}/_localstack/health`,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it("returns connected: false with HTTP error when fetch resolves with a non-ok response (500)", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
		});

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: false,
			endpoint: ENDPOINT,
			region: REGION,
			error: "HTTP 500",
		});
	});

	it("returns connected: false with HTTP error when fetch resolves with a 404 response", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 404,
		});

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: false,
			endpoint: ENDPOINT,
			region: REGION,
			error: "HTTP 404",
		});
	});

	it("returns connected: false with error message when fetch rejects with a network error", async () => {
		const networkError = new Error("Failed to fetch");
		(fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: false,
			endpoint: ENDPOINT,
			region: REGION,
			error: "Failed to fetch",
		});
	});

	it("returns connected: false with error message when fetch rejects with a non-Error value", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce("string error");

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: false,
			endpoint: ENDPOINT,
			region: REGION,
			error: "Unknown error",
		});
	});

	it("returns connected: false with abort message when fetch is aborted (timeout)", async () => {
		const abortError = new DOMException(
			"The operation was aborted.",
			"AbortError",
		);
		(fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

		const result = await checkLocalstackHealth(ENDPOINT, REGION);

		expect(result).toEqual({
			connected: false,
			endpoint: ENDPOINT,
			region: REGION,
			error: "The operation was aborted.",
		});
	});

	it("includes the correct endpoint and region in all responses", async () => {
		const customEndpoint = "http://my-localstack:4567";
		const customRegion = "eu-west-1";

		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
		});

		const result = await checkLocalstackHealth(customEndpoint, customRegion);

		expect(result.endpoint).toBe(customEndpoint);
		expect(result.region).toBe(customRegion);
	});
});
