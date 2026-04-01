import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// --- Interfaces ---

interface Queue {
	queueUrl: string;
	queueName: string;
}

interface ListQueuesResponse {
	queues: Queue[];
}

interface QueueDetailResponse {
	queueUrl: string;
	queueName: string;
	queueArn?: string;
	approximateNumberOfMessages: number;
	approximateNumberOfMessagesNotVisible: number;
	approximateNumberOfMessagesDelayed: number;
	createdTimestamp?: string;
	lastModifiedTimestamp?: string;
	visibilityTimeout: number;
	maximumMessageSize: number;
	messageRetentionPeriod: number;
	delaySeconds: number;
	receiveMessageWaitTimeSeconds: number;
}

interface MessageAttribute {
	dataType: string;
	stringValue?: string;
	binaryValue?: string;
}

interface Message {
	messageId: string;
	receiptHandle: string;
	body: string;
	attributes?: Record<string, string>;
	messageAttributes?: Record<string, MessageAttribute>;
	md5OfBody?: string;
}

interface ReceiveMessagesOptions {
	maxNumberOfMessages?: number;
	visibilityTimeout?: number;
	waitTimeSeconds?: number;
}

interface ReceiveMessagesResponse {
	messages: Message[];
}

interface CreateQueueRequest {
	name: string;
}

interface SendMessageRequest {
	body: string;
	delaySeconds?: number;
	messageAttributes?: Record<string, MessageAttribute>;
}

interface SendMessageResponse {
	messageId: string;
	md5OfMessageBody: string;
}

interface DeleteMessageRequest {
	receiptHandle: string;
}

// --- Query hooks ---

export function useListQueues() {
	return useQuery({
		queryKey: ["sqs", "queues"],
		queryFn: () => apiClient.get<ListQueuesResponse>("/sqs"),
	});
}

export function useQueueAttributes(queueName: string) {
	return useQuery({
		queryKey: ["sqs", "attributes", queueName],
		queryFn: () =>
			apiClient.get<QueueDetailResponse>(`/sqs/${queueName}/attributes`),
		enabled: !!queueName,
	});
}

export function useReceiveMessages(
	queueName: string,
	options?: ReceiveMessagesOptions,
) {
	const params: Record<string, string> = {};
	if (options?.maxNumberOfMessages !== undefined) {
		params.maxMessages = String(options.maxNumberOfMessages);
	}
	if (options?.visibilityTimeout !== undefined) {
		params.visibilityTimeout = String(options.visibilityTimeout);
	}
	if (options?.waitTimeSeconds !== undefined) {
		params.waitTimeSeconds = String(options.waitTimeSeconds);
	}

	return useQuery({
		queryKey: ["sqs", "messages", queueName, options],
		queryFn: () =>
			apiClient.get<ReceiveMessagesResponse>(
				`/sqs/${queueName}/messages`,
				params,
			),
		enabled: !!queueName,
	});
}

// --- Subscription hooks ---

interface QueueSubscription {
	subscriptionArn: string;
	topicArn: string;
	protocol: string;
	endpoint: string;
}

interface QueueSubscriptionsResponse {
	subscriptions: QueueSubscription[];
}

export function useQueueSubscriptions(queueArn: string) {
	return useQuery({
		queryKey: ["sqs", "subscriptions", queueArn],
		queryFn: () =>
			apiClient.get<QueueSubscriptionsResponse>(
				`/sns/subscriptions/by-endpoint`,
				{ endpoint: queueArn },
			),
		enabled: !!queueArn,
	});
}

// --- Mutation hooks ---

export function useCreateQueue() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: CreateQueueRequest) =>
			apiClient.post<{ message: string }>("/sqs", request),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sqs", "queues"] });
		},
	});
}

export function useDeleteQueue() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (queueName: string) =>
			apiClient.delete<{ success: boolean }>(`/sqs/${queueName}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sqs", "queues"] });
		},
	});
}

export function usePurgeQueue() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (queueName: string) =>
			apiClient.post<{ success: boolean }>(`/sqs/${queueName}/purge`),
		onSuccess: (_data, queueName) => {
			queryClient.invalidateQueries({
				queryKey: ["sqs", "messages", queueName],
			});
			queryClient.invalidateQueries({
				queryKey: ["sqs", "attributes", queueName],
			});
		},
	});
}

export function useSendMessage(queueName: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: SendMessageRequest) =>
			apiClient.post<SendMessageResponse>(
				`/sqs/${queueName}/messages`,
				request,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["sqs", "messages", queueName],
			});
			queryClient.invalidateQueries({
				queryKey: ["sqs", "attributes", queueName],
			});
		},
	});
}

export async function receiveMessagesPoll(
	queueName: string,
	maxMessages: number,
	waitTimeSeconds: number,
	signal?: AbortSignal,
): Promise<ReceiveMessagesResponse> {
	const url = new URL(`/api/sqs/${queueName}/messages`, window.location.origin);
	url.searchParams.set("maxMessages", String(maxMessages));
	url.searchParams.set("waitTimeSeconds", String(waitTimeSeconds));
	const response = await fetch(url.toString(), { signal });
	if (!response.ok) {
		const body = await response
			.json()
			.catch(() => ({ message: "Request failed" }));
		throw new Error(body.message ?? "Request failed");
	}
	return response.json() as Promise<ReceiveMessagesResponse>;
}

export function useDeleteMessage(queueName: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ receiptHandle }: DeleteMessageRequest) =>
			apiClient.delete<{ success: boolean }>(`/sqs/${queueName}/messages`, {
				receiptHandle,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["sqs", "messages", queueName],
			});
			queryClient.invalidateQueries({
				queryKey: ["sqs", "attributes", queueName],
			});
		},
	});
}
