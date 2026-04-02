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
import type { ClientCache } from "../../../src/aws/client-cache.js";
import { lambdaRoutes } from "../../../src/plugins/lambda/routes.js";
import { registerErrorHandler } from "../../../src/shared/errors.js";

interface MockLambdaService {
	listFunctions: Mock;
	createFunction: Mock;
	getFunction: Mock;
	updateFunctionCode: Mock;
	updateFunctionConfig: Mock;
	deleteFunction: Mock;
	invokeFunction: Mock;
	listVersions: Mock;
	listAliases: Mock;
	getFunctionTriggers: Mock;
	createEventSourceMapping: Mock;
	deleteEventSourceMapping: Mock;
}

function createMockLambdaService(): MockLambdaService {
	return {
		listFunctions: vi
			.fn()
			.mockResolvedValue({ functions: [], nextMarker: undefined }),
		createFunction: vi.fn().mockResolvedValue({
			message: "Function 'my-function' created successfully",
		}),
		getFunction: vi.fn().mockResolvedValue({
			functionName: "my-function",
			functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function",
			runtime: "nodejs18.x",
			handler: "index.handler",
			role: "arn:aws:iam::000000000000:role/lambda-role",
			codeSize: 1024,
			description: "A test function",
			timeout: 30,
			memorySize: 128,
			lastModified: "2024-01-01T00:00:00.000Z",
			codeSha256: "abc123",
			version: "$LATEST",
			state: "Active",
			stateReason: undefined,
			environment: { MY_VAR: "value" },
			architectures: ["x86_64"],
			layers: [],
			packageType: "Zip",
		}),
		updateFunctionCode: vi.fn().mockResolvedValue({
			message: "Function 'my-function' code updated successfully",
		}),
		updateFunctionConfig: vi.fn().mockResolvedValue({
			message: "Function 'my-function' configuration updated successfully",
		}),
		deleteFunction: vi.fn().mockResolvedValue({ success: true }),
		invokeFunction: vi.fn().mockResolvedValue({
			statusCode: 200,
			payload: '{"result":"ok"}',
			functionError: undefined,
			logResult: undefined,
		}),
		listVersions: vi
			.fn()
			.mockResolvedValue({ versions: [], nextMarker: undefined }),
		listAliases: vi
			.fn()
			.mockResolvedValue({ aliases: [], nextMarker: undefined }),
		getFunctionTriggers: vi.fn().mockResolvedValue({
			eventSourceMappings: [],
			policyTriggers: [],
			nextMarker: undefined,
		}),
		createEventSourceMapping: vi.fn().mockResolvedValue({
			message: "Event source mapping created successfully",
			uuid: "new-uuid",
		}),
		deleteEventSourceMapping: vi.fn().mockResolvedValue({ success: true }),
	};
}

vi.mock("../../../src/plugins/lambda/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../../src/plugins/lambda/service.js")
		>();
	return {
		...actual,
		LambdaService: vi.fn(),
	};
});

import { LambdaService as LambdaServiceClass } from "../../../src/plugins/lambda/service.js";

