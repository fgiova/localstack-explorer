import {
	AddUserToGroupCommand,
	AttachGroupPolicyCommand,
	AttachUserPolicyCommand,
	CreateAccessKeyCommand,
	CreateGroupCommand,
	CreatePolicyCommand,
	CreatePolicyVersionCommand,
	CreateUserCommand,
	DeleteAccessKeyCommand,
	DeleteGroupCommand,
	DeleteGroupPolicyCommand,
	DeletePolicyCommand,
	DeletePolicyVersionCommand,
	DeleteUserCommand,
	DeleteUserPolicyCommand,
	DetachGroupPolicyCommand,
	DetachUserPolicyCommand,
	GetGroupCommand,
	GetGroupPolicyCommand,
	GetPolicyCommand,
	GetPolicyVersionCommand,
	GetUserCommand,
	GetUserPolicyCommand,
	type IAMClient,
	ListAccessKeysCommand,
	ListAttachedGroupPoliciesCommand,
	ListAttachedUserPoliciesCommand,
	ListEntitiesForPolicyCommand,
	ListGroupPoliciesCommand,
	ListGroupsCommand,
	ListGroupsForUserCommand,
	ListPoliciesCommand,
	ListPolicyVersionsCommand,
	ListUserPoliciesCommand,
	ListUsersCommand,
	PutGroupPolicyCommand,
	PutUserPolicyCommand,
	RemoveUserFromGroupCommand,
	SetDefaultPolicyVersionCommand,
	UpdateAccessKeyCommand,
} from "@aws-sdk/client-iam";
import { AppError } from "../../shared/errors.js";

export class IAMService {
	constructor(private client: IAMClient) {}

	// ── User Operations ──────────────────────────────────────────────

