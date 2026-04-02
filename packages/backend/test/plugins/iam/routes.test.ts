import Fastify, { type FastifyInstance } from "fastify";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { ClientCache } from "../../../src/aws/client-cache.js";
import { iamRoutes } from "../../../src/plugins/iam/routes.js";
import { registerErrorHandler } from "../../../src/shared/errors.js";

interface MockIAMService {
	listUsers: Mock;
	createUser: Mock;
	getUser: Mock;
	deleteUser: Mock;
	listAccessKeys: Mock;
	createAccessKey: Mock;
	deleteAccessKey: Mock;
	updateAccessKey: Mock;
	listUserPolicies: Mock;
	getUserPolicy: Mock;
	putUserPolicy: Mock;
	deleteUserPolicy: Mock;
	listAttachedUserPolicies: Mock;
	attachUserPolicy: Mock;
	detachUserPolicy: Mock;
	listGroupsForUser: Mock;
	listGroups: Mock;
	createGroup: Mock;
	getGroup: Mock;
	deleteGroup: Mock;
	addUserToGroup: Mock;
	removeUserFromGroup: Mock;
	listGroupPolicies: Mock;
	getGroupPolicy: Mock;
	putGroupPolicy: Mock;
	deleteGroupPolicy: Mock;
	listAttachedGroupPolicies: Mock;
	attachGroupPolicy: Mock;
	detachGroupPolicy: Mock;
	listManagedPolicies: Mock;
	createPolicy: Mock;
	getPolicy: Mock;
	deletePolicy: Mock;
	getPolicyDocument: Mock;
	listPolicyVersions: Mock;
	createPolicyVersion: Mock;
	deletePolicyVersion: Mock;
	setDefaultPolicyVersion: Mock;
}