describe("Lambda Routes", () => {
	let app: FastifyInstance;
	let mockService: MockLambdaService;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockLambdaService();

		(LambdaServiceClass as unknown as Mock).mockImplementation(
			() => mockService,
		);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({ lambda: {} }),
		};
		app.decorate("clientCache", mockClientCache as unknown as ClientCache);

		app.decorateRequest("localstackConfig", null);
		app.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		await app.register(lambdaRoutes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	// ── List Functions ───────────────────────────────────────────────────────

	describe("GET /", () => {
		it("should return list of functions", async () => {
			const response = await app.inject({ method: "GET", url: "/" });
			expect(response.statusCode).toBe(200);
			const body = response.json<{ functions: unknown[] }>();
			expect(body.functions).toEqual([]);
			expect(mockService.listFunctions).toHaveBeenCalled();
		});

		it("should pass marker query param when provided", async () => {
			mockService.listFunctions.mockClear();
			const response = await app.inject({
				method: "GET",
				url: "/?marker=next-page-token",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listFunctions).toHaveBeenCalledWith("next-page-token");
		});

		it("should call listFunctions without marker when not provided", async () => {
			mockService.listFunctions.mockClear();
			await app.inject({ method: "GET", url: "/" });
			expect(mockService.listFunctions).toHaveBeenCalledWith(undefined);
		});
	});

	// ── Create Function ──────────────────────────────────────────────────────

	describe("POST /", () => {
		it("should create a function and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: {
					functionName: "my-function",
					runtime: "nodejs18.x",
					handler: "index.handler",
					role: "arn:aws:iam::000000000000:role/lambda-role",
					code: { zipFile: "UEsDBBQ=" },
				},
			});
			expect(response.statusCode).toBe(201);
			const body = response.json<{ message: string }>();
			expect(body.message).toBe("Function 'my-function' created successfully");
			expect(mockService.createFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					functionName: "my-function",
					runtime: "nodejs18.x",
					handler: "index.handler",
					role: "arn:aws:iam::000000000000:role/lambda-role",
					code: { zipFile: "UEsDBBQ=" },
				}),
			);
		});

		it("should create a function with optional fields", async () => {
			mockService.createFunction.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: {
					functionName: "my-function",
					runtime: "python3.11",
					handler: "lambda_function.lambda_handler",
					role: "arn:aws:iam::000000000000:role/lambda-role",
					code: { s3Bucket: "my-bucket", s3Key: "my-function.zip" },
					description: "A test function",
					timeout: 60,
					memorySize: 256,
					environment: { MY_VAR: "value" },
					architectures: ["arm64"],
				},
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					description: "A test function",
					timeout: 60,
					memorySize: 256,
					environment: { MY_VAR: "value" },
					architectures: ["arm64"],
				}),
			);
		});

		it("should return 400 when required fields are missing", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/",
				payload: { functionName: "my-function" },
			});
			expect(response.statusCode).toBe(400);
		});
	});

	// ── Get Function ─────────────────────────────────────────────────────────

	describe("GET /:functionName", () => {
		it("should return function detail", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/my-function",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ functionName: string }>();
			expect(body.functionName).toBe("my-function");
			expect(mockService.getFunction).toHaveBeenCalledWith("my-function");
		});

		it("should return 404 when function does not exist", async () => {
			const { AppError } = await import("../../../src/shared/errors.js");
			mockService.getFunction.mockRejectedValueOnce(
				new AppError(
					"Function 'missing-fn' not found",
					404,
					"FUNCTION_NOT_FOUND",
				),
			);
			const response = await app.inject({
				method: "GET",
				url: "/missing-fn",
			});
			expect(response.statusCode).toBe(404);
		});
	});

	// ── Update Function Code ─────────────────────────────────────────────────

	describe("PUT /:functionName/code", () => {
		it("should update function code with zipFile", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/code",
				payload: { zipFile: "UEsDBBQ=" },
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ message: string }>();
			expect(body.message).toBe(
				"Function 'my-function' code updated successfully",
			);
			expect(mockService.updateFunctionCode).toHaveBeenCalledWith(
				"my-function",
				{ zipFile: "UEsDBBQ=" },
			);
		});

		it("should update function code with S3 reference", async () => {
			mockService.updateFunctionCode.mockClear();
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/code",
				payload: { s3Bucket: "my-bucket", s3Key: "my-function.zip" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.updateFunctionCode).toHaveBeenCalledWith(
				"my-function",
				{ s3Bucket: "my-bucket", s3Key: "my-function.zip" },
			);
		});

		it("should update function code with empty body (all fields optional)", async () => {
			mockService.updateFunctionCode.mockClear();
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/code",
				payload: {},
			});
			expect(response.statusCode).toBe(200);
		});
	});

	// ── Update Function Config ───────────────────────────────────────────────

	describe("PUT /:functionName/config", () => {
		it("should update function configuration", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/config",
				payload: {
					handler: "index.newHandler",
					runtime: "nodejs20.x",
					timeout: 60,
					memorySize: 256,
					environment: { NEW_VAR: "new-value" },
					role: "arn:aws:iam::000000000000:role/new-role",
				},
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ message: string }>();
			expect(body.message).toBe(
				"Function 'my-function' configuration updated successfully",
			);
			expect(mockService.updateFunctionConfig).toHaveBeenCalledWith(
				"my-function",
				expect.objectContaining({
					handler: "index.newHandler",
					runtime: "nodejs20.x",
					timeout: 60,
					memorySize: 256,
					environment: { NEW_VAR: "new-value" },
					role: "arn:aws:iam::000000000000:role/new-role",
				}),
			);
		});

		it("should update function configuration with partial fields", async () => {
			mockService.updateFunctionConfig.mockClear();
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/config",
				payload: { description: "Updated description" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.updateFunctionConfig).toHaveBeenCalledWith(
				"my-function",
				{ description: "Updated description" },
			);
		});

		it("should update function configuration with empty body (all fields optional)", async () => {
			mockService.updateFunctionConfig.mockClear();
			const response = await app.inject({
				method: "PUT",
				url: "/my-function/config",
				payload: {},
			});
			expect(response.statusCode).toBe(200);
		});
	});

	// ── Delete Function ──────────────────────────────────────────────────────

	describe("DELETE /:functionName", () => {
		it("should delete a function", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/my-function",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
			expect(mockService.deleteFunction).toHaveBeenCalledWith("my-function");
		});
	});

	// ── Invoke Function ──────────────────────────────────────────────────────

	describe("POST /:functionName/invoke", () => {
		it("should invoke a function with no payload", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/my-function/invoke",
				payload: {},
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ statusCode: number; payload?: string }>();
			expect(body.statusCode).toBe(200);
			expect(mockService.invokeFunction).toHaveBeenCalledWith(
				"my-function",
				undefined,
				undefined,
			);
		});

		it("should invoke a function with a payload", async () => {
			mockService.invokeFunction.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/my-function/invoke",
				payload: { payload: '{"key":"value"}' },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.invokeFunction).toHaveBeenCalledWith(
				"my-function",
				'{"key":"value"}',
				undefined,
			);
		});

		it("should invoke a function with an invocationType", async () => {
			mockService.invokeFunction.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/my-function/invoke",
				payload: { invocationType: "Event" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.invokeFunction).toHaveBeenCalledWith(
				"my-function",
				undefined,
				"Event",
			);
		});

		it("should invoke a function with payload and invocationType", async () => {
			mockService.invokeFunction.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/my-function/invoke",
				payload: {
					payload: '{"key":"value"}',
					invocationType: "RequestResponse",
				},
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.invokeFunction).toHaveBeenCalledWith(
				"my-function",
				'{"key":"value"}',
				"RequestResponse",
			);
		});

		it("should return 400 for an invalid invocationType", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/my-function/invoke",
				payload: { invocationType: "InvalidType" },
			});
			expect(response.statusCode).toBe(400);
		});
	});

	// ── List Versions ────────────────────────────────────────────────────────

	describe("GET /:functionName/versions", () => {
		it("should return list of function versions", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/my-function/versions",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ versions: unknown[] }>();
			expect(body.versions).toEqual([]);
			expect(mockService.listVersions).toHaveBeenCalledWith(
				"my-function",
				undefined,
			);
		});

		it("should pass marker query param when provided", async () => {
			mockService.listVersions.mockClear();
			const response = await app.inject({
				method: "GET",
				url: "/my-function/versions?marker=next-page-token",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listVersions).toHaveBeenCalledWith(
				"my-function",
				"next-page-token",
			);
		});
	});

	// ── List Aliases ─────────────────────────────────────────────────────────

	describe("GET /:functionName/aliases", () => {
		it("should return list of function aliases", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/my-function/aliases",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ aliases: unknown[] }>();
			expect(body.aliases).toEqual([]);
			expect(mockService.listAliases).toHaveBeenCalledWith(
				"my-function",
				undefined,
			);
		});

		it("should pass marker query param when provided", async () => {
			mockService.listAliases.mockClear();
			const response = await app.inject({
				method: "GET",
				url: "/my-function/aliases?marker=next-page-token",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listAliases).toHaveBeenCalledWith(
				"my-function",
				"next-page-token",
			);
		});
	});

	// ── Get Function Triggers ────────────────────────────────────────────────

	describe("GET /:functionName/triggers", () => {
		it("should return combined triggers (event source mappings + policy triggers)", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/my-function/triggers",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{
				eventSourceMappings: unknown[];
				policyTriggers: unknown[];
				nextMarker: string | undefined;
			}>();
			expect(body.eventSourceMappings).toEqual([]);
			expect(body.policyTriggers).toEqual([]);
			expect(mockService.getFunctionTriggers).toHaveBeenCalledWith(
				"my-function",
				undefined,
			);
		});

		it("should pass marker query param", async () => {
			mockService.getFunctionTriggers.mockClear();
			const response = await app.inject({
				method: "GET",
				url: "/my-function/triggers?marker=next-page-token",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getFunctionTriggers).toHaveBeenCalledWith(
				"my-function",
				"next-page-token",
			);
		});
	});

	// ── Create Event Source Mapping ──────────────────────────────────────────

	describe("POST /:functionName/event-source-mappings", () => {
		it("should create event source mapping and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/my-function/event-source-mappings",
				payload: {
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
				},
			});
			expect(response.statusCode).toBe(201);
			const body = response.json<{ message: string; uuid: string }>();
			expect(body.message).toBe("Event source mapping created successfully");
			expect(body.uuid).toBe("new-uuid");
			expect(mockService.createEventSourceMapping).toHaveBeenCalledWith(
				"my-function",
				expect.objectContaining({
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
				}),
			);
		});

		it("should forward optional params (batchSize, startingPosition, enabled)", async () => {
			mockService.createEventSourceMapping.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/my-function/event-source-mappings",
				payload: {
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
					batchSize: 10,
					startingPosition: "TRIM_HORIZON",
					enabled: false,
				},
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createEventSourceMapping).toHaveBeenCalledWith(
				"my-function",
				expect.objectContaining({
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
					batchSize: 10,
					startingPosition: "TRIM_HORIZON",
					enabled: false,
				}),
			);
		});

		it("should return 400 when eventSourceArn is missing", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/my-function/event-source-mappings",
				payload: { batchSize: 10 },
			});
			expect(response.statusCode).toBe(400);
		});
	});

	// ── Delete Event Source Mapping ──────────────────────────────────────────

	describe("DELETE /event-source-mappings/:uuid", () => {
		it("should delete event source mapping", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/event-source-mappings/test-uuid-1234",
			});
			expect(response.statusCode).toBe(200);
			const body = response.json<{ success: boolean }>();
			expect(body.success).toBe(true);
		});

		it("should call deleteEventSourceMapping with the uuid param", async () => {
			mockService.deleteEventSourceMapping.mockClear();
			await app.inject({
				method: "DELETE",
				url: "/event-source-mappings/test-uuid-1234",
			});
			expect(mockService.deleteEventSourceMapping).toHaveBeenCalledWith(
				"test-uuid-1234",
			);
		});
	});
});