	async listUsers() {
		try {
			const response = await this.client.send(new ListUsersCommand({}));
			const users = (response.Users ?? []).map((user) => ({
				userName: user.UserName ?? "",
				userId: user.UserId ?? "",
				arn: user.Arn ?? "",
				createDate: user.CreateDate?.toISOString() ?? "",
				path: user.Path ?? "/",
			}));
			return { users };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async createUser(userName: string, path?: string) {
		try {
			await this.client.send(
				new CreateUserCommand({
					UserName: userName,
					...(path && { Path: path }),
				}),
			);
			return { message: "User created successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getUser(userName: string) {
		try {
			const response = await this.client.send(
				new GetUserCommand({ UserName: userName }),
			);
			const user = response.User;
			return {
				userName: user?.UserName ?? "",
				userId: user?.UserId ?? "",
				arn: user?.Arn ?? "",
				createDate: user?.CreateDate?.toISOString() ?? "",
				path: user?.Path ?? "/",
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deleteUser(userName: string) {
		try {
			// Clean up access keys
			const accessKeysResponse = await this.client.send(
				new ListAccessKeysCommand({ UserName: userName }),
			);
			for (const key of accessKeysResponse.AccessKeyMetadata ?? []) {
				await this.client.send(
					new DeleteAccessKeyCommand({
						UserName: userName,
						AccessKeyId: key.AccessKeyId,
					}),
				);
			}

			// Clean up inline policies
			const inlinePoliciesResponse = await this.client.send(
				new ListUserPoliciesCommand({ UserName: userName }),
			);
			for (const policyName of inlinePoliciesResponse.PolicyNames ?? []) {
				await this.client.send(
					new DeleteUserPolicyCommand({
						UserName: userName,
						PolicyName: policyName,
					}),
				);
			}

			// Clean up attached managed policies
			const attachedPoliciesResponse = await this.client.send(
				new ListAttachedUserPoliciesCommand({ UserName: userName }),
			);
			for (const policy of attachedPoliciesResponse.AttachedPolicies ?? []) {
				await this.client.send(
					new DetachUserPolicyCommand({
						UserName: userName,
						PolicyArn: policy.PolicyArn,
					}),
				);
			}

			// Remove from all groups
			const groupsResponse = await this.client.send(
				new ListGroupsForUserCommand({ UserName: userName }),
			);
			for (const group of groupsResponse.Groups ?? []) {
				await this.client.send(
					new RemoveUserFromGroupCommand({
						UserName: userName,
						GroupName: group.GroupName,
					}),
				);
			}

			// Delete the user
			await this.client.send(new DeleteUserCommand({ UserName: userName }));
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Access Key Operations ──────────────────────────────────────

	async listAccessKeys(userName: string) {
		try {
			const response = await this.client.send(
				new ListAccessKeysCommand({ UserName: userName }),
			);
			const accessKeys = (response.AccessKeyMetadata ?? []).map((key) => ({
				accessKeyId: key.AccessKeyId ?? "",
				status: key.Status ?? "",
				createDate: key.CreateDate?.toISOString() ?? "",
				userName: key.UserName ?? "",
			}));
			return { accessKeys };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async createAccessKey(userName: string) {
		try {
			const response = await this.client.send(
				new CreateAccessKeyCommand({ UserName: userName }),
			);
			const accessKey = response.AccessKey;
			return {
				accessKeyId: accessKey?.AccessKeyId ?? "",
				secretAccessKey: accessKey?.SecretAccessKey ?? "",
				status: accessKey?.Status ?? "",
				userName: accessKey?.UserName ?? "",
				createDate: accessKey?.CreateDate?.toISOString() ?? "",
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deleteAccessKey(userName: string, accessKeyId: string) {
		try {
			await this.client.send(
				new DeleteAccessKeyCommand({
					UserName: userName,
					AccessKeyId: accessKeyId,
				}),
			);
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async updateAccessKey(
		userName: string,
		accessKeyId: string,
		status: "Active" | "Inactive",
	) {
		try {
			await this.client.send(
				new UpdateAccessKeyCommand({
					UserName: userName,
					AccessKeyId: accessKeyId,
					Status: status,
				}),
			);
			return { message: "Access key updated successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Group Operations ──────────────────────────────────────────────

	async listGroups() {
		try {
			const response = await this.client.send(new ListGroupsCommand({}));
			const groups = (response.Groups ?? []).map((group) => ({
				groupName: group.GroupName ?? "",
				groupId: group.GroupId ?? "",
				arn: group.Arn ?? "",
				createDate: group.CreateDate?.toISOString() ?? "",
				path: group.Path ?? "/",
			}));
			return { groups };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async createGroup(groupName: string, path?: string) {
		try {
			await this.client.send(
				new CreateGroupCommand({
					GroupName: groupName,
					...(path && { Path: path }),
				}),
			);
			return { message: "Group created successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getGroup(groupName: string) {
		try {
			const response = await this.client.send(
				new GetGroupCommand({ GroupName: groupName }),
			);
			const group = response.Group;
			const members = (response.Users ?? []).map((user) => ({
				userName: user.UserName ?? "",
				userId: user.UserId ?? "",
				arn: user.Arn ?? "",
			}));
			return {
				group: {
					groupName: group?.GroupName ?? "",
					groupId: group?.GroupId ?? "",
					arn: group?.Arn ?? "",
					createDate: group?.CreateDate?.toISOString() ?? "",
					path: group?.Path ?? "/",
				},
				members,
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deleteGroup(groupName: string) {
		try {
			// Remove all members from the group
			const groupResponse = await this.client.send(
				new GetGroupCommand({ GroupName: groupName }),
			);
			for (const user of groupResponse.Users ?? []) {
				await this.client.send(
					new RemoveUserFromGroupCommand({
						GroupName: groupName,
						UserName: user.UserName,
					}),
				);
			}

			// Clean up inline policies
			const inlinePoliciesResponse = await this.client.send(
				new ListGroupPoliciesCommand({ GroupName: groupName }),
			);
			for (const policyName of inlinePoliciesResponse.PolicyNames ?? []) {
				await this.client.send(
					new DeleteGroupPolicyCommand({
						GroupName: groupName,
						PolicyName: policyName,
					}),
				);
			}

			// Clean up attached managed policies
			const attachedPoliciesResponse = await this.client.send(
				new ListAttachedGroupPoliciesCommand({ GroupName: groupName }),
			);
			for (const policy of attachedPoliciesResponse.AttachedPolicies ?? []) {
				await this.client.send(
					new DetachGroupPolicyCommand({
						GroupName: groupName,
						PolicyArn: policy.PolicyArn,
					}),
				);
			}

			// Delete the group
			await this.client.send(new DeleteGroupCommand({ GroupName: groupName }));
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async addUserToGroup(groupName: string, userName: string) {
		try {
			await this.client.send(
				new AddUserToGroupCommand({
					GroupName: groupName,
					UserName: userName,
				}),
			);
			return { message: "User added to group" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async removeUserFromGroup(groupName: string, userName: string) {
		try {
			await this.client.send(
				new RemoveUserFromGroupCommand({
					GroupName: groupName,
					UserName: userName,
				}),
			);
			return { message: "User removed from group" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async listGroupsForUser(userName: string) {
		try {
			const response = await this.client.send(
				new ListGroupsForUserCommand({ UserName: userName }),
			);
			const groups = (response.Groups ?? []).map((group) => ({
				groupName: group.GroupName ?? "",
				groupId: group.GroupId ?? "",
				arn: group.Arn ?? "",
			}));
			return { groups };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── User Inline Policy Operations ───────────────────────────────

	async listUserPolicies(userName: string) {
		try {
			const response = await this.client.send(
				new ListUserPoliciesCommand({ UserName: userName }),
			);
			return { policyNames: response.PolicyNames ?? [] };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getUserPolicy(userName: string, policyName: string) {
		try {
			const response = await this.client.send(
				new GetUserPolicyCommand({
					UserName: userName,
					PolicyName: policyName,
				}),
			);
			return {
				policyName: response.PolicyName ?? "",
				policyDocument: decodeURIComponent(response.PolicyDocument ?? ""),
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async putUserPolicy(
		userName: string,
		policyName: string,
		policyDocument: string,
	) {
		try {
			await this.client.send(
				new PutUserPolicyCommand({
					UserName: userName,
					PolicyName: policyName,
					PolicyDocument: policyDocument,
				}),
			);
			return { message: "Policy saved successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deleteUserPolicy(userName: string, policyName: string) {
		try {
			await this.client.send(
				new DeleteUserPolicyCommand({
					UserName: userName,
					PolicyName: policyName,
				}),
			);
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Group Inline Policy Operations ────────────────────────────────

	async listGroupPolicies(groupName: string) {
		try {
			const response = await this.client.send(
				new ListGroupPoliciesCommand({ GroupName: groupName }),
			);
			return { policyNames: response.PolicyNames ?? [] };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getGroupPolicy(groupName: string, policyName: string) {
		try {
			const response = await this.client.send(
				new GetGroupPolicyCommand({
					GroupName: groupName,
					PolicyName: policyName,
				}),
			);
			return {
				policyName: response.PolicyName ?? "",
				policyDocument: decodeURIComponent(response.PolicyDocument ?? ""),
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async putGroupPolicy(
		groupName: string,
		policyName: string,
		policyDocument: string,
	) {
		try {
			await this.client.send(
				new PutGroupPolicyCommand({
					GroupName: groupName,
					PolicyName: policyName,
					PolicyDocument: policyDocument,
				}),
			);
			return { message: "Policy saved successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deleteGroupPolicy(groupName: string, policyName: string) {
		try {
			await this.client.send(
				new DeleteGroupPolicyCommand({
					GroupName: groupName,
					PolicyName: policyName,
				}),
			);
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async listRoles() {
		throw new AppError("IAM listRoles not implemented", 501, "NOT_IMPLEMENTED");
	}

	// ── Managed Policy CRUD ─────────────────────────────────────────

	async listManagedPolicies(scope?: string) {
		try {
			const response = await this.client.send(
				new ListPoliciesCommand({
					Scope: (scope ?? "Local") as "All" | "AWS" | "Local",
				}),
			);
			const policies = (response.Policies ?? []).map((p) => ({
				policyName: p.PolicyName ?? "",
				policyId: p.PolicyId ?? "",
				arn: p.Arn ?? "",
				attachmentCount: p.AttachmentCount ?? 0,
				createDate: p.CreateDate?.toISOString() ?? "",
				defaultVersionId: p.DefaultVersionId ?? "",
				description: p.Description ?? "",
			}));
			return { policies };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getPolicy(policyArn: string) {
		try {
			const response = await this.client.send(
				new GetPolicyCommand({ PolicyArn: policyArn }),
			);
			const p = response.Policy;
			return {
				policyName: p?.PolicyName ?? "",
				policyId: p?.PolicyId ?? "",
				arn: p?.Arn ?? "",
				attachmentCount: p?.AttachmentCount ?? 0,
				createDate: p?.CreateDate?.toISOString() ?? "",
				defaultVersionId: p?.DefaultVersionId ?? "",
				description: p?.Description ?? "",
				path: p?.Path ?? "/",
				isAttachable: p?.IsAttachable ?? true,
				updateDate: p?.UpdateDate?.toISOString() ?? "",
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async getPolicyDocument(policyArn: string, versionId?: string) {
		try {
			let resolvedVersionId = versionId;
			if (!resolvedVersionId) {
				const policyDetail = await this.getPolicy(policyArn);
				resolvedVersionId = policyDetail.defaultVersionId;
			}

			const response = await this.client.send(
				new GetPolicyVersionCommand({
					PolicyArn: policyArn,
					VersionId: resolvedVersionId,
				}),
			);

			const document = response.PolicyVersion?.Document
				? decodeURIComponent(response.PolicyVersion.Document)
				: "";

			return {
				versionId: resolvedVersionId ?? "",
				isDefaultVersion: response.PolicyVersion?.IsDefaultVersion ?? false,
				document,
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async createPolicy(
		policyName: string,
		policyDocument: string,
		description?: string,
		path?: string,
	) {
		try {
			const response = await this.client.send(
				new CreatePolicyCommand({
					PolicyName: policyName,
					PolicyDocument: policyDocument,
					...(description && { Description: description }),
					...(path && { Path: path }),
				}),
			);
			return {
				message: "Policy created successfully",
				arn: response.Policy?.Arn ?? "",
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deletePolicy(policyArn: string) {
		try {
			// List and delete non-default policy versions
			const versionsResponse = await this.client.send(
				new ListPolicyVersionsCommand({ PolicyArn: policyArn }),
			);
			for (const version of versionsResponse.Versions ?? []) {
				if (!version.IsDefaultVersion) {
					await this.client.send(
						new DeletePolicyVersionCommand({
							PolicyArn: policyArn,
							VersionId: version.VersionId,
						}),
					);
				}
			}

			// List all entities with the policy attached and detach
			const entitiesResponse = await this.client.send(
				new ListEntitiesForPolicyCommand({ PolicyArn: policyArn }),
			);

			for (const user of entitiesResponse.PolicyUsers ?? []) {
				await this.client.send(
					new DetachUserPolicyCommand({
						UserName: user.UserName,
						PolicyArn: policyArn,
					}),
				);
			}

			for (const group of entitiesResponse.PolicyGroups ?? []) {
				await this.client.send(
					new DetachGroupPolicyCommand({
						GroupName: group.GroupName,
						PolicyArn: policyArn,
					}),
				);
			}

			// Delete the policy
			await this.client.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Policy Versioning ───────────────────────────────────────────

	async listPolicyVersions(policyArn: string) {
		try {
			const response = await this.client.send(
				new ListPolicyVersionsCommand({ PolicyArn: policyArn }),
			);
			const versions = (response.Versions ?? []).map((v) => ({
				versionId: v.VersionId ?? "",
				isDefaultVersion: v.IsDefaultVersion ?? false,
				createDate: v.CreateDate?.toISOString() ?? "",
			}));
			return { versions };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async createPolicyVersion(
		policyArn: string,
		policyDocument: string,
		setAsDefault: boolean,
	) {
		try {
			const response = await this.client.send(
				new CreatePolicyVersionCommand({
					PolicyArn: policyArn,
					PolicyDocument: policyDocument,
					SetAsDefault: setAsDefault,
				}),
			);
			return {
				message: "Policy version created successfully",
				versionId: response.PolicyVersion?.VersionId ?? "",
			};
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async deletePolicyVersion(policyArn: string, versionId: string) {
		try {
			await this.client.send(
				new DeletePolicyVersionCommand({
					PolicyArn: policyArn,
					VersionId: versionId,
				}),
			);
			return { success: true };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async setDefaultPolicyVersion(policyArn: string, versionId: string) {
		try {
			await this.client.send(
				new SetDefaultPolicyVersionCommand({
					PolicyArn: policyArn,
					VersionId: versionId,
				}),
			);
			return { message: "Default policy version updated successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Attach/Detach User Policies ─────────────────────────────────

	async attachUserPolicy(userName: string, policyArn: string) {
		try {
			await this.client.send(
				new AttachUserPolicyCommand({
					UserName: userName,
					PolicyArn: policyArn,
				}),
			);
			return { message: "Policy attached to user successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async detachUserPolicy(userName: string, policyArn: string) {
		try {
			await this.client.send(
				new DetachUserPolicyCommand({
					UserName: userName,
					PolicyArn: policyArn,
				}),
			);
			return { message: "Policy detached from user successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async listAttachedUserPolicies(userName: string) {
		try {
			const response = await this.client.send(
				new ListAttachedUserPoliciesCommand({ UserName: userName }),
			);
			const attachedPolicies = (response.AttachedPolicies ?? []).map((p) => ({
				policyName: p.PolicyName ?? "",
				policyArn: p.PolicyArn ?? "",
			}));
			return { attachedPolicies };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	// ── Attach/Detach Group Policies ────────────────────────────────

	async attachGroupPolicy(groupName: string, policyArn: string) {
		try {
			await this.client.send(
				new AttachGroupPolicyCommand({
					GroupName: groupName,
					PolicyArn: policyArn,
				}),
			);
			return { message: "Policy attached to group successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async detachGroupPolicy(groupName: string, policyArn: string) {
		try {
			await this.client.send(
				new DetachGroupPolicyCommand({
					GroupName: groupName,
					PolicyArn: policyArn,
				}),
			);
			return { message: "Policy detached from group successfully" };
		} catch (err) {
			throw mapIamError(err);
		}
	}

	async listAttachedGroupPolicies(groupName: string) {
		try {
			const response = await this.client.send(
				new ListAttachedGroupPoliciesCommand({ GroupName: groupName }),
			);
			const attachedPolicies = (response.AttachedPolicies ?? []).map((p) => ({
				policyName: p.PolicyName ?? "",
				policyArn: p.PolicyArn ?? "",
			}));
			return { attachedPolicies };
		} catch (err) {
			throw mapIamError(err);
		}
	}
}

function mapIamError(error: unknown): AppError {
	if (error instanceof AppError) return error;
	const name = (error as { name?: string })?.name;
	const message =
		(error as { message?: string })?.message ?? "Unknown IAM error";
	switch (name) {
		case "NoSuchEntityException":
			return new AppError(message, 404, "NOT_FOUND");
		case "EntityAlreadyExistsException":
			return new AppError(message, 409, "CONFLICT");
		case "DeleteConflictException":
			return new AppError(message, 409, "DELETE_CONFLICT");
		case "LimitExceededException":
			return new AppError(message, 429, "LIMIT_EXCEEDED");
		case "MalformedPolicyDocumentException":
			return new AppError(message, 400, "MALFORMED_POLICY");
		case "InvalidInputException":
			return new AppError(message, 400, "INVALID_INPUT");
		default:
			return new AppError(message, 500, "INTERNAL_ERROR");
	}
}
