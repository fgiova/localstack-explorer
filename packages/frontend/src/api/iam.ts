import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// --- Interfaces ---

interface User {
	userName: string;
	userId: string;
	arn: string;
	createDate?: string;
	path?: string;
}

interface ListUsersResponse {
	users: User[];
}

interface AccessKey {
	accessKeyId: string;
	status: string;
	createDate?: string;
	userName: string;
}

interface ListAccessKeysResponse {
	accessKeys: AccessKey[];
}

interface CreateAccessKeyResponse {
	accessKeyId: string;
	secretAccessKey: string;
	status: string;
	userName: string;
	createDate?: string;
}

interface InlinePolicyNamesResponse {
	policyNames: string[];
}

interface InlinePolicyDetail {
	policyName: string;
	policyDocument: string;
}

interface AttachedPolicy {
	policyName: string;
	policyArn: string;
}

interface AttachedPolicyListResponse {
	attachedPolicies: AttachedPolicy[];
}

interface ManagedPolicy {
	policyName: string;
	policyId: string;
	arn: string;
	attachmentCount?: number;
	createDate?: string;
	defaultVersionId?: string;
	description?: string;
}

interface ManagedPolicyListResponse {
	policies: ManagedPolicy[];
}

interface ManagedPolicyDetail extends ManagedPolicy {
	policyDocument?: string;
}

interface PolicyVersion {
	versionId: string;
	isDefaultVersion: boolean;
	createDate?: string;
	document?: string;
}

interface PolicyVersionListResponse {
	versions: PolicyVersion[];
}

interface Group {
	groupName: string;
	groupId: string;
	arn: string;
	createDate?: string;
	path?: string;
}

interface ListGroupsResponse {
	groups: Group[];
}

interface GroupMember {
	userName: string;
	userId: string;
	arn: string;
}

interface GroupDetailResponse {
	group: Group;
	members: GroupMember[];
}

interface MessageResponse {
	message: string;
}

interface DeleteResponse {
	success: boolean;
}

// --- Query hooks ---

// Users

export function useListUsers() {
	return useQuery({
		queryKey: ["iam", "users"],
		queryFn: () => apiClient.get<ListUsersResponse>("/iam/users"),
	});
}

export function useGetUser(userName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName],
		queryFn: () => apiClient.get<User>(`/iam/users/${userName}`),
		enabled: !!userName,
	});
}

export function useListAccessKeys(userName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName, "access-keys"],
		queryFn: () =>
			apiClient.get<ListAccessKeysResponse>(
				`/iam/users/${userName}/access-keys`,
			),
		enabled: !!userName,
	});
}

export function useListUserInlinePolicies(userName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName, "inline-policies"],
		queryFn: () =>
			apiClient.get<InlinePolicyNamesResponse>(
				`/iam/users/${userName}/inline-policies`,
			),
		enabled: !!userName,
	});
}

export function useGetUserInlinePolicy(userName: string, policyName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName, "inline-policies", policyName],
		queryFn: () =>
			apiClient.get<InlinePolicyDetail>(
				`/iam/users/${userName}/inline-policies/${policyName}`,
			),
		enabled: !!userName && !!policyName,
	});
}

export function useListAttachedUserPolicies(userName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName, "attached-policies"],
		queryFn: () =>
			apiClient.get<AttachedPolicyListResponse>(
				`/iam/users/${userName}/attached-policies`,
			),
		enabled: !!userName,
	});
}

export function useListUserGroups(userName: string) {
	return useQuery({
		queryKey: ["iam", "users", userName, "groups"],
		queryFn: () =>
			apiClient.get<ListGroupsResponse>(`/iam/users/${userName}/groups`),
		enabled: !!userName,
	});
}

// Groups

export function useListGroups() {
	return useQuery({
		queryKey: ["iam", "groups"],
		queryFn: () => apiClient.get<ListGroupsResponse>("/iam/groups"),
	});
}

export function useGetGroup(groupName: string) {
	return useQuery({
		queryKey: ["iam", "groups", groupName],
		queryFn: () =>
			apiClient.get<GroupDetailResponse>(`/iam/groups/${groupName}`),
		enabled: !!groupName,
	});
}

