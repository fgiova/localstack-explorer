import { IAMClient } from "@aws-sdk/client-iam";
import { AppError } from "../../shared/errors.js";

export class IAMService {
  constructor(private client: IAMClient) {}

  async listUsers() {
    throw new AppError("IAM listUsers not implemented", 501, "NOT_IMPLEMENTED");
  }

  async createUser(_userName: string) {
    throw new AppError("IAM createUser not implemented", 501, "NOT_IMPLEMENTED");
  }

  async deleteUser(_userName: string) {
    throw new AppError("IAM deleteUser not implemented", 501, "NOT_IMPLEMENTED");
  }

  async listRoles() {
    throw new AppError("IAM listRoles not implemented", 501, "NOT_IMPLEMENTED");
  }

  async listPolicies() {
    throw new AppError("IAM listPolicies not implemented", 501, "NOT_IMPLEMENTED");
  }
}
