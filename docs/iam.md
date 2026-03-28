# IAM Service Guide

IAM is a fully implemented service in LocalStack Explorer. It supports comprehensive management of users, groups, managed policies, inline policies, access keys, and policy versioning.

## Features

- List, create, and delete users with cascading cleanup
- Manage user access keys (create, delete, toggle active/inactive)
- List, create, and delete groups with member management
- Create and manage managed policies with versioning
- Attach/detach managed policies to users and groups
- Create, edit, and delete inline policies on users and groups
- Policy document editing with Monaco editor (JSON)
- Search/filter across all list views

## API Endpoints

All endpoints are prefixed with `/api/iam`.

### Users

| Method | Path                  | Description  | Request                              | Response                |
|--------|-----------------------|--------------|--------------------------------------|-------------------------|
| GET    | `/users`              | List users   | —                                    | `{ users: [...] }`     |
| POST   | `/users`              | Create user  | `{ userName, path? }`                | `{ user: {...} }`      |
| GET    | `/users/:userName`    | Get user     | —                                    | `{ user: {...} }`      |
| DELETE | `/users/:userName`    | Delete user  | —                                    | `{ success: boolean }` |

### Access Keys

| Method | Path                                            | Description        | Request                    |
|--------|-------------------------------------------------|--------------------|----------------------------|
| GET    | `/users/:userName/access-keys`                  | List access keys   | —                          |
| POST   | `/users/:userName/access-keys`                  | Create access key  | —                          |
| DELETE | `/users/:userName/access-keys/:accessKeyId`     | Delete access key  | —                          |
| PUT    | `/users/:userName/access-keys/:accessKeyId`     | Update key status  | `{ status: "Active"\|"Inactive" }` |

### User Inline Policies

| Method | Path                                             | Description     | Request                              |
|--------|--------------------------------------------------|-----------------|--------------------------------------|
| GET    | `/users/:userName/inline-policies`               | List policies   | —                                    |
| GET    | `/users/:userName/inline-policies/:policyName`   | Get policy      | —                                    |
| PUT    | `/users/:userName/inline-policies/:policyName`   | Create/update   | `{ policyDocument: string }`         |
| DELETE | `/users/:userName/inline-policies/:policyName`   | Delete policy   | —                                    |

### User Attached Policies

| Method | Path                                             | Description     | Request                   |
|--------|--------------------------------------------------|-----------------|---------------------------|
| GET    | `/users/:userName/attached-policies`             | List attached   | —                         |
| POST   | `/users/:userName/attached-policies`             | Attach policy   | `{ policyArn: string }`  |
| DELETE | `/users/:userName/attached-policies/:policyArn`  | Detach policy   | —                         |

### User Groups

| Method | Path                          | Description          |
|--------|-------------------------------|----------------------|
| GET    | `/users/:userName/groups`     | List groups for user |

### Groups

| Method | Path                    | Description   | Request                              | Response                |
|--------|-------------------------|---------------|--------------------------------------|-------------------------|
| GET    | `/groups`               | List groups   | —                                    | `{ groups: [...] }`    |
| POST   | `/groups`               | Create group  | `{ groupName, path? }`              | `{ group: {...} }`     |
| GET    | `/groups/:groupName`    | Get group     | —                                    | `{ group: {...} }`     |
| DELETE | `/groups/:groupName`    | Delete group  | —                                    | `{ success: boolean }` |

### Group Membership

| Method | Path                                       | Description    | Request                  |
|--------|--------------------------------------------|----------------|--------------------------|
| POST   | `/groups/:groupName/members`               | Add member     | `{ userName: string }`  |
| DELETE | `/groups/:groupName/members/:userName`     | Remove member  | —                        |

### Group Inline Policies

| Method | Path                                                | Description     | Request                      |
|--------|-----------------------------------------------------|-----------------|------------------------------|
| GET    | `/groups/:groupName/inline-policies`                | List policies   | —                            |
| GET    | `/groups/:groupName/inline-policies/:policyName`    | Get policy      | —                            |
| PUT    | `/groups/:groupName/inline-policies/:policyName`    | Create/update   | `{ policyDocument: string }` |
| DELETE | `/groups/:groupName/inline-policies/:policyName`    | Delete policy   | —                            |

### Group Attached Policies