function createMockIAMService(): MockIAMService {
	return {
		listUsers: vi.fn().mockResolvedValue({ users: [] }),
		createUser: vi
			.fn()
			.mockResolvedValue({ message: "User created successfully" }),
		getUser: vi.fn().mockResolvedValue({
			userName: "alice",
			userId: "AIDA123",
			arn: "arn:aws:iam::000000000000:user/alice",
			createDate: "2024-01-01T00:00:00.000Z",
			path: "/",
		}),
		deleteUser: vi.fn().mockResolvedValue({ success: true }),
		listAccessKeys: vi.fn().mockResolvedValue({ accessKeys: [] }),
		createAccessKey: vi.fn().mockResolvedValue({
			accessKeyId: "AKIA123",
			secretAccessKey: "secret",
			status: "Active",
			userName: "alice",
			createDate: "2024-01-01T00:00:00.000Z",
		}),
		deleteAccessKey: vi.fn().mockResolvedValue({ success: true }),
		updateAccessKey: vi
			.fn()
			.mockResolvedValue({ message: "Access key updated successfully" }),
		listUserPolicies: vi.fn().mockResolvedValue({ policyNames: [] }),
		getUserPolicy: vi.fn().mockResolvedValue({
			policyName: "my-policy",
			policyDocument: '{"Version":"2012-10-17","Statement":[]}',
		}),
		putUserPolicy: vi
			.fn()
			.mockResolvedValue({ message: "Policy saved successfully" }),
		deleteUserPolicy: vi.fn().mockResolvedValue({ success: true }),
		listAttachedUserPolicies: vi
			.fn()
			.mockResolvedValue({ attachedPolicies: [] }),
		attachUserPolicy: vi
			.fn()
			.mockResolvedValue({ message: "Policy attached to user successfully" }),
		detachUserPolicy: vi
			.fn()
			.mockResolvedValue({ message: "Policy detached from user successfully" }),
		listGroupsForUser: vi.fn().mockResolvedValue({ groups: [] }),
		listGroups: vi.fn().mockResolvedValue({ groups: [] }),
		createGroup: vi
			.fn()
			.mockResolvedValue({ message: "Group created successfully" }),
		getGroup: vi.fn().mockResolvedValue({
			group: {
				groupName: "admins",
				groupId: "AGPA123",
				arn: "arn:aws:iam::000000000000:group/admins",
				createDate: "2024-01-01T00:00:00.000Z",
				path: "/",
			},
			members: [],
		}),
		deleteGroup: vi.fn().mockResolvedValue({ success: true }),
		addUserToGroup: vi
			.fn()
			.mockResolvedValue({ message: "User added to group" }),
		removeUserFromGroup: vi
			.fn()
			.mockResolvedValue({ message: "User removed from group" }),
		listGroupPolicies: vi.fn().mockResolvedValue({ policyNames: [] }),
		getGroupPolicy: vi.fn().mockResolvedValue({
			policyName: "group-policy",
			policyDocument: '{"Version":"2012-10-17","Statement":[]}',
		}),
		putGroupPolicy: vi
			.fn()
			.mockResolvedValue({ message: "Policy saved successfully" }),
		deleteGroupPolicy: vi.fn().mockResolvedValue({ success: true }),
		listAttachedGroupPolicies: vi
			.fn()
			.mockResolvedValue({ attachedPolicies: [] }),
		attachGroupPolicy: vi
			.fn()
			.mockResolvedValue({ message: "Policy attached to group successfully" }),
		detachGroupPolicy: vi.fn().mockResolvedValue({ success: true }),
		listManagedPolicies: vi.fn().mockResolvedValue({ policies: [] }),
		createPolicy: vi.fn().mockResolvedValue({
			message: "Policy created successfully",
			arn: "arn:aws:iam::000000000000:policy/my-policy",
		}),
		getPolicy: vi.fn().mockResolvedValue({
			policyName: "my-policy",
			policyId: "ANPA123",
			arn: "arn:aws:iam::000000000000:policy/my-policy",
			attachmentCount: 0,
			createDate: "2024-01-01T00:00:00.000Z",
			defaultVersionId: "v1",
			description: "",
			path: "/",
			isAttachable: true,
			updateDate: "2024-01-01T00:00:00.000Z",
		}),
		deletePolicy: vi.fn().mockResolvedValue({ success: true }),
		getPolicyDocument: vi.fn().mockResolvedValue({
			versionId: "v1",
			isDefaultVersion: true,
			document: '{"Version":"2012-10-17","Statement":[]}',
		}),
		listPolicyVersions: vi.fn().mockResolvedValue({ versions: [] }),
		createPolicyVersion: vi.fn().mockResolvedValue({
			message: "Policy version created successfully",
			versionId: "v2",
		}),
		deletePolicyVersion: vi.fn().mockResolvedValue({ success: true }),
		setDefaultPolicyVersion: vi.fn().mockResolvedValue({
			message: "Default policy version updated successfully",
		}),
	};
}

vi.mock("../../../src/plugins/iam/service.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../../src/plugins/iam/service.js")
		>();
	return {
		...actual,
		IAMService: vi.fn(),
	};
});

import { IAMService as IAMServiceClass } from "../../../src/plugins/iam/service.js";

