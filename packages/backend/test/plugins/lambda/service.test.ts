import type { LambdaClient } from "@aws-sdk/client-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LambdaService } from "../../../src/plugins/lambda/service.js";
import { AppError } from "../../../src/shared/errors.js";

function createMockLambdaClient() {
	return {
		send: vi.fn(),
	} as unknown as LambdaClient;
}

describe("LambdaService", () => {
	let client: LambdaClient;
	let service: LambdaService;

	beforeEach(() => {
		client = createMockLambdaClient();
		service = new LambdaService(client);
	});

	describe("listFunctions", () => {
		it("returns formatted function list", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Functions: [
					{
						FunctionName: "my-function",
						FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function",
						Runtime: "nodejs20.x",
						Handler: "index.handler",
						CodeSize: 1024,
						LastModified: "2024-01-01T00:00:00.000+0000",
						MemorySize: 128,
						Timeout: 30,
						State: "Active",
					},
				],
				NextMarker: undefined,
			});

			const result = await service.listFunctions();

			expect(result).toEqual({
				functions: [
					{
						functionName: "my-function",
						functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function",
						runtime: "nodejs20.x",
						handler: "index.handler",
						codeSize: 1024,
						lastModified: "2024-01-01T00:00:00.000+0000",
						memorySize: 128,
						timeout: 30,
						state: "Active",
					},
				],
				nextMarker: undefined,
			});
		});

		it("returns empty function list when no functions exist", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Functions: [],
			});

			const result = await service.listFunctions();

			expect(result).toEqual({ functions: [], nextMarker: undefined });
		});

		it("returns empty function list when Functions is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listFunctions();

			expect(result).toEqual({ functions: [], nextMarker: undefined });
		});

		it("passes marker when provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Functions: [],
				NextMarker: "next-page-token",
			});

			const result = await service.listFunctions("some-marker");

			expect(result.nextMarker).toBe("next-page-token");
			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({ Marker: "some-marker" });
		});

		it("uses empty string defaults for missing FunctionName and FunctionArn", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Functions: [
					{
						// FunctionName and FunctionArn intentionally absent
						CodeSize: 0,
					},
				],
			});

			const result = await service.listFunctions();

			expect(result.functions[0].functionName).toBe("");
			expect(result.functions[0].functionArn).toBe("");
			expect(result.functions[0].codeSize).toBe(0);
		});
	});

	describe("getFunction", () => {
		it("returns full function detail from Configuration", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Configuration: {
					FunctionName: "my-function",
					FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function",
					Runtime: "nodejs20.x",
					Handler: "index.handler",
					Role: "arn:aws:iam::000000000000:role/my-role",
					CodeSize: 2048,
					Description: "A test function",
					Timeout: 60,
					MemorySize: 256,
					LastModified: "2024-01-01T00:00:00.000+0000",
					CodeSha256: "abc123",
					Version: "$LATEST",
					State: "Active",
					StateReason: undefined,
					Environment: { Variables: { MY_VAR: "my-value" } },
					Architectures: ["x86_64"],
					Layers: [
						{ Arn: "arn:aws:lambda:us-east-1:000000000000:layer:my-layer:1", CodeSize: 512 },
					],
					PackageType: "Zip",
				},
			});

			const result = await service.getFunction("my-function");

			expect(result).toEqual({
				functionName: "my-function",
				functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function",
				runtime: "nodejs20.x",
				handler: "index.handler",
				role: "arn:aws:iam::000000000000:role/my-role",
				codeSize: 2048,
				description: "A test function",
				timeout: 60,
				memorySize: 256,
				lastModified: "2024-01-01T00:00:00.000+0000",
				codeSha256: "abc123",
				version: "$LATEST",
				state: "Active",
				stateReason: undefined,
				environment: { MY_VAR: "my-value" },
				architectures: ["x86_64"],
				layers: [
					{ arn: "arn:aws:lambda:us-east-1:000000000000:layer:my-layer:1", codeSize: 512 },
				],
				packageType: "Zip",
			});
		});

		it("throws AppError with 404 when Configuration is absent from response", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				// Configuration intentionally absent
			});

			await expect(service.getFunction("ghost-function")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.getFunction("missing-fn")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
				message: "Function 'missing-fn' not found",
			});
		});

		it("re-throws unknown errors from getFunction", async () => {
			const error = new Error("Unexpected AWS error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.getFunction("my-function")).rejects.toThrow(
				"Unexpected AWS error",
			);
		});

		it("maps empty arrays for Layers when absent", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Configuration: {
					FunctionName: "no-layers-fn",
					FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:no-layers-fn",
					Role: "arn:aws:iam::000000000000:role/my-role",
					CodeSize: 0,
					// Layers intentionally absent
				},
			});

			const result = await service.getFunction("no-layers-fn");

			expect(result?.layers).toEqual([]);
		});
	});

	describe("createFunction", () => {
		it("creates a function with zip code and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.createFunction({
				functionName: "new-function",
				runtime: "nodejs20.x",
				handler: "index.handler",
				role: "arn:aws:iam::000000000000:role/my-role",
				code: { zipFile: Buffer.from("zip-content").toString("base64") },
				description: "A new function",
				timeout: 30,
				memorySize: 128,
				environment: { ENV_KEY: "env-value" },
				architectures: ["x86_64"],
			});

			expect(result).toEqual({
				message: "Function 'new-function' created successfully",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("creates a function with S3 code reference", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.createFunction({
				functionName: "s3-function",
				runtime: "python3.12",
				handler: "handler.main",
				role: "arn:aws:iam::000000000000:role/my-role",
				code: { s3Bucket: "my-bucket", s3Key: "functions/s3-function.zip" },
			});

			expect(result).toEqual({
				message: "Function 's3-function' created successfully",
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "s3-function",
				Code: { S3Bucket: "my-bucket", S3Key: "functions/s3-function.zip" },
			});
		});

		it("throws AppError with 409 on ResourceConflictException", async () => {
			const error = Object.assign(new Error("Function already exists"), {
				name: "ResourceConflictException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(
				service.createFunction({
					functionName: "existing-fn",
					runtime: "nodejs20.x",
					handler: "index.handler",
					role: "arn:aws:iam::000000000000:role/my-role",
					code: { zipFile: "abc" },
				}),
			).rejects.toMatchObject({
				statusCode: 409,
				code: "FUNCTION_CONFLICT",
				message: "Function 'existing-fn' already exists or is in use",
			});
		});

		it("throws AppError with 400 on InvalidParameterValueException", async () => {
			const error = Object.assign(new Error("Invalid handler"), {
				name: "InvalidParameterValueException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createFunction({
					functionName: "bad-fn",
					runtime: "nodejs20.x",
					handler: "bad handler",
					role: "arn:aws:iam::000000000000:role/my-role",
					code: {},
				}),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});

		it("re-throws unknown errors from createFunction", async () => {
			const error = new Error("Unknown error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createFunction({
					functionName: "my-fn",
					runtime: "nodejs20.x",
					handler: "index.handler",
					role: "arn:aws:iam::000000000000:role/my-role",
					code: {},
				}),
			).rejects.toThrow("Unknown error");
		});
	});

	describe("updateFunctionCode", () => {
		it("updates function code with zip and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.updateFunctionCode("my-function", {
				zipFile: Buffer.from("new-code").toString("base64"),
			});

			expect(result).toEqual({
				message: "Function 'my-function' code updated successfully",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("updates function code with S3 reference", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.updateFunctionCode("my-function", {
				s3Bucket: "code-bucket",
				s3Key: "functions/my-function-v2.zip",
			});

			expect(result).toEqual({
				message: "Function 'my-function' code updated successfully",
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				S3Bucket: "code-bucket",
				S3Key: "functions/my-function-v2.zip",
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.updateFunctionCode("missing-fn", { zipFile: "abc" }),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});

		it("throws AppError with 409 on ResourceConflictException", async () => {
			const error = Object.assign(new Error("Conflict"), {
				name: "ResourceConflictException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.updateFunctionCode("busy-fn", {}),
			).rejects.toMatchObject({
				statusCode: 409,
				code: "FUNCTION_CONFLICT",
			});
		});

		it("re-throws unknown errors from updateFunctionCode", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.updateFunctionCode("my-function", {}),
			).rejects.toThrow("Unexpected error");
		});
	});

	describe("updateFunctionConfig", () => {
		it("updates function configuration and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.updateFunctionConfig("my-function", {
				handler: "index.newHandler",
				runtime: "nodejs20.x",
				description: "Updated description",
				timeout: 60,
				memorySize: 256,
				environment: { NEW_VAR: "new-value" },
				role: "arn:aws:iam::000000000000:role/new-role",
			});

			expect(result).toEqual({
				message: "Function 'my-function' configuration updated successfully",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("sends only provided fields in the update command", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			await service.updateFunctionConfig("my-function", {
				timeout: 45,
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				Timeout: 45,
			});
			expect(call.input.Handler).toBeUndefined();
			expect(call.input.Runtime).toBeUndefined();
		});

		it("includes Description even when set to empty string", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			await service.updateFunctionConfig("my-function", {
				description: "",
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				Description: "",
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.updateFunctionConfig("missing-fn", { timeout: 30 }),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});

		it("re-throws unknown errors from updateFunctionConfig", async () => {
			const error = new Error("Throttling");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.updateFunctionConfig("my-function", {}),
			).rejects.toThrow("Throttling");
		});
	});

	describe("deleteFunction", () => {
		it("deletes a function successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteFunction("my-function");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValue(error);

			await expect(service.deleteFunction("missing-fn")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
				message: "Function 'missing-fn' not found",
			});
		});

		it("throws AppError with 409 on ResourceConflictException", async () => {
			const error = Object.assign(new Error("Conflict"), {
				name: "ResourceConflictException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.deleteFunction("busy-fn")).rejects.toMatchObject({
				statusCode: 409,
				code: "FUNCTION_CONFLICT",
			});
		});

		it("re-throws unknown errors from deleteFunction", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.deleteFunction("my-function")).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	describe("invokeFunction", () => {
		it("invokes a function and returns status, payload and decoded log", async () => {
			const payloadBytes = new TextEncoder().encode('{"result":"ok"}');
			const logBase64 = Buffer.from("START RequestId: abc\nEND\n").toString("base64");

			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				StatusCode: 200,
				Payload: payloadBytes,
				LogResult: logBase64,
				FunctionError: undefined,
			});

			const result = await service.invokeFunction(
				"my-function",
				'{"key":"value"}',
			);

			expect(result).toEqual({
				statusCode: 200,
				payload: '{"result":"ok"}',
				functionError: undefined,
				logResult: "START RequestId: abc\nEND\n",
			});
		});

		it("invokes a function with no payload and no log result", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				StatusCode: 202,
				// Payload and LogResult intentionally absent
			});

			const result = await service.invokeFunction("async-fn", undefined, "Event");

			expect(result).toEqual({
				statusCode: 202,
				payload: undefined,
				functionError: undefined,
				logResult: undefined,
			});
		});

		it("returns functionError when function execution fails", async () => {
			const errorPayload = new TextEncoder().encode('{"errorMessage":"division by zero"}');

			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				StatusCode: 200,
				Payload: errorPayload,
				FunctionError: "Unhandled",
				LogResult: undefined,
			});

			const result = await service.invokeFunction("failing-fn");

			expect(result?.functionError).toBe("Unhandled");
			expect(result?.payload).toBe('{"errorMessage":"division by zero"}');
		});

		it("uses RequestResponse as default invocation type", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				StatusCode: 200,
			});

			await service.invokeFunction("my-function");

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				InvocationType: "RequestResponse",
				LogType: "Tail",
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.invokeFunction("missing-fn")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});

		it("throws AppError with 429 on TooManyRequestsException", async () => {
			const error = Object.assign(new Error("Rate exceeded"), {
				name: "TooManyRequestsException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.invokeFunction("my-fn")).rejects.toMatchObject({
				statusCode: 429,
				code: "TOO_MANY_REQUESTS",
			});
		});

		it("throws AppError with 502 on ServiceException", async () => {
			const error = Object.assign(new Error("Service unavailable"), {
				name: "ServiceException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.invokeFunction("my-fn")).rejects.toMatchObject({
				statusCode: 502,
				code: "SERVICE_ERROR",
			});
		});

		it("re-throws unknown errors from invokeFunction", async () => {
			const error = new Error("Network timeout");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.invokeFunction("my-function")).rejects.toThrow(
				"Network timeout",
			);
		});
	});

	describe("listVersions", () => {
		it("returns formatted version list", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Versions: [
					{
						Version: "1",
						FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:1",
						Description: "Initial version",
						LastModified: "2024-01-01T00:00:00.000+0000",
						Runtime: "nodejs20.x",
					},
					{
						Version: "$LATEST",
						FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:$LATEST",
						Description: undefined,
						LastModified: "2024-06-01T00:00:00.000+0000",
						Runtime: "nodejs20.x",
					},
				],
				NextMarker: undefined,
			});

			const result = await service.listVersions("my-function");

			expect(result).toEqual({
				versions: [
					{
						version: "1",
						functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:1",
						description: "Initial version",
						lastModified: "2024-01-01T00:00:00.000+0000",
						runtime: "nodejs20.x",
					},
					{
						version: "$LATEST",
						functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:$LATEST",
						description: undefined,
						lastModified: "2024-06-01T00:00:00.000+0000",
						runtime: "nodejs20.x",
					},
				],
				nextMarker: undefined,
			});
		});

		it("returns empty versions list when Versions is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listVersions("my-function");

			expect(result).toEqual({ versions: [], nextMarker: undefined });
		});

		it("passes marker and returns nextMarker when provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Versions: [],
				NextMarker: "next-version-token",
			});

			const result = await service.listVersions("my-function", "page-1-token");

			expect(result?.nextMarker).toBe("next-version-token");
			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				Marker: "page-1-token",
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listVersions("missing-fn")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});

		it("re-throws unknown errors from listVersions", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listVersions("my-function")).rejects.toThrow(
				"Unexpected error",
			);
		});
	});

	describe("listAliases", () => {
		it("returns formatted alias list", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Aliases: [
					{
						Name: "prod",
						AliasArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:prod",
						FunctionVersion: "5",
						Description: "Production alias",
					},
					{
						Name: "staging",
						AliasArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:staging",
						FunctionVersion: "4",
						Description: undefined,
					},
				],
				NextMarker: undefined,
			});

			const result = await service.listAliases("my-function");

			expect(result).toEqual({
				aliases: [
					{
						name: "prod",
						aliasArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:prod",
						functionVersion: "5",
						description: "Production alias",
					},
					{
						name: "staging",
						aliasArn: "arn:aws:lambda:us-east-1:000000000000:function:my-function:staging",
						functionVersion: "4",
						description: undefined,
					},
				],
				nextMarker: undefined,
			});
		});

		it("returns empty aliases list when Aliases is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listAliases("my-function");

			expect(result).toEqual({ aliases: [], nextMarker: undefined });
		});

		it("passes marker and returns nextMarker when provided", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Aliases: [],
				NextMarker: "next-alias-token",
			});

			const result = await service.listAliases("my-function", "alias-page-1");

			expect(result?.nextMarker).toBe("next-alias-token");
			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-function",
				Marker: "alias-page-1",
			});
		});

		it("uses empty string defaults for missing Name, AliasArn, FunctionVersion", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Aliases: [
					{
						// All string fields intentionally absent
					},
				],
			});

			const result = await service.listAliases("my-function");

			expect(result?.aliases[0]).toEqual({
				name: "",
				aliasArn: "",
				functionVersion: "",
				description: undefined,
			});
		});

		it("throws AppError with 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listAliases("missing-fn")).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
				message: "Function 'missing-fn' not found",
			});
		});

		it("throws AppError with 409 on ResourceConflictException", async () => {
			const error = Object.assign(new Error("Conflict"), {
				name: "ResourceConflictException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listAliases("my-function")).rejects.toMatchObject({
				statusCode: 409,
				code: "FUNCTION_CONFLICT",
			});
		});

		it("re-throws unknown errors from listAliases", async () => {
			const error = new Error("Network issue");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(service.listAliases("my-function")).rejects.toThrow(
				"Network issue",
			);
		});
	});

	describe("listEventSourceMappings", () => {
		it("returns formatted mapping list with state-derived enabled flag", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				EventSourceMappings: [
					{
						UUID: "abc-123",
						EventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
						FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-fn",
						State: "Enabled",
						BatchSize: 10,
						LastModified: new Date("2024-01-01"),
						MaximumBatchingWindowInSeconds: 0,
						StartingPosition: undefined,
					},
				],
				NextMarker: undefined,
			});

			const result = await service.listEventSourceMappings("my-fn");

			expect(result).toEqual({
				eventSourceMappings: [
					{
						uuid: "abc-123",
						eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
						functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-fn",
						state: "Enabled",
						batchSize: 10,
						lastModified: new Date("2024-01-01").toISOString(),
						maximumBatchingWindowInSeconds: 0,
						startingPosition: undefined,
						enabled: true,
					},
				],
				nextMarker: undefined,
			});
		});

		it("returns empty list when EventSourceMappings is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.listEventSourceMappings("my-fn");

			expect(result).toEqual({ eventSourceMappings: [], nextMarker: undefined });
		});

		it("passes marker to the command", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				EventSourceMappings: [],
				NextMarker: "next-mapping-token",
			});

			const result = await service.listEventSourceMappings("my-fn", "page-1-token");

			expect(result?.nextMarker).toBe("next-mapping-token");
			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-fn",
				Marker: "page-1-token",
			});
		});

		it("throws AppError 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Function not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.listEventSourceMappings("missing-fn"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "FUNCTION_NOT_FOUND",
			});
		});
	});

	describe("createEventSourceMapping", () => {
		it("creates mapping and returns uuid", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				UUID: "new-uuid-123",
			});

			const result = await service.createEventSourceMapping("my-fn", {
				eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
			});

			expect(result).toEqual({
				message: "Event source mapping created successfully",
				uuid: "new-uuid-123",
			});
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("passes optional params (batchSize, startingPosition, enabled)", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				UUID: "new-uuid-456",
			});

			await service.createEventSourceMapping("my-fn", {
				eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
				batchSize: 5,
				startingPosition: "TRIM_HORIZON",
				enabled: false,
			});

			const call = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(call.input).toMatchObject({
				FunctionName: "my-fn",
				EventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
				BatchSize: 5,
				StartingPosition: "TRIM_HORIZON",
				Enabled: false,
			});
		});

		it("throws AppError 409 on ResourceConflictException", async () => {
			const error = Object.assign(new Error("Mapping already exists"), {
				name: "ResourceConflictException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createEventSourceMapping("my-fn", {
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
				}),
			).rejects.toMatchObject({
				statusCode: 409,
				code: "FUNCTION_CONFLICT",
			});
		});

		it("throws AppError 400 on InvalidParameterValueException", async () => {
			const error = Object.assign(new Error("Invalid batch size"), {
				name: "InvalidParameterValueException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.createEventSourceMapping("my-fn", {
					eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
					batchSize: -1,
				}),
			).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_PARAMETER",
			});
		});
	});

	describe("deleteEventSourceMapping", () => {
		it("deletes mapping successfully", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteEventSourceMapping("abc-123");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledOnce();
		});

		it("throws AppError 404 on ResourceNotFoundException", async () => {
			const error = Object.assign(new Error("Mapping not found"), {
				name: "ResourceNotFoundException",
			});
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteEventSourceMapping("missing-uuid"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "EVENT_SOURCE_MAPPING_NOT_FOUND",
				message: "Event source mapping 'missing-uuid' not found",
			});
		});

		it("re-throws unknown errors", async () => {
			const error = new Error("Unexpected error");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

			await expect(
				service.deleteEventSourceMapping("abc-123"),
			).rejects.toThrow("Unexpected error");
		});
	});

	describe("getFunctionTriggers", () => {
		it("combines event source mappings and policy triggers", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					EventSourceMappings: [
						{
							UUID: "abc-123",
							EventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
							FunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-fn",
							State: "Enabled",
							BatchSize: 10,
							LastModified: new Date("2024-01-01"),
							MaximumBatchingWindowInSeconds: 0,
							StartingPosition: undefined,
						},
					],
					NextMarker: undefined,
				})
				.mockResolvedValueOnce({
					Policy: JSON.stringify({
						Version: "2012-10-17",
						Statement: [
							{
								Sid: "AllowS3",
								Effect: "Allow",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "s3.amazonaws.com" },
								Condition: {
									ArnLike: { "AWS:SourceArn": "arn:aws:s3:::my-bucket" },
								},
							},
						],
					}),
				});

			const result = await service.getFunctionTriggers("my-fn");

			expect(result).toEqual({
				eventSourceMappings: [
					{
						uuid: "abc-123",
						eventSourceArn: "arn:aws:sqs:us-east-1:000000000000:my-queue",
						functionArn: "arn:aws:lambda:us-east-1:000000000000:function:my-fn",
						state: "Enabled",
						batchSize: 10,
						lastModified: new Date("2024-01-01").toISOString(),
						maximumBatchingWindowInSeconds: 0,
						startingPosition: undefined,
						enabled: true,
					},
				],
				policyTriggers: [
					{
						sid: "AllowS3",
						service: "s3.amazonaws.com",
						sourceArn: "arn:aws:s3:::my-bucket",
					},
				],
				nextMarker: undefined,
			});
		});

		it("returns empty policyTriggers when no policy exists (ResourceNotFoundException)", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					EventSourceMappings: [],
					NextMarker: undefined,
				})
				.mockRejectedValueOnce(
					Object.assign(new Error("No policy"), {
						name: "ResourceNotFoundException",
					}),
				);

			const result = await service.getFunctionTriggers("my-fn");

			expect(result).toEqual({
				eventSourceMappings: [],
				policyTriggers: [],
				nextMarker: undefined,
			});
		});

		it("parses policy with multiple statements", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					EventSourceMappings: [],
					NextMarker: undefined,
				})
				.mockResolvedValueOnce({
					Policy: JSON.stringify({
						Version: "2012-10-17",
						Statement: [
							{
								Sid: "AllowS3",
								Effect: "Allow",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "s3.amazonaws.com" },
								Condition: {
									ArnLike: { "AWS:SourceArn": "arn:aws:s3:::bucket-one" },
								},
							},
							{
								Sid: "AllowSNS",
								Effect: "Allow",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "sns.amazonaws.com" },
								Condition: {
									ArnLike: {
										"AWS:SourceArn":
											"arn:aws:sns:us-east-1:000000000000:my-topic",
									},
								},
							},
						],
					}),
				});

			const result = await service.getFunctionTriggers("my-fn");

			expect(result.policyTriggers).toHaveLength(2);
			expect(result.policyTriggers[0]).toMatchObject({
				sid: "AllowS3",
				service: "s3.amazonaws.com",
				sourceArn: "arn:aws:s3:::bucket-one",
			});
			expect(result.policyTriggers[1]).toMatchObject({
				sid: "AllowSNS",
				service: "sns.amazonaws.com",
				sourceArn: "arn:aws:sns:us-east-1:000000000000:my-topic",
			});
		});

		it("filters out Deny statements and non-InvokeFunction actions", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					EventSourceMappings: [],
					NextMarker: undefined,
				})
				.mockResolvedValueOnce({
					Policy: JSON.stringify({
						Version: "2012-10-17",
						Statement: [
							{
								Sid: "DenyS3",
								Effect: "Deny",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "s3.amazonaws.com" },
							},
							{
								Sid: "AllowGetFunction",
								Effect: "Allow",
								Action: "lambda:GetFunction",
								Principal: { Service: "s3.amazonaws.com" },
							},
							{
								Sid: "AllowSNS",
								Effect: "Allow",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "sns.amazonaws.com" },
								Condition: {
									ArnLike: {
										"AWS:SourceArn":
											"arn:aws:sns:us-east-1:000000000000:my-topic",
									},
								},
							},
						],
					}),
				});

			const result = await service.getFunctionTriggers("my-fn");

			expect(result.policyTriggers).toHaveLength(1);
			expect(result.policyTriggers[0]).toMatchObject({
				sid: "AllowSNS",
				service: "sns.amazonaws.com",
			});
		});

		it("handles missing Condition/ArnLike in policy statements", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					EventSourceMappings: [],
					NextMarker: undefined,
				})
				.mockResolvedValueOnce({
					Policy: JSON.stringify({
						Version: "2012-10-17",
						Statement: [
							{
								Sid: "AllowNoCondition",
								Effect: "Allow",
								Action: "lambda:InvokeFunction",
								Principal: { Service: "events.amazonaws.com" },
								// Condition intentionally absent
							},
						],
					}),
				});

			const result = await service.getFunctionTriggers("my-fn");

			expect(result.policyTriggers).toHaveLength(1);
			expect(result.policyTriggers[0]).toEqual({
				sid: "AllowNoCondition",
				service: "events.amazonaws.com",
				sourceArn: undefined,
			});
		});
	});
});
