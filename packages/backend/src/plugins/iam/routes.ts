import type { FastifyInstance } from "fastify";
import type { IAMService } from "./service.js";
import {
  UserListResponseSchema,
  CreateUserBodySchema,
  UserDetailSchema,
  AccessKeyListResponseSchema,
  CreateAccessKeyResponseSchema,
  UpdateAccessKeyBodySchema,
  InlinePolicyNameListResponseSchema,
  InlinePolicyDetailSchema,
  PutInlinePolicyBodySchema,
  AttachedPolicyListResponseSchema,
  AttachPolicyBodySchema,
  GroupListResponseSchema,
  CreateGroupBodySchema,
  GroupDetailResponseSchema,
  AddUserToGroupBodySchema,
  ManagedPolicyListResponseSchema,
  ManagedPolicyDetailSchema,
  CreateManagedPolicyBodySchema,
  PolicyVersionSchema,
  PolicyVersionListResponseSchema,
  CreatePolicyVersionBodySchema,
  MessageResponseSchema,
  DeleteResponseSchema,
} from "./schemas.js";
import { ErrorResponseSchema } from "../../shared/types.js";

export async function iamRoutes(app: FastifyInstance, opts: { iamService: IAMService }) {
  const { iamService } = opts;

  // ── User Routes ──────────────────────────────────────────────────────

  // List users
  app.get("/users", {
    schema: {
      response: {
        200: UserListResponseSchema,
      },
    },
    handler: async () => iamService.listUsers(),
  });

  // Create user
  app.post("/users", {
    schema: {
      body: CreateUserBodySchema,
      response: {
        201: MessageResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { userName, path } = request.body as { userName: string; path?: string };
      const result = await iamService.createUser(userName, path);
      return reply.status(201).send(result);
    },
  });

  // Get user
  app.get("/users/:userName", {
    schema: {
      response: {
        200: UserDetailSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.getUser(userName);
    },
  });

  // Delete user
  app.delete("/users/:userName", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.deleteUser(userName);
    },
  });

  // ── Access Key Routes ────────────────────────────────────────────────

  // List access keys
  app.get("/users/:userName/access-keys", {
    schema: {
      response: {
        200: AccessKeyListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.listAccessKeys(userName);
    },
  });

  // Create access key
  app.post("/users/:userName/access-keys", {
    schema: {
      response: {
        201: CreateAccessKeyResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { userName } = request.params as { userName: string };
      const result = await iamService.createAccessKey(userName);
      return reply.status(201).send(result);
    },
  });

  // Delete access key
  app.delete("/users/:userName/access-keys/:accessKeyId", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, accessKeyId } = request.params as { userName: string; accessKeyId: string };
      return iamService.deleteAccessKey(userName, accessKeyId);
    },
  });

  // Update access key
  app.put("/users/:userName/access-keys/:accessKeyId", {
    schema: {
      body: UpdateAccessKeyBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, accessKeyId } = request.params as { userName: string; accessKeyId: string };
      const { status } = request.body as { status: "Active" | "Inactive" };
      return iamService.updateAccessKey(userName, accessKeyId, status);
    },
  });

  // ── User Inline Policy Routes ────────────────────────────────────────

  // List user inline policies
  app.get("/users/:userName/inline-policies", {
    schema: {
      response: {
        200: InlinePolicyNameListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.listUserPolicies(userName);
    },
  });

  // Get user inline policy
  app.get("/users/:userName/inline-policies/:policyName", {
    schema: {
      response: {
        200: InlinePolicyDetailSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, policyName } = request.params as { userName: string; policyName: string };
      return iamService.getUserPolicy(userName, policyName);
    },
  });

  // Put user inline policy
  app.put("/users/:userName/inline-policies/:policyName", {
    schema: {
      body: PutInlinePolicyBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, policyName } = request.params as { userName: string; policyName: string };
      const { policyDocument } = request.body as { policyDocument: string };
      return iamService.putUserPolicy(userName, policyName, policyDocument);
    },
  });

  // Delete user inline policy
  app.delete("/users/:userName/inline-policies/:policyName", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, policyName } = request.params as { userName: string; policyName: string };
      return iamService.deleteUserPolicy(userName, policyName);
    },
  });

  // ── User Attached Policy Routes ──────────────────────────────────────

  // List attached user policies
  app.get("/users/:userName/attached-policies", {
    schema: {
      response: {
        200: AttachedPolicyListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.listAttachedUserPolicies(userName);
    },
  });

  // Attach policy to user
  app.post("/users/:userName/attached-policies", {
    schema: {
      body: AttachPolicyBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      const { policyArn } = request.body as { policyArn: string };
      return iamService.attachUserPolicy(userName, policyArn);
    },
  });

  // Detach policy from user
  app.delete("/users/:userName/attached-policies/:policyArn", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName, policyArn } = request.params as { userName: string; policyArn: string };
      return iamService.detachUserPolicy(userName, decodeURIComponent(policyArn));
    },
  });

  // ── User Groups Route ────────────────────────────────────────────────

  // List groups for user
  app.get("/users/:userName/groups", {
    schema: {
      response: {
        200: GroupListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { userName } = request.params as { userName: string };
      return iamService.listGroupsForUser(userName);
    },
  });

  // ── Group Routes ─────────────────────────────────────────────────────

  // List groups
  app.get("/groups", {
    schema: {
      response: {
        200: GroupListResponseSchema,
      },
    },
    handler: async () => iamService.listGroups(),
  });

  // Create group
  app.post("/groups", {
    schema: {
      body: CreateGroupBodySchema,
      response: {
        201: MessageResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { groupName, path } = request.body as { groupName: string; path?: string };
      const result = await iamService.createGroup(groupName, path);
      return reply.status(201).send(result);
    },
  });

  // Get group
  app.get("/groups/:groupName", {
    schema: {
      response: {
        200: GroupDetailResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      return iamService.getGroup(groupName);
    },
  });

  // Delete group
  app.delete("/groups/:groupName", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      return iamService.deleteGroup(groupName);
    },
  });

  // ── Group Membership Routes ──────────────────────────────────────────

  // Add user to group
  app.post("/groups/:groupName/members", {
    schema: {
      body: AddUserToGroupBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      const { userName } = request.body as { userName: string };
      return iamService.addUserToGroup(groupName, userName);
    },
  });

  // Remove user from group
  app.delete("/groups/:groupName/members/:userName", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName, userName } = request.params as { groupName: string; userName: string };
      return iamService.removeUserFromGroup(groupName, userName);
    },
  });

  // ── Group Inline Policy Routes ───────────────────────────────────────

  // List group inline policies
  app.get("/groups/:groupName/inline-policies", {
    schema: {
      response: {
        200: InlinePolicyNameListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      return iamService.listGroupPolicies(groupName);
    },
  });

  // Get group inline policy
  app.get("/groups/:groupName/inline-policies/:policyName", {
    schema: {
      response: {
        200: InlinePolicyDetailSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName, policyName } = request.params as { groupName: string; policyName: string };
      return iamService.getGroupPolicy(groupName, policyName);
    },
  });

  // Put group inline policy
  app.put("/groups/:groupName/inline-policies/:policyName", {
    schema: {
      body: PutInlinePolicyBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName, policyName } = request.params as { groupName: string; policyName: string };
      const { policyDocument } = request.body as { policyDocument: string };
      return iamService.putGroupPolicy(groupName, policyName, policyDocument);
    },
  });

  // Delete group inline policy
  app.delete("/groups/:groupName/inline-policies/:policyName", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName, policyName } = request.params as { groupName: string; policyName: string };
      return iamService.deleteGroupPolicy(groupName, policyName);
    },
  });

  // ── Group Attached Policy Routes ─────────────────────────────────────

  // List attached group policies
  app.get("/groups/:groupName/attached-policies", {
    schema: {
      response: {
        200: AttachedPolicyListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      return iamService.listAttachedGroupPolicies(groupName);
    },
  });

  // Attach policy to group
  app.post("/groups/:groupName/attached-policies", {
    schema: {
      body: AttachPolicyBodySchema,
      response: {
        200: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName } = request.params as { groupName: string };
      const { policyArn } = request.body as { policyArn: string };
      return iamService.attachGroupPolicy(groupName, policyArn);
    },
  });

  // Detach policy from group
  app.delete("/groups/:groupName/attached-policies/:policyArn", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { groupName, policyArn } = request.params as { groupName: string; policyArn: string };
      return iamService.detachGroupPolicy(groupName, decodeURIComponent(policyArn));
    },
  });

  // ── Managed Policy Routes ────────────────────────────────────────────

  // List managed policies
  app.get("/policies", {
    schema: {
      response: {
        200: ManagedPolicyListResponseSchema,
      },
    },
    handler: async (request) => {
      const { scope } = request.query as { scope?: string };
      return iamService.listManagedPolicies(scope);
    },
  });

  // Create managed policy
  app.post("/policies", {
    schema: {
      body: CreateManagedPolicyBodySchema,
      response: {
        201: MessageResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { policyName, policyDocument, description, path } = request.body as {
        policyName: string;
        policyDocument: string;
        description?: string;
        path?: string;
      };
      const result = await iamService.createPolicy(policyName, policyDocument, description, path);
      return reply.status(201).send(result);
    },
  });

  // Get managed policy
  app.get("/policies/:policyArn", {
    schema: {
      response: {
        200: ManagedPolicyDetailSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn } = request.params as { policyArn: string };
      return iamService.getPolicy(decodeURIComponent(policyArn));
    },
  });

  // Delete managed policy
  app.delete("/policies/:policyArn", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn } = request.params as { policyArn: string };
      return iamService.deletePolicy(decodeURIComponent(policyArn));
    },
  });

  // Get policy document
  app.get("/policies/:policyArn/document", {
    schema: {
      response: {
        200: PolicyVersionSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn } = request.params as { policyArn: string };
      const { versionId } = request.query as { versionId?: string };
      return iamService.getPolicyDocument(decodeURIComponent(policyArn), versionId);
    },
  });

  // ── Policy Version Routes ────────────────────────────────────────────

  // List policy versions
  app.get("/policies/:policyArn/versions", {
    schema: {
      response: {
        200: PolicyVersionListResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn } = request.params as { policyArn: string };
      return iamService.listPolicyVersions(decodeURIComponent(policyArn));
    },
  });

  // Create policy version
  app.post("/policies/:policyArn/versions", {
    schema: {
      body: CreatePolicyVersionBodySchema,
      response: {
        201: MessageResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { policyArn } = request.params as { policyArn: string };
      const { policyDocument, setAsDefault } = request.body as {
        policyDocument: string;
        setAsDefault: boolean;
      };
      const result = await iamService.createPolicyVersion(
        decodeURIComponent(policyArn),
        policyDocument,
        setAsDefault,
      );
      return reply.status(201).send(result);
    },
  });

  // Delete policy version
  app.delete("/policies/:policyArn/versions/:versionId", {
    schema: {
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn, versionId } = request.params as { policyArn: string; versionId: string };
      return iamService.deletePolicyVersion(decodeURIComponent(policyArn), versionId);
    },
  });

  // Set default policy version
  app.put("/policies/:policyArn/versions/:versionId/default", {
    schema: {
      response: {
        200: MessageResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request) => {
      const { policyArn, versionId } = request.params as { policyArn: string; versionId: string };
      return iamService.setDefaultPolicyVersion(decodeURIComponent(policyArn), versionId);
    },
  });
}
