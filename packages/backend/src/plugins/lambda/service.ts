import {
	CreateEventSourceMappingCommand,
	CreateFunctionCommand,
	DeleteEventSourceMappingCommand,
	DeleteFunctionCommand,
	type EventSourcePosition,
	GetFunctionCommand,
	GetPolicyCommand,
	type Architecture,
	type InvocationType,
	InvokeCommand,
	type LambdaClient,
	ListAliasesCommand,
	ListEventSourceMappingsCommand,
	ListFunctionsCommand,
	ListVersionsByFunctionCommand,
	type Runtime,
	UpdateFunctionCodeCommand,
	UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { AppError } from "../../shared/errors.js";

function mapLambdaError(err: unknown, functionName: string): never {
	const error = err as Error & { name: string };
	switch (error.name) {
		case "ResourceNotFoundException":
			throw new AppError(
				`Function '${functionName}' not found`,
				404,
				"FUNCTION_NOT_FOUND",
			);
		case "ResourceConflictException":
			throw new AppError(
				`Function '${functionName}' already exists or is in use`,
				409,
				"FUNCTION_CONFLICT",
			);
		case "InvalidParameterValueException":
			throw new AppError(error.message, 400, "INVALID_PARAMETER");
		case "ServiceException":
			throw new AppError(error.message, 502, "SERVICE_ERROR");
		case "TooManyRequestsException":
			throw new AppError(error.message, 429, "TOO_MANY_REQUESTS");
		default:
			throw error;
	}
}

export class LambdaService {
	constructor(private client: LambdaClient) {}

	async listFunctions(marker?: string) {
		const response = await this.client.send(
			new ListFunctionsCommand({
				...(marker && { Marker: marker }),
			}),
		);
		const functions = (response.Functions ?? []).map((fn) => ({
			functionName: fn.FunctionName ?? "",
			functionArn: fn.FunctionArn ?? "",
			runtime: fn.Runtime,
			handler: fn.Handler,
			codeSize: fn.CodeSize ?? 0,
			lastModified: fn.LastModified,
			memorySize: fn.MemorySize,
			timeout: fn.Timeout,
			state: fn.State,
		}));
		return { functions, nextMarker: response.NextMarker };
	}

	async getFunction(functionName: string) {
		try {
			const response = await this.client.send(
				new GetFunctionCommand({ FunctionName: functionName }),
			);
			const config = response.Configuration;
			if (!config) {
				throw new AppError(
					`Function '${functionName}' not found`,
					404,
					"FUNCTION_NOT_FOUND",
				);
			}
			return {
				functionName: config.FunctionName ?? "",
				functionArn: config.FunctionArn ?? "",
				runtime: config.Runtime,
				handler: config.Handler,
				role: config.Role ?? "",
				codeSize: config.CodeSize ?? 0,
				description: config.Description,
				timeout: config.Timeout,
				memorySize: config.MemorySize,
				lastModified: config.LastModified,
				codeSha256: config.CodeSha256,
				version: config.Version,
				state: config.State,
				stateReason: config.StateReason,
				environment: config.Environment?.Variables,
				architectures: config.Architectures,
				layers: (config.Layers ?? []).map((l) => ({
					arn: l.Arn ?? "",
					codeSize: l.CodeSize ?? 0,
				})),
				packageType: config.PackageType,
			};
		} catch (err) {
			if (err instanceof AppError) throw err;
			mapLambdaError(err, functionName);
		}
	}

	async createFunction(params: {
		functionName: string;
		runtime: string;
		handler: string;
		role: string;
		code: { zipFile?: string; s3Bucket?: string; s3Key?: string };
		description?: string;
		timeout?: number;
		memorySize?: number;
		environment?: Record<string, string>;
		architectures?: string[];
	}) {
		try {
			await this.client.send(
				new CreateFunctionCommand({
					FunctionName: params.functionName,
					Runtime: params.runtime as Runtime,
					Handler: params.handler,
					Role: params.role,
					Code: {
						...(params.code.zipFile && {
							ZipFile: Buffer.from(params.code.zipFile, "base64"),
						}),
						...(params.code.s3Bucket && { S3Bucket: params.code.s3Bucket }),
						...(params.code.s3Key && { S3Key: params.code.s3Key }),
					},
					Description: params.description,
					Timeout: params.timeout,
					MemorySize: params.memorySize,
					...(params.environment && {
						Environment: { Variables: params.environment },
					}),
					...(params.architectures && {
						Architectures: params.architectures as Architecture[],
					}),
				}),
			);
			return {
				message: `Function '${params.functionName}' created successfully`,
			};
		} catch (err) {
			mapLambdaError(err, params.functionName);
		}
	}

	async updateFunctionCode(
		functionName: string,
		params: { zipFile?: string; s3Bucket?: string; s3Key?: string },
	) {
		try {
			await this.client.send(
				new UpdateFunctionCodeCommand({
					FunctionName: functionName,
					...(params.zipFile && {
						ZipFile: Buffer.from(params.zipFile, "base64"),
					}),
					...(params.s3Bucket && { S3Bucket: params.s3Bucket }),
					...(params.s3Key && { S3Key: params.s3Key }),
				}),
			);
			return {
				message: `Function '${functionName}' code updated successfully`,
			};
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async updateFunctionConfig(
		functionName: string,
		params: {
			handler?: string;
			runtime?: string;
			description?: string;
			timeout?: number;
			memorySize?: number;
			environment?: Record<string, string>;
			role?: string;
		},
	) {
		try {
			await this.client.send(
				new UpdateFunctionConfigurationCommand({
					FunctionName: functionName,
					...(params.handler && { Handler: params.handler }),
					...(params.runtime && { Runtime: params.runtime as Runtime }),
					...(params.description !== undefined && {
						Description: params.description,
					}),
					...(params.timeout && { Timeout: params.timeout }),
					...(params.memorySize && { MemorySize: params.memorySize }),
					...(params.environment && {
						Environment: { Variables: params.environment },
					}),
					...(params.role && { Role: params.role }),
				}),
			);
			return {
				message: `Function '${functionName}' configuration updated successfully`,
			};
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async deleteFunction(functionName: string) {
		try {
			await this.client.send(
				new DeleteFunctionCommand({ FunctionName: functionName }),
			);
			return { success: true };
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async invokeFunction(
		functionName: string,
		payload?: string,
		invocationType: string = "RequestResponse",
	) {
		try {
			const response = await this.client.send(
				new InvokeCommand({
					FunctionName: functionName,
					InvocationType: invocationType as InvocationType,
					LogType: "Tail",
					...(payload && { Payload: new TextEncoder().encode(payload) }),
				}),
			);
			const responsePayload = response.Payload
				? new TextDecoder().decode(response.Payload)
				: undefined;
			return {
				statusCode: response.StatusCode ?? 200,
				payload: responsePayload,
				functionError: response.FunctionError,
				logResult: response.LogResult
					? Buffer.from(response.LogResult, "base64").toString("utf-8")
					: undefined,
			};
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async listVersions(functionName: string, marker?: string) {
		try {
			const response = await this.client.send(
				new ListVersionsByFunctionCommand({
					FunctionName: functionName,
					...(marker && { Marker: marker }),
				}),
			);
			const versions = (response.Versions ?? []).map((v) => ({
				version: v.Version ?? "",
				functionArn: v.FunctionArn ?? "",
				description: v.Description,
				lastModified: v.LastModified,
				runtime: v.Runtime,
			}));
			return { versions, nextMarker: response.NextMarker };
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async listAliases(functionName: string, marker?: string) {
		try {
			const response = await this.client.send(
				new ListAliasesCommand({
					FunctionName: functionName,
					...(marker && { Marker: marker }),
				}),
			);
			const aliases = (response.Aliases ?? []).map((a) => ({
				name: a.Name ?? "",
				aliasArn: a.AliasArn ?? "",
				functionVersion: a.FunctionVersion ?? "",
				description: a.Description,
			}));
			return { aliases, nextMarker: response.NextMarker };
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async getFunctionTriggers(functionName: string, marker?: string) {
		// Combine event source mappings + resource-based policy triggers (S3, SNS, etc.)
		const [eventSourceMappings, policyTriggers] = await Promise.all([
			this.listEventSourceMappings(functionName, marker),
			this.getResourcePolicyTriggers(functionName),
		]);
		return {
			eventSourceMappings: eventSourceMappings?.eventSourceMappings ?? [],
			policyTriggers,
			nextMarker: eventSourceMappings?.nextMarker,
		};
	}

	private async getResourcePolicyTriggers(functionName: string) {
		try {
			const response = await this.client.send(
				new GetPolicyCommand({ FunctionName: functionName }),
			);
			if (!response.Policy) return [];
			const policy = JSON.parse(response.Policy) as {
				Statement?: Array<{
					Sid?: string;
					Effect?: string;
					Principal?: { Service?: string };
					Action?: string;
					Condition?: {
						ArnLike?: Record<string, string>;
					};
				}>;
			};
			return (policy.Statement ?? [])
				.filter(
					(stmt) =>
						stmt.Effect === "Allow" &&
						stmt.Action === "lambda:InvokeFunction" &&
						stmt.Principal?.Service,
				)
				.map((stmt) => {
					const service = stmt.Principal!.Service!;
					const sourceArn =
						stmt.Condition?.ArnLike?.["AWS:SourceArn"] ??
						stmt.Condition?.ArnLike?.["aws:SourceArn"];
					return {
						sid: stmt.Sid ?? "",
						service,
						sourceArn,
					};
				});
		} catch (err) {
			const error = err as Error & { name: string };
			// No policy means no resource-based triggers
			if (error.name === "ResourceNotFoundException") return [];
			throw error;
		}
	}

	async listEventSourceMappings(functionName: string, marker?: string) {
		try {
			const response = await this.client.send(
				new ListEventSourceMappingsCommand({
					FunctionName: functionName,
					...(marker && { Marker: marker }),
				}),
			);
			const eventSourceMappings = (
				response.EventSourceMappings ?? []
			).map((m) => ({
				uuid: m.UUID ?? "",
				eventSourceArn: m.EventSourceArn,
				functionArn: m.FunctionArn,
				state: m.State,
				batchSize: m.BatchSize,
				lastModified: m.LastModified?.toISOString(),
				maximumBatchingWindowInSeconds: m.MaximumBatchingWindowInSeconds,
				startingPosition: m.StartingPosition,
				enabled: m.State === "Enabled" || m.State === "Creating",
			}));
			return { eventSourceMappings, nextMarker: response.NextMarker };
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async createEventSourceMapping(
		functionName: string,
		params: {
			eventSourceArn: string;
			batchSize?: number;
			maximumBatchingWindowInSeconds?: number;
			startingPosition?: string;
			enabled?: boolean;
		},
	) {
		try {
			const response = await this.client.send(
				new CreateEventSourceMappingCommand({
					FunctionName: functionName,
					EventSourceArn: params.eventSourceArn,
					...(params.batchSize && { BatchSize: params.batchSize }),
					...(params.maximumBatchingWindowInSeconds !== undefined && {
						MaximumBatchingWindowInSeconds:
							params.maximumBatchingWindowInSeconds,
					}),
					...(params.startingPosition && {
						StartingPosition: params.startingPosition as EventSourcePosition,
					}),
					...(params.enabled !== undefined && {
						Enabled: params.enabled,
					}),
				}),
			);
			return {
				message: `Event source mapping created successfully`,
				uuid: response.UUID ?? "",
			};
		} catch (err) {
			mapLambdaError(err, functionName);
		}
	}

	async deleteEventSourceMapping(uuid: string) {
		try {
			await this.client.send(
				new DeleteEventSourceMappingCommand({ UUID: uuid }),
			);
			return { success: true };
		} catch (err) {
			const error = err as Error & { name: string };
			if (error.name === "ResourceNotFoundException") {
				throw new AppError(
					`Event source mapping '${uuid}' not found`,
					404,
					"EVENT_SOURCE_MAPPING_NOT_FOUND",
				);
			}
			throw error;
		}
	}
}
