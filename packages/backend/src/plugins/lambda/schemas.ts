import Type, { type Static } from "typebox";

export const FunctionSummarySchema = Type.Object({
	functionName: Type.String(),
	functionArn: Type.String(),
	runtime: Type.Optional(Type.String()),
	handler: Type.Optional(Type.String()),
	codeSize: Type.Number(),
	lastModified: Type.Optional(Type.String()),
	memorySize: Type.Optional(Type.Number()),
	timeout: Type.Optional(Type.Number()),
	state: Type.Optional(Type.String()),
});
export type FunctionSummary = Static<typeof FunctionSummarySchema>;

export const ListFunctionsResponseSchema = Type.Object({
	functions: Type.Array(FunctionSummarySchema),
	nextMarker: Type.Optional(Type.String()),
});

export const EnvironmentVariableSchema = Type.Record(
	Type.String(),
	Type.String(),
);

export const LayerSchema = Type.Object({
	arn: Type.String(),
	codeSize: Type.Number(),
});

export const FunctionDetailSchema = Type.Object({
	functionName: Type.String(),
	functionArn: Type.String(),
	runtime: Type.Optional(Type.String()),
	handler: Type.Optional(Type.String()),
	role: Type.String(),
	codeSize: Type.Number(),
	description: Type.Optional(Type.String()),
	timeout: Type.Optional(Type.Number()),
	memorySize: Type.Optional(Type.Number()),
	lastModified: Type.Optional(Type.String()),
	codeSha256: Type.Optional(Type.String()),
	version: Type.Optional(Type.String()),
	state: Type.Optional(Type.String()),
	stateReason: Type.Optional(Type.String()),
	environment: Type.Optional(EnvironmentVariableSchema),
	architectures: Type.Optional(Type.Array(Type.String())),
	layers: Type.Optional(Type.Array(LayerSchema)),
	packageType: Type.Optional(Type.String()),
});
export type FunctionDetail = Static<typeof FunctionDetailSchema>;

export const FunctionNameParamsSchema = Type.Object({
	functionName: Type.String(),
});

export const CreateFunctionBodySchema = Type.Object({
	functionName: Type.String({ minLength: 1 }),
	runtime: Type.String({ minLength: 1 }),
	handler: Type.String({ minLength: 1 }),
	role: Type.String({ minLength: 1 }),
	code: Type.Object({
		zipFile: Type.Optional(Type.String({ description: "Base64-encoded zip" })),
		s3Bucket: Type.Optional(Type.String()),
		s3Key: Type.Optional(Type.String()),
	}),
	description: Type.Optional(Type.String()),
	timeout: Type.Optional(Type.Integer({ minimum: 1, maximum: 900 })),
	memorySize: Type.Optional(
		Type.Integer({ minimum: 128, maximum: 10240 }),
	),
	environment: Type.Optional(EnvironmentVariableSchema),
	architectures: Type.Optional(Type.Array(Type.String())),
});
export type CreateFunctionBody = Static<typeof CreateFunctionBodySchema>;

export const UpdateFunctionCodeBodySchema = Type.Object({
	zipFile: Type.Optional(Type.String({ description: "Base64-encoded zip" })),
	s3Bucket: Type.Optional(Type.String()),
	s3Key: Type.Optional(Type.String()),
});
export type UpdateFunctionCodeBody = Static<
	typeof UpdateFunctionCodeBodySchema
>;

export const UpdateFunctionConfigBodySchema = Type.Object({
	handler: Type.Optional(Type.String()),
	runtime: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	timeout: Type.Optional(Type.Integer({ minimum: 1, maximum: 900 })),
	memorySize: Type.Optional(
		Type.Integer({ minimum: 128, maximum: 10240 }),
	),
	environment: Type.Optional(EnvironmentVariableSchema),
	role: Type.Optional(Type.String()),
});
export type UpdateFunctionConfigBody = Static<
	typeof UpdateFunctionConfigBodySchema
>;

export const InvokeFunctionBodySchema = Type.Object({
	payload: Type.Optional(Type.String()),
	invocationType: Type.Optional(
		Type.Union([
			Type.Literal("RequestResponse"),
			Type.Literal("Event"),
			Type.Literal("DryRun"),
		]),
	),
});
export type InvokeFunctionBody = Static<typeof InvokeFunctionBodySchema>;

export const InvokeFunctionResponseSchema = Type.Object({
	statusCode: Type.Number(),
	payload: Type.Optional(Type.String()),
	functionError: Type.Optional(Type.String()),
	logResult: Type.Optional(Type.String()),
});

export const VersionSchema = Type.Object({
	version: Type.String(),
	functionArn: Type.String(),
	description: Type.Optional(Type.String()),
	lastModified: Type.Optional(Type.String()),
	runtime: Type.Optional(Type.String()),
});

export const ListVersionsResponseSchema = Type.Object({
	versions: Type.Array(VersionSchema),
	nextMarker: Type.Optional(Type.String()),
});

export const AliasSchema = Type.Object({
	name: Type.String(),
	aliasArn: Type.String(),
	functionVersion: Type.String(),
	description: Type.Optional(Type.String()),
});

export const ListAliasesResponseSchema = Type.Object({
	aliases: Type.Array(AliasSchema),
	nextMarker: Type.Optional(Type.String()),
});

export const EventSourceMappingSchema = Type.Object({
	uuid: Type.String(),
	eventSourceArn: Type.Optional(Type.String()),
	functionArn: Type.Optional(Type.String()),
	state: Type.Optional(Type.String()),
	batchSize: Type.Optional(Type.Number()),
	lastModified: Type.Optional(Type.String()),
	maximumBatchingWindowInSeconds: Type.Optional(Type.Number()),
	startingPosition: Type.Optional(Type.String()),
	enabled: Type.Optional(Type.Boolean()),
});
export type EventSourceMapping = Static<typeof EventSourceMappingSchema>;

export const ListEventSourceMappingsResponseSchema = Type.Object({
	eventSourceMappings: Type.Array(EventSourceMappingSchema),
	nextMarker: Type.Optional(Type.String()),
});

export const PolicyTriggerSchema = Type.Object({
	sid: Type.String(),
	service: Type.String(),
	sourceArn: Type.Optional(Type.String()),
});

export const FunctionTriggersResponseSchema = Type.Object({
	eventSourceMappings: Type.Array(EventSourceMappingSchema),
	policyTriggers: Type.Array(PolicyTriggerSchema),
	nextMarker: Type.Optional(Type.String()),
});

export const CreateEventSourceMappingBodySchema = Type.Object({
	eventSourceArn: Type.String({ minLength: 1 }),
	batchSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 10000 })),
	maximumBatchingWindowInSeconds: Type.Optional(
		Type.Integer({ minimum: 0, maximum: 300 }),
	),
	startingPosition: Type.Optional(Type.String()),
	enabled: Type.Optional(Type.Boolean()),
});
export type CreateEventSourceMappingBody = Static<
	typeof CreateEventSourceMappingBodySchema
>;

export const EventSourceMappingParamsSchema = Type.Object({
	uuid: Type.String(),
});

export const MessageResponseSchema = Type.Object({
	message: Type.String(),
});

export const CreateEventSourceMappingResponseSchema = Type.Object({
	message: Type.String(),
	uuid: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
	success: Type.Boolean(),
});
