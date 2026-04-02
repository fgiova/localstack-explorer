import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// --- Interfaces ---

export interface LambdaFunction {
	functionName: string;
	functionArn: string;
	runtime: string;
	handler: string;
	role: string;
	description?: string;
	timeout: number;
	memorySize: number;
	codeSize: number;
	lastModified: string;
	state?: string;
	packageType?: string;
	architectures?: string[];
	codeSha256?: string;
	environment?: {
		variables?: Record<string, string>;
	};
}

interface ListFunctionsResponse {
	functions: LambdaFunction[];
}

interface FunctionVersion {
	version: string;
	functionArn: string;
	runtime: string;
	lastModified: string;
	description?: string;
}

interface ListVersionsResponse {
	versions: FunctionVersion[];
}

interface FunctionAlias {
	name: string;
	aliasArn: string;
	functionVersion: string;
	description?: string;
}

interface ListAliasesResponse {
	aliases: FunctionAlias[];
}

interface CreateFunctionRequest {
	functionName: string;
	runtime: string;
	handler: string;
	role: string;
	memorySize?: number;
	timeout?: number;
	zipFile: string;
}

interface UpdateFunctionCodeRequest {
	functionName: string;
	zipFile: string;
}

interface UpdateFunctionConfigRequest {
	functionName: string;
	runtime?: string;
	handler?: string;
	role?: string;
	memorySize?: number;
	timeout?: number;
	description?: string;
}

interface InvokeFunctionRequest {
	functionName: string;
	payload?: string;
	invocationType?: "RequestResponse" | "Event" | "DryRun";
}

export interface InvokeFunctionResponse {
	statusCode: number;
	payload?: string;
	functionError?: string;
	logResult?: string;
}

// --- Query hooks ---

export function useListFunctions() {
	return useQuery({
		queryKey: ["lambda", "functions"],
		queryFn: () => apiClient.get<ListFunctionsResponse>("/lambda"),
	});
}

export function useGetFunction(functionName: string) {
	return useQuery({
		queryKey: ["lambda", "function", functionName],
		queryFn: () =>
			apiClient.get<LambdaFunction>(`/lambda/${functionName}`),
		enabled: !!functionName,
	});
}

export function useListVersions(functionName: string) {
	return useQuery({
		queryKey: ["lambda", "versions", functionName],
		queryFn: () =>
			apiClient.get<ListVersionsResponse>(`/lambda/${functionName}/versions`),
		enabled: !!functionName,
	});
}

export function useListAliases(functionName: string) {
	return useQuery({
		queryKey: ["lambda", "aliases", functionName],
		queryFn: () =>
			apiClient.get<ListAliasesResponse>(`/lambda/${functionName}/aliases`),
		enabled: !!functionName,
	});
}

// --- Mutation hooks ---

export function useCreateFunction() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: CreateFunctionRequest) =>
			apiClient.post<LambdaFunction>("/lambda", request),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["lambda", "functions"] });
		},
	});
}

export function useUpdateFunctionCode() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ functionName, ...body }: UpdateFunctionCodeRequest) =>
			apiClient.put<LambdaFunction>(`/lambda/${functionName}/code`, body),
		onSuccess: (_data, { functionName }) => {
			queryClient.invalidateQueries({
				queryKey: ["lambda", "function", functionName],
			});
			queryClient.invalidateQueries({ queryKey: ["lambda", "functions"] });
		},
	});
}

export function useUpdateFunctionConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ functionName, ...body }: UpdateFunctionConfigRequest) =>
			apiClient.put<LambdaFunction>(`/lambda/${functionName}/config`, body),
		onSuccess: (_data, { functionName }) => {
			queryClient.invalidateQueries({
				queryKey: ["lambda", "function", functionName],
			});
			queryClient.invalidateQueries({ queryKey: ["lambda", "functions"] });
		},
	});
}

export function useDeleteFunction() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (functionName: string) =>
			apiClient.delete<{ success: boolean }>(`/lambda/${functionName}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["lambda", "functions"] });
		},
	});
}

export function useInvokeFunction() {
	return useMutation({
		mutationFn: ({ functionName, ...body }: InvokeFunctionRequest) =>
			apiClient.post<InvokeFunctionResponse>(
				`/lambda/${functionName}/invoke`,
				body,
			),
	});
}