| Method | Path                                                | Description     | Request                  |
|--------|-----------------------------------------------------|-----------------|--------------------------|
| GET    | `/groups/:groupName/attached-policies`              | List attached   | —                        |
| POST   | `/groups/:groupName/attached-policies`              | Attach policy   | `{ policyArn: string }` |
| DELETE | `/groups/:groupName/attached-policies/:policyArn`   | Detach policy   | —                        |

### Managed Policies

| Method | Path                    | Description     | Request                                                  | Query Params          |
|--------|-------------------------|-----------------|----------------------------------------------------------|-----------------------|
| GET    | `/policies`             | List policies   | —                                                        | `scope=Local\|AWS\|All` |
| POST   | `/policies`             | Create policy   | `{ policyName, policyDocument, description?, path? }`    | —                     |
| GET    | `/policies/:policyArn`  | Get policy      | —                                                        | —                     |
| DELETE | `/policies/:policyArn`  | Delete policy   | —                                                        | —                     |
| GET    | `/policies/:policyArn/document` | Get document | —                                                   | `versionId?`          |

### Policy Versions

| Method | Path                                                  | Description         | Request                                     |
|--------|-------------------------------------------------------|---------------------|---------------------------------------------|
| GET    | `/policies/:policyArn/versions`                       | List versions       | —                                           |
| POST   | `/policies/:policyArn/versions`                       | Create version      | `{ policyDocument, setAsDefault? }`         |
| DELETE | `/policies/:policyArn/versions/:versionId`            | Delete version      | —                                           |
| PUT    | `/policies/:policyArn/versions/:versionId/default`    | Set default version | —                                           |

### Request/Response Examples

**List users:**

```bash
curl http://localhost:3001/api/iam/users
```

```json
{
  "users": [
    {
      "userName": "admin",
      "userId": "AIDAEXAMPLE",
      "arn": "arn:aws:iam::000000000000:user/admin",
      "path": "/",
      "createDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Create user:**

```bash
curl -X POST http://localhost:3001/api/iam/users \
  -H "Content-Type: application/json" \
  -d '{"userName": "developer", "path": "/engineering/"}'
```

**Create access key:**

```bash
curl -X POST http://localhost:3001/api/iam/users/developer/access-keys
```

```json
{
  "accessKey": {
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "status": "Active",
    "createDate": "2024-01-15T10:30:00.000Z"
  }
}
```

**Create managed policy:**

```bash
curl -X POST http://localhost:3001/api/iam/policies \
  -H "Content-Type: application/json" \
  -d '{
    "policyName": "S3ReadOnly",
    "description": "Read-only access to S3",
    "policyDocument": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:ListBucket\"],\"Resource\":\"*\"}]}"
  }'
```

**Attach policy to user:**

```bash
curl -X POST http://localhost:3001/api/iam/users/developer/attached-policies \
  -H "Content-Type: application/json" \
  -d '{"policyArn": "arn:aws:iam::000000000000:policy/S3ReadOnly"}'