describe("IAM Routes", () => {
	let app: FastifyInstance;
	let mockService: MockIAMService;

	beforeAll(async () => {
		app = Fastify();
		registerErrorHandler(app);

		mockService = createMockIAMService();

		(IAMServiceClass as unknown as Mock).mockImplementation(() => mockService);

		const mockClientCache = {
			getClients: vi.fn().mockReturnValue({ iam: {} }),
		};
		app.decorate("clientCache", mockClientCache as unknown as ClientCache);

		app.decorateRequest("localstackConfig", null);
		app.addHook("onRequest", async (request) => {
			request.localstackConfig = {
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			};
		});

		await app.register(iamRoutes);
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	// ── User Routes ─────────────────────────────────────────────────────────

	describe("GET /users", () => {
		it("should return list of users", async () => {
			const response = await app.inject({ method: "GET", url: "/users" });
			expect(response.statusCode).toBe(200);
			expect(mockService.listUsers).toHaveBeenCalled();
		});
	});

	describe("POST /users", () => {
		it("should create a user and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/users",
				payload: { userName: "alice" },
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createUser).toHaveBeenCalledWith("alice", undefined);
		});

		it("should create a user with path", async () => {
			mockService.createUser.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/users",
				payload: { userName: "alice", path: "/division/" },
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createUser).toHaveBeenCalledWith(
				"alice",
				"/division/",
			);
		});
	});

	describe("GET /users/:userName", () => {
		it("should return user detail", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getUser).toHaveBeenCalledWith("alice");
		});
	});

	describe("DELETE /users/:userName", () => {
		it("should delete a user", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/users/alice",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deleteUser).toHaveBeenCalledWith("alice");
		});
	});

	// ── Access Key Routes ────────────────────────────────────────────────────

	describe("GET /users/:userName/access-keys", () => {
		it("should return access keys list", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice/access-keys",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listAccessKeys).toHaveBeenCalledWith("alice");
		});
	});

	describe("POST /users/:userName/access-keys", () => {
		it("should create an access key and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/users/alice/access-keys",
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createAccessKey).toHaveBeenCalledWith("alice");
		});
	});

	describe("DELETE /users/:userName/access-keys/:accessKeyId", () => {
		it("should delete an access key", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/users/alice/access-keys/AKIA123",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deleteAccessKey).toHaveBeenCalledWith(
				"alice",
				"AKIA123",
			);
		});
	});

	describe("PUT /users/:userName/access-keys/:accessKeyId", () => {
		it("should update an access key status", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/users/alice/access-keys/AKIA123",
				payload: { status: "Inactive" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.updateAccessKey).toHaveBeenCalledWith(
				"alice",
				"AKIA123",
				"Inactive",
			);
		});
	});

	// ── User Inline Policy Routes ────────────────────────────────────────────

	describe("GET /users/:userName/inline-policies", () => {
		it("should return list of inline policy names", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice/inline-policies",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listUserPolicies).toHaveBeenCalledWith("alice");
		});
	});

	describe("GET /users/:userName/inline-policies/:policyName", () => {
		it("should return inline policy detail", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice/inline-policies/my-policy",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getUserPolicy).toHaveBeenCalledWith(
				"alice",
				"my-policy",
			);
		});
	});

	describe("PUT /users/:userName/inline-policies/:policyName", () => {
		it("should put an inline policy", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/users/alice/inline-policies/my-policy",
				payload: {
					policyDocument: '{"Version":"2012-10-17","Statement":[]}',
				},
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.putUserPolicy).toHaveBeenCalledWith(
				"alice",
				"my-policy",
				'{"Version":"2012-10-17","Statement":[]}',
			);
		});
	});

	describe("DELETE /users/:userName/inline-policies/:policyName", () => {
		it("should delete an inline policy", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/users/alice/inline-policies/my-policy",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deleteUserPolicy).toHaveBeenCalledWith(
				"alice",
				"my-policy",
			);
		});
	});

	// ── User Attached Policy Routes ──────────────────────────────────────────

	describe("GET /users/:userName/attached-policies", () => {
		it("should return attached policies for user", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice/attached-policies",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listAttachedUserPolicies).toHaveBeenCalledWith(
				"alice",
			);
		});
	});

	describe("POST /users/:userName/attached-policies", () => {
		it("should attach a policy to a user", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/users/alice/attached-policies",
				payload: { policyArn: "arn:aws:iam::aws:policy/ReadOnly" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.attachUserPolicy).toHaveBeenCalledWith(
				"alice",
				"arn:aws:iam::aws:policy/ReadOnly",
			);
		});
	});

	describe("DELETE /users/:userName/attached-policies/:policyArn", () => {
		it("should detach a policy from a user", async () => {
			const encodedArn = encodeURIComponent("arn:aws:iam::aws:policy/ReadOnly");
			const response = await app.inject({
				method: "DELETE",
				url: `/users/alice/attached-policies/${encodedArn}`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.detachUserPolicy).toHaveBeenCalledWith(
				"alice",
				"arn:aws:iam::aws:policy/ReadOnly",
			);
		});
	});

	// ── User Groups Route ────────────────────────────────────────────────────

	describe("GET /users/:userName/groups", () => {
		it("should return groups for user", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/users/alice/groups",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listGroupsForUser).toHaveBeenCalledWith("alice");
		});
	});

	// ── Group Routes ─────────────────────────────────────────────────────────

	describe("GET /groups", () => {
		it("should return list of groups", async () => {
			const response = await app.inject({ method: "GET", url: "/groups" });
			expect(response.statusCode).toBe(200);
			expect(mockService.listGroups).toHaveBeenCalled();
		});
	});

	describe("POST /groups", () => {
		it("should create a group and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/groups",
				payload: { groupName: "admins" },
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createGroup).toHaveBeenCalledWith("admins", undefined);
		});

		it("should create a group with path", async () => {
			mockService.createGroup.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/groups",
				payload: { groupName: "admins", path: "/division/" },
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createGroup).toHaveBeenCalledWith(
				"admins",
				"/division/",
			);
		});
	});

	describe("GET /groups/:groupName", () => {
		it("should return group detail", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/groups/admins",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getGroup).toHaveBeenCalledWith("admins");
		});
	});

	describe("DELETE /groups/:groupName", () => {
		it("should delete a group", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/groups/admins",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deleteGroup).toHaveBeenCalledWith("admins");
		});
	});

	// ── Group Membership Routes ──────────────────────────────────────────────

	describe("POST /groups/:groupName/members", () => {
		it("should add a user to a group", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/groups/admins/members",
				payload: { userName: "alice" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.addUserToGroup).toHaveBeenCalledWith(
				"admins",
				"alice",
			);
		});
	});

	describe("DELETE /groups/:groupName/members/:userName", () => {
		it("should remove a user from a group", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/groups/admins/members/alice",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.removeUserFromGroup).toHaveBeenCalledWith(
				"admins",
				"alice",
			);
		});
	});

	// ── Group Inline Policy Routes ───────────────────────────────────────────

	describe("GET /groups/:groupName/inline-policies", () => {
		it("should return list of inline policy names for group", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/groups/admins/inline-policies",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listGroupPolicies).toHaveBeenCalledWith("admins");
		});
	});

	describe("GET /groups/:groupName/inline-policies/:policyName", () => {
		it("should return group inline policy detail", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/groups/admins/inline-policies/group-policy",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getGroupPolicy).toHaveBeenCalledWith(
				"admins",
				"group-policy",
			);
		});
	});

	describe("PUT /groups/:groupName/inline-policies/:policyName", () => {
		it("should put a group inline policy", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/groups/admins/inline-policies/group-policy",
				payload: {
					policyDocument: '{"Version":"2012-10-17","Statement":[]}',
				},
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.putGroupPolicy).toHaveBeenCalledWith(
				"admins",
				"group-policy",
				'{"Version":"2012-10-17","Statement":[]}',
			);
		});
	});

	describe("DELETE /groups/:groupName/inline-policies/:policyName", () => {
		it("should delete a group inline policy", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/groups/admins/inline-policies/group-policy",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deleteGroupPolicy).toHaveBeenCalledWith(
				"admins",
				"group-policy",
			);
		});
	});

	// ── Group Attached Policy Routes ─────────────────────────────────────────

	describe("GET /groups/:groupName/attached-policies", () => {
		it("should return attached policies for group", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/groups/admins/attached-policies",
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listAttachedGroupPolicies).toHaveBeenCalledWith(
				"admins",
			);
		});
	});

	describe("POST /groups/:groupName/attached-policies", () => {
		it("should attach a policy to a group", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/groups/admins/attached-policies",
				payload: { policyArn: "arn:aws:iam::aws:policy/ReadOnly" },
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.attachGroupPolicy).toHaveBeenCalledWith(
				"admins",
				"arn:aws:iam::aws:policy/ReadOnly",
			);
		});
	});

	describe("DELETE /groups/:groupName/attached-policies/:policyArn", () => {
		it("should detach a policy from a group", async () => {
			const encodedArn = encodeURIComponent("arn:aws:iam::aws:policy/ReadOnly");
			const response = await app.inject({
				method: "DELETE",
				url: `/groups/admins/attached-policies/${encodedArn}`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.detachGroupPolicy).toHaveBeenCalledWith(
				"admins",
				"arn:aws:iam::aws:policy/ReadOnly",
			);
		});
	});

	// ── Managed Policy Routes ────────────────────────────────────────────────

	describe("GET /policies", () => {
		it("should return list of managed policies", async () => {
			const response = await app.inject({ method: "GET", url: "/policies" });
			expect(response.statusCode).toBe(200);
			expect(mockService.listManagedPolicies).toHaveBeenCalled();
		});
	});

	describe("POST /policies", () => {
		it("should create a managed policy and return 201", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/policies",
				payload: {
					policyName: "my-policy",
					policyDocument: '{"Version":"2012-10-17","Statement":[]}',
				},
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createPolicy).toHaveBeenCalledWith(
				"my-policy",
				'{"Version":"2012-10-17","Statement":[]}',
				undefined,
				undefined,
			);
		});

		it("should create a managed policy with description and path", async () => {
			mockService.createPolicy.mockClear();
			const response = await app.inject({
				method: "POST",
				url: "/policies",
				payload: {
					policyName: "my-policy",
					policyDocument: '{"Version":"2012-10-17","Statement":[]}',
					description: "My policy",
					path: "/division/",
				},
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createPolicy).toHaveBeenCalledWith(
				"my-policy",
				'{"Version":"2012-10-17","Statement":[]}',
				"My policy",
				"/division/",
			);
		});
	});

	describe("GET /policies/:policyArn", () => {
		it("should return managed policy detail", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "GET",
				url: `/policies/${encodedArn}`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getPolicy).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
		});
	});

	describe("DELETE /policies/:policyArn", () => {
		it("should delete a managed policy", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "DELETE",
				url: `/policies/${encodedArn}`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deletePolicy).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
		});
	});

	describe("GET /policies/:policyArn/document", () => {
		it("should return policy document", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "GET",
				url: `/policies/${encodedArn}/document`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getPolicyDocument).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
				undefined,
			);
		});

		it("should pass versionId when provided", async () => {
			mockService.getPolicyDocument.mockClear();
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "GET",
				url: `/policies/${encodedArn}/document?versionId=v2`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.getPolicyDocument).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
				"v2",
			);
		});
	});

	// ── Policy Version Routes ────────────────────────────────────────────────

	describe("GET /policies/:policyArn/versions", () => {
		it("should return list of policy versions", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "GET",
				url: `/policies/${encodedArn}/versions`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.listPolicyVersions).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
		});
	});

	describe("POST /policies/:policyArn/versions", () => {
		it("should create a policy version and return 201", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "POST",
				url: `/policies/${encodedArn}/versions`,
				payload: {
					policyDocument: '{"Version":"2012-10-17","Statement":[]}',
					setAsDefault: true,
				},
			});
			expect(response.statusCode).toBe(201);
			expect(mockService.createPolicyVersion).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
				'{"Version":"2012-10-17","Statement":[]}',
				true,
			);
		});
	});

	describe("DELETE /policies/:policyArn/versions/:versionId", () => {
		it("should delete a policy version", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "DELETE",
				url: `/policies/${encodedArn}/versions/v1`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.deletePolicyVersion).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
				"v1",
			);
		});
	});

	describe("PUT /policies/:policyArn/versions/:versionId/default", () => {
		it("should set the default policy version", async () => {
			const encodedArn = encodeURIComponent(
				"arn:aws:iam::000000000000:policy/my-policy",
			);
			const response = await app.inject({
				method: "PUT",
				url: `/policies/${encodedArn}/versions/v2/default`,
			});
			expect(response.statusCode).toBe(200);
			expect(mockService.setDefaultPolicyVersion).toHaveBeenCalledWith(
				"arn:aws:iam::000000000000:policy/my-policy",
				"v2",
			);
		});
	});
});
