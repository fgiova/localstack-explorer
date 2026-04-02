import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudFormationService } from "../../../src/plugins/cloudformation/service.js";
import { AppError } from "../../../src/shared/errors.js";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-cloudformation", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@aws-sdk/client-cloudformation")>();
	return {
		...actual,
	};
});

function createService() {
	const mockClient = { send: mockSend } as never;
	return new CloudFormationService(mockClient);
}

describe("CloudFormationService", () => {
	beforeEach(() => {
		mockSend.mockReset();
	});

	// -------------------------------------------------------------------------
	describe("listStacks", () => {
		it("returns mapped stacks when StackSummaries is populated", async () => {
			const creationTime = new Date("2024-01-01T00:00:00.000Z");
			const lastUpdatedTime = new Date("2024-06-01T12:00:00.000Z");

			mockSend.mockResolvedValueOnce({
				StackSummaries: [
					{
						StackId:
							"arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc",
						StackName: "my-stack",
						StackStatus: "CREATE_COMPLETE",
						CreationTime: creationTime,
						LastUpdatedTime: lastUpdatedTime,
						TemplateDescription: "My test stack",
					},
					{
						StackId:
							"arn:aws:cloudformation:us-east-1:000000000000:stack/other/def",
						StackName: "other-stack",
						StackStatus: "UPDATE_COMPLETE",
						CreationTime: creationTime,
						LastUpdatedTime: undefined,
						TemplateDescription: undefined,
					},
				],
			});

			const service = createService();
			const result = await service.listStacks();

			expect(result.stacks).toHaveLength(2);
			expect(result.stacks[0]).toEqual({
				stackId:
					"arn:aws:cloudformation:us-east-1:000000000000:stack/my-stack/abc",
				stackName: "my-stack",
				status: "CREATE_COMPLETE",
				creationTime: "2024-01-01T00:00:00.000Z",
				lastUpdatedTime: "2024-06-01T12:00:00.000Z",
				description: "My test stack",
			});
			expect(result.stacks[1]).toEqual({
				stackId:
					"arn:aws:cloudformation:us-east-1:000000000000:stack/other/def",
				stackName: "other-stack",
				status: "UPDATE_COMPLETE",
				creationTime: "2024-01-01T00:00:00.000Z",
				lastUpdatedTime: undefined,
				description: undefined,
			});
		});

		it("returns empty stacks array when StackSummaries is undefined", async () => {
			mockSend.mockResolvedValueOnce({ StackSummaries: undefined });

			const service = createService();
			const result = await service.listStacks();

			expect(result.stacks).toEqual([]);
		});

		it("returns empty stacks array when StackSummaries is empty", async () => {
			mockSend.mockResolvedValueOnce({ StackSummaries: [] });

			const service = createService();
			const result = await service.listStacks();

			expect(result.stacks).toEqual([]);
		});

		it("uses empty string for StackName when undefined", async () => {
			mockSend.mockResolvedValueOnce({
				StackSummaries: [{ StackStatus: undefined, StackName: undefined }],
			});

			const service = createService();
			const result = await service.listStacks();

			expect(result.stacks[0].stackName).toBe("");
			expect(result.stacks[0].status).toBe("UNKNOWN");
		});
	});

	// -------------------------------------------------------------------------
	describe("getStack", () => {
		it("returns full stack detail with outputs, parameters, and resources", async () => {
			const creationTime = new Date("2024-01-01T00:00:00.000Z");

			mockSend
				// First call: DescribeStacksCommand
				.mockResolvedValueOnce({
					Stacks: [
						{
							StackId: "arn:stack/my-stack/abc",
							StackName: "my-stack",
							StackStatus: "CREATE_COMPLETE",
							CreationTime: creationTime,
							LastUpdatedTime: undefined,
							Description: "A nice stack",
							Outputs: [
								{
									OutputKey: "BucketName",
									OutputValue: "my-bucket",
									Description: "The bucket name",
								},
							],
							Parameters: [
								{
									ParameterKey: "Env",
									ParameterValue: "prod",
								},
							],
						},
					],
				})
				// Second call: ListStackResourcesCommand
				.mockResolvedValueOnce({
					StackResourceSummaries: [
						{
							LogicalResourceId: "MyBucket",
							PhysicalResourceId: "my-bucket-physical",
							ResourceType: "AWS::S3::Bucket",
							ResourceStatus: "CREATE_COMPLETE",
						},
					],
				});

			const service = createService();
			const result = await service.getStack("my-stack");

			expect(result.stackName).toBe("my-stack");
			expect(result.status).toBe("CREATE_COMPLETE");
			expect(result.description).toBe("A nice stack");
			expect(result.creationTime).toBe("2024-01-01T00:00:00.000Z");
			expect(result.lastUpdatedTime).toBeUndefined();

			expect(result.outputs).toEqual([
				{
					outputKey: "BucketName",
					outputValue: "my-bucket",
					description: "The bucket name",
				},
			]);

			expect(result.parameters).toEqual([
				{
					parameterKey: "Env",
					parameterValue: "prod",
				},
			]);

			expect(result.resources).toEqual([
				{
					logicalResourceId: "MyBucket",
					physicalResourceId: "my-bucket-physical",
					resourceType: "AWS::S3::Bucket",
					resourceStatus: "CREATE_COMPLETE",
				},
			]);
		});

		it("returns empty arrays for outputs, parameters, resources when all undefined", async () => {
			mockSend
				.mockResolvedValueOnce({
					Stacks: [
						{
							StackName: "bare-stack",
							StackStatus: "CREATE_COMPLETE",
							Outputs: undefined,
							Parameters: undefined,
						},
					],
				})
				.mockResolvedValueOnce({
					StackResourceSummaries: undefined,
				});

			const service = createService();
			const result = await service.getStack("bare-stack");

			expect(result.outputs).toEqual([]);
			expect(result.parameters).toEqual([]);
			expect(result.resources).toEqual([]);
		});

		it("throws AppError 404 when Stacks is empty", async () => {
			mockSend.mockResolvedValueOnce({ Stacks: [] });

			const service = createService();
			await expect(service.getStack("missing-stack")).rejects.toMatchObject({
				name: "AppError",
				statusCode: 404,
				code: "STACK_NOT_FOUND",
				message: "Stack 'missing-stack' not found",
			});
		});

		it("throws AppError 404 when Stacks is undefined", async () => {
			mockSend.mockResolvedValueOnce({ Stacks: undefined });

			const service = createService();
			await expect(service.getStack("gone")).rejects.toBeInstanceOf(AppError);
		});

		it("uses fallback values for StackName and StackStatus when undefined", async () => {
			mockSend
				.mockResolvedValueOnce({
					Stacks: [{ StackName: undefined, StackStatus: undefined }],
				})
				.mockResolvedValueOnce({ StackResourceSummaries: [] });

			const service = createService();
			const result = await service.getStack("any");

			expect(result.stackName).toBe("");
			expect(result.status).toBe("UNKNOWN");
		});
	});

	// -------------------------------------------------------------------------
	describe("createStack", () => {
		it("creates a stack with templateBody", async () => {
			mockSend.mockResolvedValueOnce({
				StackId: "arn:stack/new-stack/xyz",
			});

			const service = createService();
			const result = await service.createStack(
				"new-stack",
				"AWSTemplateFormatVersion: '2010-09-09'",
			);

			expect(result.message).toBe("Stack 'new-stack' creation initiated");
			expect(result.stackId).toBe("arn:stack/new-stack/xyz");
		});

		it("creates a stack with templateURL", async () => {
			mockSend.mockResolvedValueOnce({ StackId: "arn:stack/url-stack/abc" });

			const service = createService();
			const result = await service.createStack(
				"url-stack",
				undefined,
				"https://s3.amazonaws.com/my-bucket/template.yaml",
			);

			expect(result.message).toBe("Stack 'url-stack' creation initiated");
			expect(result.stackId).toBe("arn:stack/url-stack/abc");
		});

		it("creates a stack with parameters", async () => {
			mockSend.mockResolvedValueOnce({ StackId: "arn:stack/param-stack/def" });

			const service = createService();
			const result = await service.createStack(
				"param-stack",
				"AWSTemplateFormatVersion: '2010-09-09'",
				undefined,
				[{ parameterKey: "Env", parameterValue: "staging" }],
			);

			expect(result.message).toBe("Stack 'param-stack' creation initiated");
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("throws AppError 400 when neither templateBody nor templateURL is provided", async () => {
			const service = createService();
			await expect(
				service.createStack("no-template-stack"),
			).rejects.toMatchObject({
				name: "AppError",
				statusCode: 400,
				code: "VALIDATION_ERROR",
				message: "Either templateBody or templateURL must be provided",
			});

			// send should never be called
			expect(mockSend).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	describe("updateStack", () => {
		it("updates a stack successfully", async () => {
			mockSend.mockResolvedValueOnce({ StackId: "arn:stack/my-stack/abc" });

			const service = createService();
			const result = await service.updateStack(
				"my-stack",
				"AWSTemplateFormatVersion: '2010-09-09'",
			);

			expect(result.message).toBe("Stack 'my-stack' update initiated");
			expect(result.stackId).toBe("arn:stack/my-stack/abc");
		});

		it("updates a stack with parameters", async () => {
			mockSend.mockResolvedValueOnce({ StackId: "arn:stack/my-stack/abc" });

			const service = createService();
			const result = await service.updateStack(
				"my-stack",
				"AWSTemplateFormatVersion: '2010-09-09'",
				undefined,
				[{ parameterKey: "Env", parameterValue: "staging" }],
			);

			expect(result.message).toBe("Stack 'my-stack' update initiated");
			expect(result.stackId).toBe("arn:stack/my-stack/abc");
			expect(mockSend).toHaveBeenCalledTimes(1);
			// Verify the Parameters were mapped correctly
			const cmdInput = mockSend.mock.calls[0][0].input;
			expect(cmdInput.Parameters).toEqual([
				{ ParameterKey: "Env", ParameterValue: "staging" },
			]);
		});

		it("throws AppError 404 when ValidationError message includes 'does not exist'", async () => {
			const validationError = new Error(
				"Stack with id missing-stack does not exist",
			);
			validationError.name = "ValidationError";
			mockSend.mockRejectedValueOnce(validationError);

			const service = createService();
			await expect(service.updateStack("missing-stack")).rejects.toMatchObject({
				name: "AppError",
				statusCode: 404,
				code: "STACK_NOT_FOUND",
				message: "Stack 'missing-stack' not found",
			});
		});

		it("rethrows non-ValidationError errors unchanged", async () => {
			const unexpectedError = new Error("AWS internal error");
			mockSend.mockRejectedValueOnce(unexpectedError);

			const service = createService();
			await expect(service.updateStack("my-stack")).rejects.toBe(
				unexpectedError,
			);
		});

		it("rethrows ValidationError that does NOT include 'does not exist'", async () => {
			const validationError = new Error("Template format error");
			validationError.name = "ValidationError";
			mockSend.mockRejectedValueOnce(validationError);

			const service = createService();
			await expect(service.updateStack("my-stack")).rejects.toBe(
				validationError,
			);
		});
	});

	// -------------------------------------------------------------------------
	describe("deleteStack", () => {
		it("deletes a stack and returns success: true", async () => {
			mockSend.mockResolvedValueOnce({});

			const service = createService();
			const result = await service.deleteStack("my-stack");

			expect(result).toEqual({ success: true });
			expect(mockSend).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	describe("getStackEvents", () => {
		it("returns mapped events", async () => {
			const timestamp = new Date("2024-03-15T10:00:00.000Z");

			mockSend.mockResolvedValueOnce({
				StackEvents: [
					{
						EventId: "event-1",
						LogicalResourceId: "MyBucket",
						ResourceType: "AWS::S3::Bucket",
						ResourceStatus: "CREATE_COMPLETE",
						Timestamp: timestamp,
						ResourceStatusReason: undefined,
					},
					{
						EventId: "event-2",
						LogicalResourceId: "MyQueue",
						ResourceType: "AWS::SQS::Queue",
						ResourceStatus: "CREATE_FAILED",
						Timestamp: timestamp,
						ResourceStatusReason: "Resource creation cancelled",
					},
				],
			});

			const service = createService();
			const result = await service.getStackEvents("my-stack");

			expect(result.events).toHaveLength(2);
			expect(result.events[0]).toEqual({
				eventId: "event-1",
				logicalResourceId: "MyBucket",
				resourceType: "AWS::S3::Bucket",
				resourceStatus: "CREATE_COMPLETE",
				timestamp: "2024-03-15T10:00:00.000Z",
				resourceStatusReason: undefined,
			});
			expect(result.events[1].resourceStatusReason).toBe(
				"Resource creation cancelled",
			);
		});

		it("returns empty events array when StackEvents is undefined", async () => {
			mockSend.mockResolvedValueOnce({ StackEvents: undefined });

			const service = createService();
			const result = await service.getStackEvents("my-stack");

			expect(result.events).toEqual([]);
		});
	});

	// -------------------------------------------------------------------------
	describe("getTemplate", () => {
		it("returns the template body string", async () => {
			const templateBody =
				"AWSTemplateFormatVersion: '2010-09-09'\nResources: {}";
			mockSend.mockResolvedValueOnce({ TemplateBody: templateBody });

			const service = createService();
			const result = await service.getTemplate("my-stack");

			expect(result.templateBody).toBe(templateBody);
		});

		it("returns empty string when TemplateBody is undefined", async () => {
			mockSend.mockResolvedValueOnce({ TemplateBody: undefined });

			const service = createService();
			const result = await service.getTemplate("my-stack");

			expect(result.templateBody).toBe("");
		});
	});
});
