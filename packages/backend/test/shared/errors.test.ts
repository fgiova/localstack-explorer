import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError, registerErrorHandler } from "../../src/shared/errors.js";

// ---------------------------------------------------------------------------
describe("AppError", () => {
	it("sets message, statusCode, code, and name correctly", () => {
		const err = new AppError("Something went wrong", 422, "UNPROCESSABLE");

		expect(err.message).toBe("Something went wrong");
		expect(err.statusCode).toBe(422);
		expect(err.code).toBe("UNPROCESSABLE");
		expect(err.name).toBe("AppError");
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(AppError);
	});

	it("uses default statusCode of 500 when not provided", () => {
		const err = new AppError("oops");
		expect(err.statusCode).toBe(500);
	});

	it("uses default code of INTERNAL_ERROR when not provided", () => {
		const err = new AppError("oops");
		expect(err.code).toBe("INTERNAL_ERROR");
	});

	it("uses all defaults when only message is provided", () => {
		const err = new AppError("bare message");
		expect(err.message).toBe("bare message");
		expect(err.statusCode).toBe(500);
		expect(err.code).toBe("INTERNAL_ERROR");
		expect(err.name).toBe("AppError");
	});
});

// ---------------------------------------------------------------------------
describe("registerErrorHandler", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = Fastify({ logger: false });
		registerErrorHandler(app);
	});

	afterEach(async () => {
		await app.close();
	});

	it("responds with correct status and body for an AppError", async () => {
		app.get("/test", async () => {
			throw new AppError("Stack not found", 404, "STACK_NOT_FOUND");
		});
		await app.ready();

		const response = await app.inject({ method: "GET", url: "/test" });

		expect(response.statusCode).toBe(404);
		const body = response.json<{
			error: string;
			message: string;
			statusCode: number;
		}>();
		expect(body.error).toBe("STACK_NOT_FOUND");
		expect(body.message).toBe("Stack not found");
		expect(body.statusCode).toBe(404);
	});

	it("responds with 400 VALIDATION_ERROR for a Fastify validation error", async () => {
		// Register a route with a strict schema so Fastify generates a validation error
		app.post(
			"/validated",
			{
				schema: {
					body: {
						type: "object",
						required: ["name"],
						properties: { name: { type: "string", minLength: 1 } },
						additionalProperties: false,
					},
				},
			},
			async () => {
				return { ok: true };
			},
		);
		await app.ready();

		const response = await app.inject({
			method: "POST",
			url: "/validated",
			payload: {},
		});

		expect(response.statusCode).toBe(400);
		const body = response.json<{
			error: string;
			message: string;
			statusCode: number;
		}>();
		expect(body.error).toBe("VALIDATION_ERROR");
		expect(body.statusCode).toBe(400);
	});

	it("responds with 500 INTERNAL_ERROR for an unknown error", async () => {
		app.get("/boom", async () => {
			throw new Error("Unexpected failure");
		});
		await app.ready();

		const response = await app.inject({ method: "GET", url: "/boom" });

		expect(response.statusCode).toBe(500);
		const body = response.json<{
			error: string;
			message: string;
			statusCode: number;
		}>();
		expect(body.error).toBe("INTERNAL_ERROR");
		expect(body.message).toBe("An unexpected error occurred");
		expect(body.statusCode).toBe(500);
	});
});
