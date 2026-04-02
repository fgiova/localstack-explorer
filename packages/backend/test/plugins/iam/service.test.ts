import type { IAMClient } from "@aws-sdk/client-iam";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IAMService } from "../../../src/plugins/iam/service.js";
import { AppError } from "../../../src/shared/errors.js";

function createMockIAMClient() {
	return {
		send: vi.fn(),
	} as unknown as IAMClient;
}

function makeError(name: string, message = "IAM error") {
	const err = new Error(message) as Error & { name: string };
	err.name = name;
	return err;
}

describe("IAMService", () => {
	let client: IAMClient;
	let service: IAMService;

	beforeEach(() => {
		client = createMockIAMClient();
		service = new IAMService(client);
	});

	// ── mapIamError passthrough / mapping ────────────────────────────────────

	describe("mapIamError", () => {
		it("passes AppError through unchanged", async () => {
			const original = new AppError("original", 418, "TEAPOT");
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(original);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 418,
				code: "TEAPOT",
				message: "original",
			});
		});

		it("maps NoSuchEntityException to 404 NOT_FOUND", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "no entity"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});

		it("maps EntityAlreadyExistsException to 409 CONFLICT", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("EntityAlreadyExistsException", "already exists"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 409,
				code: "CONFLICT",
			});
		});

		it("maps DeleteConflictException to 409 DELETE_CONFLICT", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("DeleteConflictException", "delete conflict"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 409,
				code: "DELETE_CONFLICT",
			});
		});

		it("maps LimitExceededException to 429 LIMIT_EXCEEDED", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("LimitExceededException", "limit exceeded"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 429,
				code: "LIMIT_EXCEEDED",
			});
		});

		it("maps MalformedPolicyDocumentException to 400 MALFORMED_POLICY", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("MalformedPolicyDocumentException", "malformed"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 400,
				code: "MALFORMED_POLICY",
			});
		});

		it("maps InvalidInputException to 400 INVALID_INPUT", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("InvalidInputException", "invalid input"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 400,
				code: "INVALID_INPUT",
			});
		});

		it("maps unknown errors to 500 INTERNAL_ERROR", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error("boom"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 500,
				code: "INTERNAL_ERROR",
			});
		});
	});

	// ── User Operations ──────────────────────────────────────────────────────

	describe("listUsers", () => {
		it("returns a mapped list of users", async () => {
			const createDate = new Date("2024-01-15T10:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Users: [
					{
						UserName: "alice",
						UserId: "AIDA123",
						Arn: "arn:aws:iam::000000000000:user/alice",
						CreateDate: createDate,
						Path: "/",
					},
				],
			});

			const result = await service.listUsers();

			expect(result).toEqual({
				users: [
					{
						userName: "alice",
						userId: "AIDA123",
						arn: "arn:aws:iam::000000000000:user/alice",
						createDate: createDate.toISOString(),
						path: "/",
					},
				],
			});
		});

		it("returns empty list when Users is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listUsers();
			expect(result).toEqual({ users: [] });
		});

		it("uses empty strings when user fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Users: [{ /* all fields absent */ }],
			});
			const result = await service.listUsers();
			expect(result.users[0]).toEqual({
				userName: "",
				userId: "",
				arn: "",
				createDate: "",
				path: "/",
			});
		});

		it("throws AppError on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "not found"),
			);
			await expect(service.listUsers()).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});
	});

	describe("createUser", () => {
		it("creates a user without path", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.createUser("alice");

			expect(result).toEqual({ message: "User created successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ UserName: "alice" });
			expect(cmd.input.Path).toBeUndefined();
		});

		it("creates a user with an explicit path", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			await service.createUser("alice", "/division/");

			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ UserName: "alice", Path: "/division/" });
		});

		it("throws AppError 409 CONFLICT when entity already exists", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("EntityAlreadyExistsException", "User already exists"),
			);
			await expect(service.createUser("alice")).rejects.toMatchObject({
				statusCode: 409,
				code: "CONFLICT",
			});
		});
	});

	describe("getUser", () => {
		it("returns mapped user detail", async () => {
			const createDate = new Date("2024-03-01T08:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				User: {
					UserName: "bob",
					UserId: "AIDA456",
					Arn: "arn:aws:iam::000000000000:user/bob",
					CreateDate: createDate,
					Path: "/",
				},
			});

			const result = await service.getUser("bob");

			expect(result).toEqual({
				userName: "bob",
				userId: "AIDA456",
				arn: "arn:aws:iam::000000000000:user/bob",
				createDate: createDate.toISOString(),
				path: "/",
			});
		});

		it("uses empty strings when user fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				User: { /* all fields absent */ },
			});
			const result = await service.getUser("bob");
			expect(result).toEqual({
				userName: "",
				userId: "",
				arn: "",
				createDate: "",
				path: "/",
			});
		});

		it("throws AppError 404 NOT_FOUND when user does not exist", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "User not found"),
			);
			await expect(service.getUser("ghost")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});
	});

	describe("deleteUser", () => {
		it("cleans up access keys, inline policies, attached policies, groups and deletes user", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				// ListAccessKeys
				.mockResolvedValueOnce({
					AccessKeyMetadata: [{ AccessKeyId: "AKIA1" }, { AccessKeyId: "AKIA2" }],
				})
				// DeleteAccessKey x2
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({})
				// ListUserPolicies
				.mockResolvedValueOnce({ PolicyNames: ["InlinePolicy1"] })
				// DeleteUserPolicy
				.mockResolvedValueOnce({})
				// ListAttachedUserPolicies
				.mockResolvedValueOnce({
					AttachedPolicies: [{ PolicyArn: "arn:aws:iam::aws:policy/ReadOnly" }],
				})
				// DetachUserPolicy
				.mockResolvedValueOnce({})
				// ListGroupsForUser
				.mockResolvedValueOnce({ Groups: [{ GroupName: "admins" }] })
				// RemoveUserFromGroup
				.mockResolvedValueOnce({})
				// DeleteUser
				.mockResolvedValueOnce({});

			const result = await service.deleteUser("alice");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(10);
		});

		it("handles user with no access keys, policies, or groups", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ AccessKeyMetadata: [] })
				.mockResolvedValueOnce({ PolicyNames: [] })
				.mockResolvedValueOnce({ AttachedPolicies: [] })
				.mockResolvedValueOnce({ Groups: [] })
				.mockResolvedValueOnce({});

			const result = await service.deleteUser("alice");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(5);
		});

		it("throws AppError on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "User not found"),
			);
			await expect(service.deleteUser("ghost")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});
	});

	// ── Access Key Operations ────────────────────────────────────────────────

	// ── Error path coverage for all catch blocks ────────────────────────

	describe("error paths for simple methods", () => {
		it("listGroups throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("LimitExceededException"));
			await expect(service.listGroups()).rejects.toMatchObject({ statusCode: 429 });
		});

		it("createGroup throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("EntityAlreadyExistsException"));
			await expect(service.createGroup("grp")).rejects.toMatchObject({ statusCode: 409 });
		});

		it("getGroup throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.getGroup("grp")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("listAccessKeys throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.listAccessKeys("alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("createAccessKey throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.createAccessKey("alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("deleteAccessKey throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.deleteAccessKey("alice", "AKID")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("updateAccessKey throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.updateAccessKey("alice", "AKID", "Inactive")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("addUserToGroup throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.addUserToGroup("grp", "alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("removeUserFromGroup throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.removeUserFromGroup("grp", "alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("listGroupsForUser throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.listGroupsForUser("alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("listUserPolicies throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.listUserPolicies("alice")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("getUserPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.getUserPolicy("alice", "pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("putUserPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("MalformedPolicyDocumentException"));
			await expect(service.putUserPolicy("alice", "pol", "{}")).rejects.toMatchObject({ statusCode: 400 });
		});

		it("deleteUserPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.deleteUserPolicy("alice", "pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("listGroupPolicies throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.listGroupPolicies("grp")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("getGroupPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.getGroupPolicy("grp", "pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("putGroupPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("MalformedPolicyDocumentException"));
			await expect(service.putGroupPolicy("grp", "pol", "{}")).rejects.toMatchObject({ statusCode: 400 });
		});

		it("deleteGroupPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.deleteGroupPolicy("grp", "pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("listManagedPolicies throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("LimitExceededException"));
			await expect(service.listManagedPolicies()).rejects.toMatchObject({ statusCode: 429 });
		});

		it("getPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.getPolicy("arn:pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("getPolicyDocument throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.getPolicyDocument("arn:pol", "v1")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("createPolicy throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("EntityAlreadyExistsException"));
			await expect(service.createPolicy("pol", "{}")).rejects.toMatchObject({ statusCode: 409 });
		});

		it("listPolicyVersions throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.listPolicyVersions("arn:pol")).rejects.toMatchObject({ statusCode: 404 });
		});

		it("createPolicyVersion throws on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(makeError("NoSuchEntityException"));
			await expect(service.createPolicyVersion("arn:pol", "{}", true)).rejects.toMatchObject({ statusCode: 404 });
		});
	});

	describe("listAccessKeys", () => {
		it("returns mapped access key list", async () => {
			const createDate = new Date("2024-05-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AccessKeyMetadata: [
					{
						AccessKeyId: "AKIA1",
						Status: "Active",
						CreateDate: createDate,
						UserName: "alice",
					},
				],
			});

			const result = await service.listAccessKeys("alice");

			expect(result).toEqual({
				accessKeys: [
					{
						accessKeyId: "AKIA1",
						status: "Active",
						createDate: createDate.toISOString(),
						userName: "alice",
					},
				],
			});
		});

		it("returns empty list when AccessKeyMetadata is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listAccessKeys("alice");
			expect(result).toEqual({ accessKeys: [] });
		});

		it("uses empty strings when access key fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AccessKeyMetadata: [{ /* all fields absent */ }],
			});
			const result = await service.listAccessKeys("alice");
			expect(result.accessKeys[0]).toEqual({
				accessKeyId: "",
				status: "",
				createDate: "",
				userName: "",
			});
		});
	});

	describe("createAccessKey", () => {
		it("returns newly created access key details", async () => {
			const createDate = new Date("2024-06-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AccessKey: {
					AccessKeyId: "AKIA_NEW",
					SecretAccessKey: "secret123",
					Status: "Active",
					UserName: "alice",
					CreateDate: createDate,
				},
			});

			const result = await service.createAccessKey("alice");

			expect(result).toEqual({
				accessKeyId: "AKIA_NEW",
				secretAccessKey: "secret123",
				status: "Active",
				userName: "alice",
				createDate: createDate.toISOString(),
			});
		});

		it("uses empty strings when createAccessKey response fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AccessKey: { /* all fields absent */ },
			});
			const result = await service.createAccessKey("alice");
			expect(result).toEqual({
				accessKeyId: "",
				secretAccessKey: "",
				status: "",
				userName: "",
				createDate: "",
			});
		});
	});

	describe("deleteAccessKey", () => {
		it("deletes an access key and returns success", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteAccessKey("alice", "AKIA1");

			expect(result).toEqual({ success: true });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				AccessKeyId: "AKIA1",
			});
		});
	});

	describe("updateAccessKey", () => {
		it("updates access key status and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.updateAccessKey("alice", "AKIA1", "Inactive");

			expect(result).toEqual({ message: "Access key updated successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				AccessKeyId: "AKIA1",
				Status: "Inactive",
			});
		});
	});

	// ── Group Operations ─────────────────────────────────────────────────────

	describe("listGroups", () => {
		it("returns a mapped list of groups", async () => {
			const createDate = new Date("2024-02-10T12:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Groups: [
					{
						GroupName: "admins",
						GroupId: "AGPA1",
						Arn: "arn:aws:iam::000000000000:group/admins",
						CreateDate: createDate,
						Path: "/",
					},
				],
			});

			const result = await service.listGroups();

			expect(result).toEqual({
				groups: [
					{
						groupName: "admins",
						groupId: "AGPA1",
						arn: "arn:aws:iam::000000000000:group/admins",
						createDate: createDate.toISOString(),
						path: "/",
					},
				],
			});
		});

		it("returns empty list when Groups is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listGroups();
			expect(result).toEqual({ groups: [] });
		});

		it("uses empty strings when group fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Groups: [{ /* all fields absent */ }],
			});
			const result = await service.listGroups();
			expect(result.groups[0]).toEqual({
				groupName: "",
				groupId: "",
				arn: "",
				createDate: "",
				path: "/",
			});
		});
	});

	describe("createGroup", () => {
		it("creates a group without path", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.createGroup("admins");

			expect(result).toEqual({ message: "Group created successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ GroupName: "admins" });
			expect(cmd.input.Path).toBeUndefined();
		});

		it("creates a group with an explicit path", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			await service.createGroup("admins", "/teams/");

			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ GroupName: "admins", Path: "/teams/" });
		});
	});

	describe("getGroup", () => {
		it("returns group detail with member list", async () => {
			const createDate = new Date("2024-04-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Group: {
					GroupName: "admins",
					GroupId: "AGPA1",
					Arn: "arn:aws:iam::000000000000:group/admins",
					CreateDate: createDate,
					Path: "/",
				},
				Users: [
					{
						UserName: "alice",
						UserId: "AIDA123",
						Arn: "arn:aws:iam::000000000000:user/alice",
					},
				],
			});

			const result = await service.getGroup("admins");

			expect(result).toEqual({
				group: {
					groupName: "admins",
					groupId: "AGPA1",
					arn: "arn:aws:iam::000000000000:group/admins",
					createDate: createDate.toISOString(),
					path: "/",
				},
				members: [
					{
						userName: "alice",
						userId: "AIDA123",
						arn: "arn:aws:iam::000000000000:user/alice",
					},
				],
			});
		});

		it("returns empty members list when Users is undefined", async () => {
			const createDate = new Date("2024-04-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Group: {
					GroupName: "admins",
					GroupId: "AGPA1",
					Arn: "arn:aws:iam::000000000000:group/admins",
					CreateDate: createDate,
					Path: "/",
				},
			});

			const result = await service.getGroup("admins");

			expect(result.members).toEqual([]);
		});

		it("uses empty strings when group fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Group: { /* all fields absent */ },
				Users: [{ /* all user fields absent */ }],
			});
			const result = await service.getGroup("admins");
			expect(result.group).toEqual({
				groupName: "",
				groupId: "",
				arn: "",
				createDate: "",
				path: "/",
			});
			expect(result.members[0]).toEqual({
				userName: "",
				userId: "",
				arn: "",
			});
		});
	});

	describe("deleteGroup", () => {
		it("cleans up members, inline policies, attached policies and deletes group", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				// GetGroup (to list members)
				.mockResolvedValueOnce({
					Group: { GroupName: "admins" },
					Users: [{ UserName: "alice" }],
				})
				// RemoveUserFromGroup
				.mockResolvedValueOnce({})
				// ListGroupPolicies
				.mockResolvedValueOnce({ PolicyNames: ["InlineGroupPolicy"] })
				// DeleteGroupPolicy
				.mockResolvedValueOnce({})
				// ListAttachedGroupPolicies
				.mockResolvedValueOnce({
					AttachedPolicies: [{ PolicyArn: "arn:aws:iam::aws:policy/ReadOnly" }],
				})
				// DetachGroupPolicy
				.mockResolvedValueOnce({})
				// DeleteGroup
				.mockResolvedValueOnce({});

			const result = await service.deleteGroup("admins");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(7);
		});

		it("handles group with no members, policies, or attached policies", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ Group: { GroupName: "empty" }, Users: [] })
				.mockResolvedValueOnce({ PolicyNames: [] })
				.mockResolvedValueOnce({ AttachedPolicies: [] })
				.mockResolvedValueOnce({});

			const result = await service.deleteGroup("empty");

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(4);
		});

		it("throws AppError on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Group not found"),
			);
			await expect(service.deleteGroup("ghost")).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});
	});

	describe("addUserToGroup", () => {
		it("adds a user to a group and returns message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.addUserToGroup("admins", "alice");

			expect(result).toEqual({ message: "User added to group" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				UserName: "alice",
			});
		});
	});

	describe("removeUserFromGroup", () => {
		it("removes a user from a group and returns message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.removeUserFromGroup("admins", "alice");

			expect(result).toEqual({ message: "User removed from group" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				UserName: "alice",
			});
		});
	});

	describe("listGroupsForUser", () => {
		it("returns the groups a user belongs to", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Groups: [
					{
						GroupName: "admins",
						GroupId: "AGPA1",
						Arn: "arn:aws:iam::000000000000:group/admins",
					},
				],
			});

			const result = await service.listGroupsForUser("alice");

			expect(result).toEqual({
				groups: [
					{
						groupName: "admins",
						groupId: "AGPA1",
						arn: "arn:aws:iam::000000000000:group/admins",
					},
				],
			});
		});

		it("returns empty list when Groups is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listGroupsForUser("alice");
			expect(result).toEqual({ groups: [] });
		});

		it("uses empty strings when group fields are undefined in listGroupsForUser", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Groups: [{ /* all fields absent */ }],
			});
			const result = await service.listGroupsForUser("alice");
			expect(result.groups[0]).toEqual({
				groupName: "",
				groupId: "",
				arn: "",
			});
		});
	});

	// ── User Inline Policy Operations ────────────────────────────────────────

	describe("listUserPolicies", () => {
		it("returns policy names for the user", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyNames: ["InlinePolicy1", "InlinePolicy2"],
			});

			const result = await service.listUserPolicies("alice");

			expect(result).toEqual({
				policyNames: ["InlinePolicy1", "InlinePolicy2"],
			});
		});

		it("returns empty list when PolicyNames is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listUserPolicies("alice");
			expect(result).toEqual({ policyNames: [] });
		});
	});

	describe("getUserPolicy", () => {
		it("returns policy name and URI-decoded policy document", async () => {
			const encoded =
				"%7B%22Version%22%3A%222012-10-17%22%7D";
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyName: "InlinePolicy1",
				PolicyDocument: encoded,
			});

			const result = await service.getUserPolicy("alice", "InlinePolicy1");

			expect(result).toEqual({
				policyName: "InlinePolicy1",
				policyDocument: decodeURIComponent(encoded),
			});
		});

		it("returns empty strings when response fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.getUserPolicy("alice", "InlinePolicy1");

			expect(result).toEqual({ policyName: "", policyDocument: "" });
		});
	});

	describe("putUserPolicy", () => {
		it("saves a user inline policy and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const doc = '{"Version":"2012-10-17"}';
			const result = await service.putUserPolicy(
				"alice",
				"InlinePolicy1",
				doc,
			);

			expect(result).toEqual({ message: "Policy saved successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				PolicyName: "InlinePolicy1",
				PolicyDocument: doc,
			});
		});
	});

	describe("deleteUserPolicy", () => {
		it("deletes a user inline policy and returns success", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteUserPolicy("alice", "InlinePolicy1");

			expect(result).toEqual({ success: true });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				PolicyName: "InlinePolicy1",
			});
		});
	});

	// ── Group Inline Policy Operations ───────────────────────────────────────

	describe("listGroupPolicies", () => {
		it("returns policy names for the group", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyNames: ["GroupPolicy1"],
			});

			const result = await service.listGroupPolicies("admins");

			expect(result).toEqual({ policyNames: ["GroupPolicy1"] });
		});

		it("returns empty list when PolicyNames is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listGroupPolicies("admins");
			expect(result).toEqual({ policyNames: [] });
		});
	});

	describe("getGroupPolicy", () => {
		it("returns policy name and URI-decoded policy document", async () => {
			const encoded =
				"%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%5D%7D";
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyName: "GroupPolicy1",
				PolicyDocument: encoded,
			});

			const result = await service.getGroupPolicy("admins", "GroupPolicy1");

			expect(result).toEqual({
				policyName: "GroupPolicy1",
				policyDocument: decodeURIComponent(encoded),
			});
		});

		it("returns empty strings when response fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.getGroupPolicy("admins", "GroupPolicy1");
			expect(result).toEqual({ policyName: "", policyDocument: "" });
		});
	});

	describe("putGroupPolicy", () => {
		it("saves a group inline policy and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const doc = '{"Version":"2012-10-17"}';
			const result = await service.putGroupPolicy("admins", "GroupPolicy1", doc);

			expect(result).toEqual({ message: "Policy saved successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				PolicyName: "GroupPolicy1",
				PolicyDocument: doc,
			});
		});
	});

	describe("deleteGroupPolicy", () => {
		it("deletes a group inline policy and returns success", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deleteGroupPolicy("admins", "GroupPolicy1");

			expect(result).toEqual({ success: true });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				PolicyName: "GroupPolicy1",
			});
		});
	});

	// ── listRoles ────────────────────────────────────────────────────────────

	describe("listRoles", () => {
		it("throws AppError 501 NOT_IMPLEMENTED", async () => {
			await expect(service.listRoles()).rejects.toMatchObject({
				statusCode: 501,
				code: "NOT_IMPLEMENTED",
			});
		});

		it("throws an AppError instance", async () => {
			await expect(service.listRoles()).rejects.toBeInstanceOf(AppError);
		});
	});

	// ── Managed Policy Operations ─────────────────────────────────────────────

	describe("listManagedPolicies", () => {
		it("returns mapped managed policies using default Local scope", async () => {
			const createDate = new Date("2024-01-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policies: [
					{
						PolicyName: "MyPolicy",
						PolicyId: "ANPA1",
						Arn: "arn:aws:iam::000000000000:policy/MyPolicy",
						AttachmentCount: 2,
						CreateDate: createDate,
						DefaultVersionId: "v1",
						Description: "My policy",
					},
				],
			});

			const result = await service.listManagedPolicies();

			expect(result).toEqual({
				policies: [
					{
						policyName: "MyPolicy",
						policyId: "ANPA1",
						arn: "arn:aws:iam::000000000000:policy/MyPolicy",
						attachmentCount: 2,
						createDate: createDate.toISOString(),
						defaultVersionId: "v1",
						description: "My policy",
					},
				],
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ Scope: "Local" });
		});

		it("passes explicit scope parameter to the command", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policies: [],
			});

			await service.listManagedPolicies("All");

			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({ Scope: "All" });
		});

		it("returns empty list when Policies is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listManagedPolicies();
			expect(result).toEqual({ policies: [] });
		});

		it("uses empty strings when policy fields are undefined in listManagedPolicies", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policies: [{ /* all fields absent */ }],
			});
			const result = await service.listManagedPolicies();
			expect(result.policies[0]).toEqual({
				policyName: "",
				policyId: "",
				arn: "",
				attachmentCount: 0,
				createDate: "",
				defaultVersionId: "",
				description: "",
			});
		});
	});

	describe("getPolicy", () => {
		it("returns mapped policy detail", async () => {
			const createDate = new Date("2024-01-01T00:00:00.000Z");
			const updateDate = new Date("2024-06-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policy: {
					PolicyName: "MyPolicy",
					PolicyId: "ANPA1",
					Arn: "arn:aws:iam::000000000000:policy/MyPolicy",
					AttachmentCount: 1,
					CreateDate: createDate,
					DefaultVersionId: "v2",
					Description: "desc",
					Path: "/",
					IsAttachable: true,
					UpdateDate: updateDate,
				},
			});

			const result = await service.getPolicy(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);

			expect(result).toEqual({
				policyName: "MyPolicy",
				policyId: "ANPA1",
				arn: "arn:aws:iam::000000000000:policy/MyPolicy",
				attachmentCount: 1,
				createDate: createDate.toISOString(),
				defaultVersionId: "v2",
				description: "desc",
				path: "/",
				isAttachable: true,
				updateDate: updateDate.toISOString(),
			});
		});

		it("uses empty strings and defaults when policy fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policy: { /* all fields absent */ },
			});
			const result = await service.getPolicy("arn:aws:iam::000000000000:policy/MyPolicy");
			expect(result).toEqual({
				policyName: "",
				policyId: "",
				arn: "",
				attachmentCount: 0,
				createDate: "",
				defaultVersionId: "",
				description: "",
				path: "/",
				isAttachable: true,
				updateDate: "",
			});
		});
	});

	describe("getPolicyDocument", () => {
		it("returns the policy document for an explicit versionId", async () => {
			const encoded = "%7B%22Version%22%3A%222012-10-17%22%7D";
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyVersion: {
					Document: encoded,
					IsDefaultVersion: true,
				},
			});

			const result = await service.getPolicyDocument(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				"v1",
			);

			expect(result).toEqual({
				versionId: "v1",
				isDefaultVersion: true,
				document: decodeURIComponent(encoded),
			});
			expect(client.send).toHaveBeenCalledTimes(1);
		});

		it("returns empty document when PolicyVersion.Document is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyVersion: {
					IsDefaultVersion: true,
				},
			});

			const result = await service.getPolicyDocument(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				"v1",
			);

			expect(result.document).toBe("");
		});

		it("resolves the default version when no versionId is provided", async () => {
			const createDate = new Date("2024-01-01T00:00:00.000Z");
			const updateDate = new Date("2024-06-01T00:00:00.000Z");
			const encoded = "%7B%22Version%22%3A%222012-10-17%22%7D";

			(client.send as ReturnType<typeof vi.fn>)
				// GetPolicy (called by getPolicy() inside getPolicyDocument)
				.mockResolvedValueOnce({
					Policy: {
						PolicyName: "MyPolicy",
						PolicyId: "ANPA1",
						Arn: "arn:aws:iam::000000000000:policy/MyPolicy",
						AttachmentCount: 1,
						CreateDate: createDate,
						DefaultVersionId: "v3",
						Description: "",
						Path: "/",
						IsAttachable: true,
						UpdateDate: updateDate,
					},
				})
				// GetPolicyVersion
				.mockResolvedValueOnce({
					PolicyVersion: {
						Document: encoded,
						IsDefaultVersion: true,
					},
				});

			const result = await service.getPolicyDocument(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);

			expect(result).toEqual({
				versionId: "v3",
				isDefaultVersion: true,
				document: decodeURIComponent(encoded),
			});
			expect(client.send).toHaveBeenCalledTimes(2);
		});
	});

	describe("createPolicy", () => {
		it("creates a policy with description and path and returns arn", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policy: { Arn: "arn:aws:iam::000000000000:policy/MyPolicy" },
			});

			const doc = '{"Version":"2012-10-17"}';
			const result = await service.createPolicy(
				"MyPolicy",
				doc,
				"My description",
				"/custom/",
			);

			expect(result).toEqual({
				message: "Policy created successfully",
				arn: "arn:aws:iam::000000000000:policy/MyPolicy",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				PolicyName: "MyPolicy",
				PolicyDocument: doc,
				Description: "My description",
				Path: "/custom/",
			});
		});

		it("creates a policy without optional description and path", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policy: { Arn: "arn:aws:iam::000000000000:policy/MyPolicy" },
			});

			await service.createPolicy("MyPolicy", '{"Version":"2012-10-17"}');

			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input.Description).toBeUndefined();
			expect(cmd.input.Path).toBeUndefined();
		});

		it("returns empty string for arn when Policy.Arn is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Policy: { /* Arn absent */ },
			});
			const result = await service.createPolicy("MyPolicy", "{}");
			expect(result.arn).toBe("");
		});
	});

	describe("deletePolicy", () => {
		it("deletes non-default versions, detaches from users and groups, then deletes", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				// ListPolicyVersions
				.mockResolvedValueOnce({
					Versions: [
						{ VersionId: "v1", IsDefaultVersion: true },
						{ VersionId: "v2", IsDefaultVersion: false },
					],
				})
				// DeletePolicyVersion (v2 only)
				.mockResolvedValueOnce({})
				// ListEntitiesForPolicy
				.mockResolvedValueOnce({
					PolicyUsers: [{ UserName: "alice" }],
					PolicyGroups: [{ GroupName: "admins" }],
				})
				// DetachUserPolicy
				.mockResolvedValueOnce({})
				// DetachGroupPolicy
				.mockResolvedValueOnce({})
				// DeletePolicy
				.mockResolvedValueOnce({});

			const result = await service.deletePolicy(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(6);
		});

		it("skips version deletion and entity detach when there are none", async () => {
			(client.send as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ Versions: [{ VersionId: "v1", IsDefaultVersion: true }] })
				.mockResolvedValueOnce({ PolicyUsers: [], PolicyGroups: [] })
				.mockResolvedValueOnce({});

			const result = await service.deletePolicy(
				"arn:aws:iam::000000000000:policy/EmptyPolicy",
			);

			expect(result).toEqual({ success: true });
			expect(client.send).toHaveBeenCalledTimes(3);
		});

		it("throws AppError on error", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Policy not found"),
			);
			await expect(
				service.deletePolicy("arn:aws:iam::000000000000:policy/Ghost"),
			).rejects.toMatchObject({
				statusCode: 404,
				code: "NOT_FOUND",
			});
		});
	});

	// ── Policy Versioning ────────────────────────────────────────────────────

	describe("listPolicyVersions", () => {
		it("returns mapped version list", async () => {
			const createDate = new Date("2024-07-01T00:00:00.000Z");
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Versions: [
					{
						VersionId: "v1",
						IsDefaultVersion: true,
						CreateDate: createDate,
					},
				],
			});

			const result = await service.listPolicyVersions(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);

			expect(result).toEqual({
				versions: [
					{
						versionId: "v1",
						isDefaultVersion: true,
						createDate: createDate.toISOString(),
					},
				],
			});
		});

		it("returns empty list when Versions is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listPolicyVersions(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);
			expect(result).toEqual({ versions: [] });
		});

		it("uses empty strings when version fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				Versions: [{ /* all fields absent */ }],
			});
			const result = await service.listPolicyVersions(
				"arn:aws:iam::000000000000:policy/MyPolicy",
			);
			expect(result.versions[0]).toEqual({
				versionId: "",
				isDefaultVersion: false,
				createDate: "",
			});
		});
	});

	describe("createPolicyVersion", () => {
		it("creates a new policy version and returns versionId", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyVersion: { VersionId: "v2" },
			});

			const doc = '{"Version":"2012-10-17"}';
			const result = await service.createPolicyVersion(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				doc,
				true,
			);

			expect(result).toEqual({
				message: "Policy version created successfully",
				versionId: "v2",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				PolicyArn: "arn:aws:iam::000000000000:policy/MyPolicy",
				PolicyDocument: doc,
				SetAsDefault: true,
			});
		});

		it("uses empty string for versionId when response fields are undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				PolicyVersion: { /* VersionId absent */ },
			});
			const result = await service.createPolicyVersion(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				"{}",
				false,
			);
			expect(result.versionId).toBe("");
		});
	});

	describe("deletePolicyVersion", () => {
		it("deletes a specific policy version and returns success", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.deletePolicyVersion(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				"v2",
			);

			expect(result).toEqual({ success: true });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				PolicyArn: "arn:aws:iam::000000000000:policy/MyPolicy",
				VersionId: "v2",
			});
		});

		it("throws AppError when deletePolicyVersion fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Version not found"),
			);
			await expect(
				service.deletePolicyVersion(
					"arn:aws:iam::000000000000:policy/MyPolicy",
					"v99",
				),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	describe("setDefaultPolicyVersion", () => {
		it("sets the default version and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.setDefaultPolicyVersion(
				"arn:aws:iam::000000000000:policy/MyPolicy",
				"v3",
			);

			expect(result).toEqual({
				message: "Default policy version updated successfully",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				PolicyArn: "arn:aws:iam::000000000000:policy/MyPolicy",
				VersionId: "v3",
			});
		});

		it("throws AppError when setDefaultPolicyVersion fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Policy not found"),
			);
			await expect(
				service.setDefaultPolicyVersion(
					"arn:aws:iam::000000000000:policy/MyPolicy",
					"v3",
				),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	// ── Attach/Detach User Policies ──────────────────────────────────────────

	describe("attachUserPolicy", () => {
		it("attaches a policy to a user and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.attachUserPolicy(
				"alice",
				"arn:aws:iam::aws:policy/ReadOnly",
			);

			expect(result).toEqual({ message: "Policy attached to user successfully" });
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
			});
		});

		it("throws AppError when attachUserPolicy fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "User not found"),
			);
			await expect(
				service.attachUserPolicy("alice", "arn:aws:iam::aws:policy/ReadOnly"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	describe("detachUserPolicy", () => {
		it("detaches a policy from a user and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.detachUserPolicy(
				"alice",
				"arn:aws:iam::aws:policy/ReadOnly",
			);

			expect(result).toEqual({
				message: "Policy detached from user successfully",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				UserName: "alice",
				PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
			});
		});

		it("throws AppError when detachUserPolicy fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Policy not found"),
			);
			await expect(
				service.detachUserPolicy("alice", "arn:aws:iam::aws:policy/ReadOnly"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	describe("listAttachedUserPolicies", () => {
		it("returns attached policies for a user", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AttachedPolicies: [
					{
						PolicyName: "ReadOnly",
						PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
					},
				],
			});

			const result = await service.listAttachedUserPolicies("alice");

			expect(result).toEqual({
				attachedPolicies: [
					{
						policyName: "ReadOnly",
						policyArn: "arn:aws:iam::aws:policy/ReadOnly",
					},
				],
			});
		});

		it("returns empty list when AttachedPolicies is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listAttachedUserPolicies("alice");
			expect(result).toEqual({ attachedPolicies: [] });
		});

		it("throws AppError when listAttachedUserPolicies fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "User not found"),
			);
			await expect(
				service.listAttachedUserPolicies("alice"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	// ── Attach/Detach Group Policies ─────────────────────────────────────────

	describe("attachGroupPolicy", () => {
		it("attaches a policy to a group and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.attachGroupPolicy(
				"admins",
				"arn:aws:iam::aws:policy/ReadOnly",
			);

			expect(result).toEqual({
				message: "Policy attached to group successfully",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
			});
		});

		it("throws AppError when attachGroupPolicy fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Group not found"),
			);
			await expect(
				service.attachGroupPolicy("admins", "arn:aws:iam::aws:policy/ReadOnly"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	describe("detachGroupPolicy", () => {
		it("detaches a policy from a group and returns success message", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

			const result = await service.detachGroupPolicy(
				"admins",
				"arn:aws:iam::aws:policy/ReadOnly",
			);

			expect(result).toEqual({
				message: "Policy detached from group successfully",
			});
			const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(cmd.input).toMatchObject({
				GroupName: "admins",
				PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
			});
		});

		it("throws AppError when detachGroupPolicy fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Policy not found"),
			);
			await expect(
				service.detachGroupPolicy("admins", "arn:aws:iam::aws:policy/ReadOnly"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});

	describe("listAttachedGroupPolicies", () => {
		it("returns attached policies for a group", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				AttachedPolicies: [
					{
						PolicyName: "ReadOnly",
						PolicyArn: "arn:aws:iam::aws:policy/ReadOnly",
					},
				],
			});

			const result = await service.listAttachedGroupPolicies("admins");

			expect(result).toEqual({
				attachedPolicies: [
					{
						policyName: "ReadOnly",
						policyArn: "arn:aws:iam::aws:policy/ReadOnly",
					},
				],
			});
		});

		it("returns empty list when AttachedPolicies is undefined", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
			const result = await service.listAttachedGroupPolicies("admins");
			expect(result).toEqual({ attachedPolicies: [] });
		});

		it("throws AppError when listAttachedGroupPolicies fails", async () => {
			(client.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				makeError("NoSuchEntityException", "Group not found"),
			);
			await expect(
				service.listAttachedGroupPolicies("admins"),
			).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
		});
	});
});
