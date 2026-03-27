import Type, { type Static } from "typebox";

export const UserSchema = Type.Object({
  userName: Type.String(),
  userId: Type.String(),
  arn: Type.String(),
  createDate: Type.Optional(Type.String()),
});
export type User = Static<typeof UserSchema>;

export const UserListResponseSchema = Type.Object({
  users: Type.Array(UserSchema),
});

export const RoleSchema = Type.Object({
  roleName: Type.String(),
  roleId: Type.String(),
  arn: Type.String(),
});

export const PolicySchema = Type.Object({
  policyName: Type.String(),
  policyId: Type.String(),
  arn: Type.String(),
});

export const CreateUserBodySchema = Type.Object({
  userName: Type.String({ minLength: 1 }),
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
});