export function useListGroupInlinePolicies(groupName: string) {
	return useQuery({
		queryKey: ["iam", "groups", groupName, "inline-policies"],
		queryFn: () =>
			apiClient.get<InlinePolicyNamesResponse>(
				`/iam/groups/${groupName}/inline-policies`,
			),
		enabled: !!groupName,
	});
}

export function useGetGroupInlinePolicy(groupName: string, policyName: string) {
	return useQuery({
		queryKey: ["iam", "groups", groupName, "inline-policies", policyName],
		queryFn: () =>
			apiClient.get<InlinePolicyDetail>(
				`/iam/groups/${groupName}/inline-policies/${policyName}`,
			),
		enabled: !!groupName && !!policyName,
	});
}

export function useListAttachedGroupPolicies(groupName: string) {
	return useQuery({
		queryKey: ["iam", "groups", groupName, "attached-policies"],
		queryFn: () =>
			apiClient.get<AttachedPolicyListResponse>(
				`/iam/groups/${groupName}/attached-policies`,
			),
		enabled: !!groupName,
	});
}

// Policies

export function useListPolicies(scope?: string) {
	return useQuery({
		queryKey: ["iam", "policies", scope ?? "Local"],
		queryFn: () =>
			apiClient.get<ManagedPolicyListResponse>("/iam/policies", {
				scope: scope ?? "Local",
			}),
	});
}

export function useGetPolicy(policyArn: string) {
	return useQuery({
		queryKey: ["iam", "policies", policyArn],
		queryFn: () =>
			apiClient.get<ManagedPolicyDetail>(
				`/iam/policies/${encodeURIComponent(policyArn)}`,
			),
		enabled: !!policyArn,
	});
}

export function useListPolicyVersions(policyArn: string) {
	return useQuery({
		queryKey: ["iam", "policies", policyArn, "versions"],
		queryFn: () =>
			apiClient.get<PolicyVersionListResponse>(
				`/iam/policies/${encodeURIComponent(policyArn)}/versions`,
			),
		enabled: !!policyArn,
	});
}

export function useGetPolicyVersion(policyArn: string, versionId: string) {
	return useQuery({
		queryKey: ["iam", "policies", policyArn, "versions", versionId],
		queryFn: () =>
			apiClient.get<PolicyVersion>(
				`/iam/policies/${encodeURIComponent(policyArn)}/versions/${versionId}`,
			),
		enabled: !!policyArn && !!versionId,
	});
}

export function useGetPolicyDocument(policyArn: string, versionId?: string) {
	return useQuery({
		queryKey: ["iam", "policies", policyArn, "document", versionId],
		queryFn: () =>
			apiClient.get<InlinePolicyDetail>(
				`/iam/policies/${encodeURIComponent(policyArn)}/document${versionId ? `?versionId=${versionId}` : ""}`,
			),
		enabled: !!policyArn,
	});
}

// --- Mutation hooks ---

// User mutations

export function useCreateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userName: string; path?: string }) =>
			apiClient.post<MessageResponse>("/iam/users", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "users"] });
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userName: string) =>
			apiClient.delete<DeleteResponse>(`/iam/users/${userName}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "users"] });
		},
	});
}

export function useCreateAccessKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userName: string) =>
			apiClient.post<CreateAccessKeyResponse>(
				`/iam/users/${userName}/access-keys`,
			),
		onSuccess: (_data, userName) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", userName, "access-keys"],
			});
		},
	});
}

export function useDeleteAccessKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userName: string; accessKeyId: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/users/${data.userName}/access-keys/${data.accessKeyId}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "access-keys"],
			});
		},
	});
}

export function useUpdateAccessKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			userName: string;
			accessKeyId: string;
			status: string;
		}) =>
			apiClient.put<MessageResponse>(
				`/iam/users/${data.userName}/access-keys/${data.accessKeyId}`,
				{ status: data.status },
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "access-keys"],
			});
		},
	});
}

export function usePutUserInlinePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			userName: string;
			policyName: string;
			policyDocument: string;
		}) =>
			apiClient.put<MessageResponse>(
				`/iam/users/${data.userName}/inline-policies/${data.policyName}`,
				{ policyDocument: data.policyDocument },
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "inline-policies"],
			});
		},
	});
}

export function useDeleteUserInlinePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userName: string; policyName: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/users/${data.userName}/inline-policies/${data.policyName}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "inline-policies"],
			});
		},
	});
}

export function useAttachUserPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userName: string; policyArn: string }) =>
			apiClient.post<MessageResponse>(
				`/iam/users/${data.userName}/attached-policies`,
				{ policyArn: data.policyArn },
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "attached-policies"],
			});
		},
	});
}

export function useDetachUserPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userName: string; policyArn: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/users/${data.userName}/attached-policies/${encodeURIComponent(data.policyArn)}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "attached-policies"],
			});
		},
	});
}

// Group mutations

export function useCreateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; path?: string }) =>
			apiClient.post<MessageResponse>("/iam/groups", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "groups"] });
		},
	});
}

export function useDeleteGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (groupName: string) =>
			apiClient.delete<DeleteResponse>(`/iam/groups/${groupName}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "groups"] });
		},
	});
}