```

## Error Handling

The IAM service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                    | Status | Error Code                        |
|-----------------------------|--------|-----------------------------------|
| Entity not found            | 404    | `NoSuchEntityException`           |
| Entity already exists       | 409    | `EntityAlreadyExistsException`    |
| Delete conflict             | 409    | `DeleteConflictException`         |
| Rate limit exceeded         | 429    | `LimitExceededException`          |
| Malformed policy document   | 400    | `MalformedPolicyDocumentException`|
| Invalid input               | 400    | `InvalidInputException`           |

All errors return a consistent JSON shape:

```json
{
  "error": "NoSuchEntityException",
  "message": "The user with name developer cannot be found.",
  "statusCode": 404
}
```

## Cascading Deletes

Deleting a user, group, or policy automatically cleans up all associated resources:

- **Delete user**: removes access keys, inline policies, detaches managed policies, removes from groups
- **Delete group**: removes members, deletes inline policies, detaches managed policies
- **Delete policy**: deletes all non-default versions, detaches from all users and groups

## Backend Implementation

The IAM plugin consists of four files in `packages/backend/src/plugins/iam/`:

| File           | Purpose                                                               |
|----------------|-----------------------------------------------------------------------|
| `index.ts`     | Plugin registration — creates the IAM client and service              |
| `service.ts`   | `IAMService` class — business logic wrapping AWS SDK IAM commands     |
| `routes.ts`    | Fastify route definitions with TypeBox validation schemas             |
| `schemas.ts`   | TypeBox schemas for all request inputs and response outputs           |

### IAMService Methods

| Category         | Method                          | AWS SDK Command                  |
|------------------|---------------------------------|----------------------------------|
| Users            | `listUsers()`                   | `ListUsersCommand`               |
| Users            | `createUser(userName, path?)`   | `CreateUserCommand`              |
| Users            | `getUser(userName)`             | `GetUserCommand`                 |
| Users            | `deleteUser(userName)`          | Multiple cleanup + `DeleteUserCommand` |
| Access Keys      | `listAccessKeys(userName)`      | `ListAccessKeysCommand`          |
| Access Keys      | `createAccessKey(userName)`     | `CreateAccessKeyCommand`         |
| Access Keys      | `deleteAccessKey(...)`          | `DeleteAccessKeyCommand`         |
| Access Keys      | `updateAccessKey(...)`          | `UpdateAccessKeyCommand`         |
| Groups           | `listGroups()`                  | `ListGroupsCommand`              |
| Groups           | `createGroup(groupName, path?)` | `CreateGroupCommand`             |
| Groups           | `getGroup(groupName)`           | `GetGroupCommand`                |
| Groups           | `deleteGroup(groupName)`        | Multiple cleanup + `DeleteGroupCommand` |
| Membership       | `addUserToGroup(...)`           | `AddUserToGroupCommand`          |
| Membership       | `removeUserFromGroup(...)`      | `RemoveUserFromGroupCommand`     |
| Membership       | `listGroupsForUser(userName)`   | `ListGroupsForUserCommand`       |
| Inline Policies  | `putUserPolicy(...)`            | `PutUserPolicyCommand`           |
| Inline Policies  | `getUserPolicy(...)`            | `GetUserPolicyCommand`           |
| Inline Policies  | `deleteUserPolicy(...)`         | `DeleteUserPolicyCommand`        |
| Inline Policies  | `putGroupPolicy(...)`           | `PutGroupPolicyCommand`          |
| Inline Policies  | `getGroupPolicy(...)`           | `GetGroupPolicyCommand`          |
| Inline Policies  | `deleteGroupPolicy(...)`        | `DeleteGroupPolicyCommand`       |
| Managed Policies | `listManagedPolicies(scope?)`   | `ListPoliciesCommand`            |
| Managed Policies | `createPolicy(...)`             | `CreatePolicyCommand`            |
| Managed Policies | `getPolicy(policyArn)`          | `GetPolicyCommand`               |
| Managed Policies | `deletePolicy(policyArn)`       | Multiple cleanup + `DeletePolicyCommand` |
| Managed Policies | `getPolicyDocument(...)`        | `GetPolicyVersionCommand`        |
| Versioning       | `listPolicyVersions(...)`       | `ListPolicyVersionsCommand`      |
| Versioning       | `createPolicyVersion(...)`      | `CreatePolicyVersionCommand`     |
| Versioning       | `deletePolicyVersion(...)`      | `DeletePolicyVersionCommand`     |
| Versioning       | `setDefaultPolicyVersion(...)`  | `SetDefaultPolicyVersionCommand` |
| Attach/Detach    | `attachUserPolicy(...)`         | `AttachUserPolicyCommand`        |
| Attach/Detach    | `detachUserPolicy(...)`         | `DetachUserPolicyCommand`        |
| Attach/Detach    | `attachGroupPolicy(...)`        | `AttachGroupPolicyCommand`       |
| Attach/Detach    | `detachGroupPolicy(...)`        | `DetachGroupPolicyCommand`       |

## Frontend Components

The IAM frontend is in `packages/frontend/src/components/iam/` and `packages/frontend/src/routes/iam/`.

### List Components

| Component       | Description                                              |
|-----------------|----------------------------------------------------------|
| `UserList`      | Table of users with search, create, and delete           |
| `GroupList`     | Table of groups with search, create, and delete          |
| `PolicyList`    | Table of managed policies with search, create, and delete|

### Dialog Components

| Component           | Description                                          |
|---------------------|------------------------------------------------------|
| `CreateUserDialog`  | Form to create user (userName + optional path)       |
| `CreateGroupDialog` | Form to create group (groupName + optional path)     |
| `CreatePolicyDialog`| Form with Monaco editor for JSON policy documents    |

### Detail Components

| Component      | Tabs                                                                       |
|----------------|----------------------------------------------------------------------------|
| `UserDetail`   | Info, Access Keys, Inline Policies, Managed Policies, Groups (5 tabs)      |
| `GroupDetail`  | Info, Members, Inline Policies, Managed Policies (4 tabs)                  |
| `PolicyDetail` | Info, Policy Document, Versions (3 tabs)                                   |

### Routes

| Route                    | Component      | Description                              |
|--------------------------|----------------|------------------------------------------|
| `/iam`                   | Tabbed layout  | Main IAM page (Users/Groups/Policies)    |
| `/iam/users/$userName`   | `UserDetail`   | User detail with management tabs         |
| `/iam/groups/$groupName` | `GroupDetail`   | Group detail with management tabs        |
| `/iam/policies/$policyArn` | `PolicyDetail` | Policy detail with versioning          |

### React Query Hooks

All hooks are in `packages/frontend/src/api/iam.ts`:

**Query Hooks:**

| Hook                               | Query Key                                      |
|------------------------------------|-------------------------------------------------|
| `useListUsers()`                   | `["iam", "users"]`                             |
| `useGetUser(userName)`             | `["iam", "users", userName]`                   |
| `useListAccessKeys(userName)`      | `["iam", "users", userName, "access-keys"]`    |
| `useListUserInlinePolicies(...)`   | `["iam", "users", userName, "inline-policies"]`|
| `useListAttachedUserPolicies(...)` | `["iam", "users", userName, "attached-policies"]` |
| `useListUserGroups(userName)`      | `["iam", "users", userName, "groups"]`         |
| `useListGroups()`                  | `["iam", "groups"]`                            |
| `useGetGroup(groupName)`           | `["iam", "groups", groupName]`                 |
| `useListGroupInlinePolicies(...)`  | `["iam", "groups", groupName, "inline-policies"]` |
| `useListAttachedGroupPolicies(...)` | `["iam", "groups", groupName, "attached-policies"]` |
| `useListPolicies(scope?)`          | `["iam", "policies"]`                          |
| `useGetPolicy(policyArn)`          | `["iam", "policies", policyArn]`               |
| `useGetPolicyDocument(...)`        | `["iam", "policies", policyArn, "document"]`   |
| `useListPolicyVersions(...)`       | `["iam", "policies", policyArn, "versions"]`   |

**Mutation Hooks** (all with automatic cache invalidation):

| Hook                          | Invalidates                           |
|-------------------------------|---------------------------------------|
| `useCreateUser()`             | `["iam", "users"]`                   |
| `useDeleteUser()`             | `["iam", "users"]`                   |
| `useCreateAccessKey()`        | `["iam", "users", *, "access-keys"]` |
| `useDeleteAccessKey()`        | `["iam", "users", *, "access-keys"]` |
| `useUpdateAccessKey()`        | `["iam", "users", *, "access-keys"]` |
| `usePutUserInlinePolicy()`    | `["iam", "users", *, "inline-policies"]` |
| `useDeleteUserInlinePolicy()` | `["iam", "users", *, "inline-policies"]` |
| `useAttachUserPolicy()`       | `["iam", "users", *, "attached-policies"]` |
| `useDetachUserPolicy()`       | `["iam", "users", *, "attached-policies"]` |
| `useCreateGroup()`            | `["iam", "groups"]`                  |
| `useDeleteGroup()`            | `["iam", "groups"]`                  |
| `useAddUserToGroup()`         | `["iam", "groups", *]`              |
| `useRemoveUserFromGroup()`    | `["iam", "groups", *]`              |
| `useCreatePolicy()`           | `["iam", "policies"]`               |
| `useDeletePolicy()`           | `["iam", "policies"]`               |
| `useCreatePolicyVersion()`    | `["iam", "policies", *, "versions"]`|
| `useDeletePolicyVersion()`    | `["iam", "policies", *, "versions"]`|
| `useSetDefaultPolicyVersion()`| `["iam", "policies", *, "versions"]`|
