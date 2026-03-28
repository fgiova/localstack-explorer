import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// --- Interfaces ---

interface Topic {
  topicArn: string;
  name: string;
}

interface ListTopicsResponse {
  topics: Topic[];
}

interface TopicDetail {
  topicArn: string;
  displayName?: string;
  owner?: string;
  policy?: string;
  deliveryPolicy?: string;
  effectiveDeliveryPolicy?: string;
  subscriptionsConfirmed?: number;
  subscriptionsPending?: number;
  subscriptionsDeleted?: number;
}

interface TopicDetailResponse {
  topic: TopicDetail;
}

interface Subscription {
  subscriptionArn: string;
  topicArn: string;
  protocol: string;
  endpoint: string;
}

interface SubscriptionListResponse {
  subscriptions: Subscription[];
}

interface SubscriptionDetail {
  subscriptionArn: string;
  topicArn: string;
  protocol: string;
  endpoint: string;
  owner?: string;
  filterPolicy?: string;
  filterPolicyScope?: string;
  rawMessageDelivery?: boolean;
  confirmationWasAuthenticated?: boolean;
  deliveryPolicy?: string;
  effectiveDeliveryPolicy?: string;
  pendingConfirmation?: boolean;
}

interface SubscriptionDetailResponse {
  subscription: SubscriptionDetail;
}

interface Tag {
  key: string;
  value: string;
}

interface TagListResponse {
  tags: Tag[];
}

interface MessageAttribute {
  dataType: string;
  stringValue: string;
}

interface PublishMessageRequest {
  message: string;
  subject?: string;
  messageAttributes?: Record<string, MessageAttribute>;
  targetArn?: string;
}

interface PublishResponse {
  messageId: string;
}

interface PublishBatchEntry {
  id: string;
  message: string;
  subject?: string;
  messageAttributes?: Record<string, MessageAttribute>;
}

interface PublishBatchRequest {
  entries: PublishBatchEntry[];
}

interface PublishBatchResponse {
  successful: Array<{ id: string; messageId: string }>;
  failed: Array<{ id: string; code: string; message?: string; senderFault?: boolean }>;
}

interface CreateTopicRequest {
  name: string;
}

interface CreateSubscriptionRequest {
  protocol: string;
  endpoint: string;
  rawMessageDelivery?: boolean;
  filterPolicy?: string | Record<string, unknown>;
}

interface SetAttributeRequest {
  attributeName: string;
  attributeValue: string;
}

interface SetFilterPolicyRequest {
  filterPolicy: string | Record<string, unknown>;
}

interface AddTagsRequest {
  tags: Tag[];
}

interface RemoveTagsRequest {
  tagKeys: string[];
}

interface MessageResponse {
  message: string;
}

interface DeleteResponse {
  success: boolean;
}

// --- Query hooks ---

export function useListTopics() {
  return useQuery({
    queryKey: ["sns", "topics"],
    queryFn: () => apiClient.get<ListTopicsResponse>("/sns"),
  });
}

export function useTopicAttributes(topicName: string) {
  return useQuery({
    queryKey: ["sns", "topic", topicName, "attributes"],
    queryFn: () => apiClient.get<TopicDetailResponse>(`/sns/${topicName}/attributes`),
    enabled: !!topicName,
  });
}

export function useTopicSubscriptions(topicName: string) {
  return useQuery({
    queryKey: ["sns", "topic", topicName, "subscriptions"],
    queryFn: () => apiClient.get<SubscriptionListResponse>(`/sns/${topicName}/subscriptions`),
    enabled: !!topicName,
  });
}

export function useSubscriptionAttributes(subscriptionArn: string) {
  return useQuery({
    queryKey: ["sns", "subscription", subscriptionArn, "attributes"],
    queryFn: () =>
      apiClient.get<SubscriptionDetailResponse>(
        `/sns/subscriptions/${encodeURIComponent(subscriptionArn)}/attributes`
      ),
    enabled: !!subscriptionArn,
  });
}

export function useTopicTags(topicName: string) {
  return useQuery({
    queryKey: ["sns", "topic", topicName, "tags"],
    queryFn: () => apiClient.get<TagListResponse>(`/sns/${topicName}/tags`),
    enabled: !!topicName,
  });
}

// --- Mutation hooks ---

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTopicRequest) =>
      apiClient.post<MessageResponse>("/sns", request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topics"] });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topicName: string) =>
      apiClient.delete<DeleteResponse>(`/sns/${topicName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topics"] });
    },
  });
}

export function useSetTopicAttribute(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SetAttributeRequest) =>
      apiClient.put<DeleteResponse>(`/sns/${topicName}/attributes`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "attributes"] });
    },
  });
}

export function useCreateSubscription(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateSubscriptionRequest) =>
      apiClient.post<MessageResponse>(`/sns/${topicName}/subscriptions`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "subscriptions"] });
    },
  });
}

export function useDeleteSubscription(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionArn: string) =>
      apiClient.delete<DeleteResponse>(
        `/sns/subscriptions/${encodeURIComponent(subscriptionArn)}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "subscriptions"] });
    },
  });
}

export function useSetFilterPolicy(subscriptionArn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SetFilterPolicyRequest) =>
      apiClient.put<DeleteResponse>(
        `/sns/subscriptions/${encodeURIComponent(subscriptionArn)}/filter-policy`,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sns", "subscription", subscriptionArn, "attributes"],
      });
    },
  });
}

export function usePublishMessage(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublishMessageRequest) =>
      apiClient.post<PublishResponse>(`/sns/${topicName}/publish`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "attributes"] });
    },
  });
}

export function usePublishBatch(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublishBatchRequest) =>
      apiClient.post<PublishBatchResponse>(`/sns/${topicName}/publish-batch`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "attributes"] });
    },
  });
}

export function useAddTags(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AddTagsRequest) =>
      apiClient.post<DeleteResponse>(`/sns/${topicName}/tags`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "tags"] });
    },
  });
}

export function useRemoveTags(topicName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: RemoveTagsRequest): Promise<DeleteResponse> => {
      // apiClient.delete does not support a request body, so we use fetch directly
      const response = await fetch(`/api/sns/${topicName}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(body.message ?? "Request failed");
      }
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sns", "topic", topicName, "tags"] });
    },
  });
}

// --- Export types ---

export type {
  Topic,
  ListTopicsResponse,
  TopicDetail,
  TopicDetailResponse,
  Subscription,
  SubscriptionListResponse,
  SubscriptionDetail,
  SubscriptionDetailResponse,
  Tag,
  TagListResponse,
  MessageAttribute,
  PublishMessageRequest,
  PublishResponse,
  PublishBatchEntry,
  PublishBatchRequest,
  PublishBatchResponse,
  CreateTopicRequest,
  CreateSubscriptionRequest,
  SetAttributeRequest,
  SetFilterPolicyRequest,
  AddTagsRequest,
  RemoveTagsRequest,
  MessageResponse,
  DeleteResponse,
};
