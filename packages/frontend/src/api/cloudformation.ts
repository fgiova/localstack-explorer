import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Stack {
	stackId?: string;
	stackName: string;
	status: string;
	creationTime?: string;
	lastUpdatedTime?: string;
	description?: string;
}

interface StackDetail extends Stack {
	outputs: { outputKey?: string; outputValue?: string; description?: string }[];
	parameters: { parameterKey?: string; parameterValue?: string }[];
	resources: {
		logicalResourceId?: string;
		physicalResourceId?: string;
		resourceType?: string;
		resourceStatus?: string;
	}[];
}

interface StackListResponse {
	stacks: Stack[];
}

interface StackEvent {
	eventId?: string;
	logicalResourceId?: string;
	resourceType?: string;
	resourceStatus?: string;
	timestamp?: string;
	resourceStatusReason?: string;
}

interface StackEventsResponse {
	events: StackEvent[];
}

interface TemplateResponse {
	templateBody: string;
}

export function useListStacks(refetchInterval?: number | false) {
	return useQuery({
		queryKey: ["cloudformation", "stacks"],
		queryFn: () => apiClient.get<StackListResponse>("/cloudformation"),
		refetchInterval,
	});
}

export function useGetStack(stackName: string) {
	return useQuery({
		queryKey: ["cloudformation", "stack", stackName],
		queryFn: () => apiClient.get<StackDetail>(`/cloudformation/${stackName}`),
		enabled: !!stackName,
	});
}

export function useGetStackEvents(stackName: string) {
	return useQuery({
		queryKey: ["cloudformation", "events", stackName],
		queryFn: () =>
			apiClient.get<StackEventsResponse>(`/cloudformation/${stackName}/events`),
		enabled: !!stackName,
	});
}

export function useGetTemplate(stackName: string) {
	return useQuery({
		queryKey: ["cloudformation", "template", stackName],
		queryFn: () =>
			apiClient.get<TemplateResponse>(`/cloudformation/${stackName}/template`),
		enabled: !!stackName,
	});
}

export function useCreateStack() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			stackName: string;
			templateBody?: string;
			templateURL?: string;
			parameters?: { parameterKey: string; parameterValue: string }[];
		}) => apiClient.post("/cloudformation", body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cloudformation", "stacks"] });
		},
	});
}

export function useUpdateStack() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			stackName: string;
			templateBody?: string;
			templateURL?: string;
			parameters?: { parameterKey: string; parameterValue: string }[];
		}) => apiClient.put(`/cloudformation/${body.stackName}`, body),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["cloudformation", "stacks"] });
			queryClient.invalidateQueries({
				queryKey: ["cloudformation", "stack", variables.stackName],
			});
		},
	});
}

export function useDeleteStack() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (stackName: string) =>
			apiClient.delete(`/cloudformation/${stackName}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cloudformation", "stacks"] });
		},
	});
}