export function useAddUserToGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; userName: string }) =>
			apiClient.post<MessageResponse>(`/iam/groups/${data.groupName}/members`, {
				userName: data.userName,
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName],
			});
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "groups"],
			});
		},
	});
}

export function useRemoveUserFromGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; userName: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/groups/${data.groupName}/members/${data.userName}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName],
			});
			queryClient.invalidateQueries({
				queryKey: ["iam", "users", variables.userName, "groups"],
			});
		},
	});
}

export function usePutGroupInlinePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			groupName: string;
			policyName: string;
			policyDocument: string;
		}) =>
			apiClient.put<MessageResponse>(
				`/iam/groups/${data.groupName}/inline-policies/${data.policyName}`,
				{ policyDocument: data.policyDocument },
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName, "inline-policies"],
			});
		},
	});
}

export function useDeleteGroupInlinePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; policyName: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/groups/${data.groupName}/inline-policies/${data.policyName}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName, "inline-policies"],
			});
		},
	});
}

export function useAttachGroupPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; policyArn: string }) =>
			apiClient.post<MessageResponse>(
				`/iam/groups/${data.groupName}/attached-policies`,
				{ policyArn: data.policyArn },
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName, "attached-policies"],
			});
		},
	});
}

export function useDetachGroupPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { groupName: string; policyArn: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/groups/${data.groupName}/attached-policies/${encodeURIComponent(data.policyArn)}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "groups", variables.groupName, "attached-policies"],
			});
		},
	});
}

// Policy mutations

export function useCreatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			policyName: string;
			policyDocument: string;
			description?: string;
			path?: string;
		}) => apiClient.post<MessageResponse>("/iam/policies", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "policies"] });
		},
	});
}

export function useDeletePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (policyArn: string) =>
			apiClient.delete<DeleteResponse>(
				`/iam/policies/${encodeURIComponent(policyArn)}`,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["iam", "policies"] });
		},
	});
}

export function useCreatePolicyVersion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			policyArn: string;
			policyDocument: string;
			setAsDefault: boolean;
		}) =>
			apiClient.post<MessageResponse>(
				`/iam/policies/${encodeURIComponent(data.policyArn)}/versions`,
				{
					policyDocument: data.policyDocument,
					setAsDefault: data.setAsDefault,
				},
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "policies", variables.policyArn, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["iam", "policies", variables.policyArn],
			});
		},
	});
}

export function useDeletePolicyVersion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { policyArn: string; versionId: string }) =>
			apiClient.delete<DeleteResponse>(
				`/iam/policies/${encodeURIComponent(data.policyArn)}/versions/${data.versionId}`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "policies", variables.policyArn, "versions"],
			});
		},
	});
}

export function useSetDefaultPolicyVersion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { policyArn: string; versionId: string }) =>
			apiClient.put<MessageResponse>(
				`/iam/policies/${encodeURIComponent(data.policyArn)}/versions/${data.versionId}/default`,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["iam", "policies", variables.policyArn, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["iam", "policies", variables.policyArn],
			});
		},
	});
}

// --- Export types ---

export type {
	AccessKey,
	AttachedPolicy,
	AttachedPolicyListResponse,
	CreateAccessKeyResponse,
	DeleteResponse,
	Group,
	GroupDetailResponse,
	GroupMember,
	InlinePolicyDetail,
	InlinePolicyNamesResponse,
	ListAccessKeysResponse,
	ListGroupsResponse,
	ListUsersResponse,
	ManagedPolicy,
	ManagedPolicyDetail,
	ManagedPolicyListResponse,
	MessageResponse,
	PolicyVersion,
	PolicyVersionListResponse,
	User,
};
