import Type, { type Static } from "typebox";

// --- User schemas ---

export const UserSchema = Type.Object({
  userName: Type.String(),
  userId: Type.String(),
  arn: Type.String(),
  createDate: Type.Optional(Type.String()),
  path: Type.Optional(Type.String()),
});
export type User = Static<typeof UserSchema>;

export const UserDetailSchema = Type.Object({
  userName: Type.String(),
  userId: Type.String(),
  arn: Type.String(),
  createDate: Type.Optional(Type.String()),
  path: Type.Optional(Type.String()),
});
export type UserDetail = Static<typeof UserDetailSchema>;

export const CreateUserBodySchema = Type.Object({
  userName: Type.String({ minLength: 1 }),
  path: Type.Optional(Type.String()),
});
export type CreateUserBody = Static<typeof CreateUserBodySchema>;

export const UserListResponseSchema = Type.Object({
  users: Type.Array(UserSchema),
});
export type UserListResponse = Static<typeof UserListResponseSchema>;

// --- Access Key schemas ---

export const AccessKeySchema = Type.Object({
  accessKeyId: Type.String(),
  status: Type.String(),
  createDate: Type.Optional(Type.String()),
  userName: Type.String(),
});
export type AccessKey = Static<typeof AccessKeySchema>;

export const AccessKeyListResponseSchema = Type.Object({
  accessKeys: Type.Array(AccessKeySchema),
});
export type AccessKeyListResponse = Static<typeof AccessKeyListResponseSchema>;

export const CreateAccessKeyResponseSchema = Type.Object({
  accessKeyId: Type.String(),
  secretAccessKey: Type.String(),
  status: Type.String(),
  userName: Type.String(),
  createDate: Type.Optional(Type.String()),
});
export type CreateAccessKeyResponse = Static<typeof CreateAccessKeyResponseSchema>;

export const UpdateAccessKeyBodySchema = Type.Object({
  status: Type.Union([Type.Literal("Active"), Type.Literal("Inactive")]),
});
export type UpdateAccessKeyBody = Static<typeof UpdateAccessKeyBodySchema>;

// --- Inline Policy schemas ---

export const InlinePolicyNameListResponseSchema = Type.Object({
  policyNames: Type.Array(Type.String()),
});
export type InlinePolicyNameListResponse = Static<typeof InlinePolicyNameListResponseSchema>;

export const InlinePolicyDetailSchema = Type.Object({
  policyName: Type.String(),
  policyDocument: Type.String(),
});
export type InlinePolicyDetail = Static<typeof InlinePolicyDetailSchema>;

export const PutInlinePolicyBodySchema = Type.Object({
  policyDocument: Type.String(),
});
export type PutInlinePolicyBody = Static<typeof PutInlinePolicyBodySchema>;

// --- Managed Policy schemas ---

export const ManagedPolicySchema = Type.Object({
  policyName: Type.String(),
  policyId: Type.String(),
  arn: Type.String(),
  attachmentCount: Type.Optional(Type.Number()),
  createDate: Type.Optional(Type.String()),
  defaultVersionId: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
});
export type ManagedPolicy = Static<typeof ManagedPolicySchema>;

export const ManagedPolicyListResponseSchema = Type.Object({
  policies: Type.Array(ManagedPolicySchema),
});
export type ManagedPolicyListResponse = Static<typeof ManagedPolicyListResponseSchema>;

export const ManagedPolicyDetailSchema = Type.Object({
  policyName: Type.String(),
  policyId: Type.String(),
  arn: Type.String(),
  attachmentCount: Type.Optional(Type.Number()),
  createDate: Type.Optional(Type.String()),
  defaultVersionId: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  policyDocument: Type.Optional(Type.String()),
});
export type ManagedPolicyDetail = Static<typeof ManagedPolicyDetailSchema>;

export const CreateManagedPolicyBodySchema = Type.Object({
  policyName: Type.String({ minLength: 1 }),
  policyDocument: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  path: Type.Optional(Type.String()),
});
export type CreateManagedPolicyBody = Static<typeof CreateManagedPolicyBodySchema>;

export const AttachedPolicySchema = Type.Object({
  policyName: Type.String(),
  policyArn: Type.String(),
});
export type AttachedPolicy = Static<typeof AttachedPolicySchema>;

export const AttachedPolicyListResponseSchema = Type.Object({
  attachedPolicies: Type.Array(AttachedPolicySchema),
});
export type AttachedPolicyListResponse = Static<typeof AttachedPolicyListResponseSchema>;

// --- Policy Version schemas ---

export const PolicyVersionSchema = Type.Object({
  versionId: Type.String(),
  isDefaultVersion: Type.Boolean(),
  createDate: Type.Optional(Type.String()),
  document: Type.Optional(Type.String()),
});
export type PolicyVersion = Static<typeof PolicyVersionSchema>;

export const PolicyVersionListResponseSchema = Type.Object({
  versions: Type.Array(PolicyVersionSchema),
});
export type PolicyVersionListResponse = Static<typeof PolicyVersionListResponseSchema>;

export const CreatePolicyVersionBodySchema = Type.Object({
  policyDocument: Type.String({ minLength: 1 }),
  setAsDefault: Type.Boolean(),
});
export type CreatePolicyVersionBody = Static<typeof CreatePolicyVersionBodySchema>;

// --- Group schemas ---

export const GroupSchema = Type.Object({
  groupName: Type.String(),
  groupId: Type.String(),
  arn: Type.String(),
  createDate: Type.Optional(Type.String()),
  path: Type.Optional(Type.String()),
});
export type Group = Static<typeof GroupSchema>;

export const GroupListResponseSchema = Type.Object({
  groups: Type.Array(GroupSchema),
});
export type GroupListResponse = Static<typeof GroupListResponseSchema>;

export const CreateGroupBodySchema = Type.Object({
  groupName: Type.String({ minLength: 1 }),
  path: Type.Optional(Type.String()),
});
export type CreateGroupBody = Static<typeof CreateGroupBodySchema>;

export const GroupMemberSchema = Type.Object({
  userName: Type.String(),
  userId: Type.String(),
  arn: Type.String(),
});
export type GroupMember = Static<typeof GroupMemberSchema>;

export const GroupDetailResponseSchema = Type.Object({
  group: GroupSchema,
  members: Type.Array(GroupMemberSchema),
});
export type GroupDetailResponse = Static<typeof GroupDetailResponseSchema>;

// --- Common schemas ---

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});
export type MessageResponse = Static<typeof MessageResponseSchema>;

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
export type DeleteResponse = Static<typeof DeleteResponseSchema>;

export const AttachPolicyBodySchema = Type.Object({
  policyArn: Type.String({ minLength: 1 }),
});
export type AttachPolicyBody = Static<typeof AttachPolicyBodySchema>;

export const AddUserToGroupBodySchema = Type.Object({
  userName: Type.String({ minLength: 1 }),
});
export type AddUserToGroupBody = Static<typeof AddUserToGroupBodySchema>;
