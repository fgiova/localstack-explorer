import { SQSClient } from "@aws-sdk/client-sqs";
import { AppError } from "../../shared/errors.js";

export class SQSService {
  constructor(private client: SQSClient) {}

  async listQueues() {
    throw new AppError("SQS listQueues not implemented", 501, "NOT_IMPLEMENTED");
  }

  async createQueue(_name: string) {
    throw new AppError("SQS createQueue not implemented", 501, "NOT_IMPLEMENTED");
  }

  async deleteQueue(_queueUrl: string) {
    throw new AppError("SQS deleteQueue not implemented", 501, "NOT_IMPLEMENTED");
  }

  async sendMessage(_queueUrl: string, _body: string) {
    throw new AppError("SQS sendMessage not implemented", 501, "NOT_IMPLEMENTED");
  }

  async receiveMessages(_queueUrl: string) {
    throw new AppError("SQS receiveMessages not implemented", 501, "NOT_IMPLEMENTED");
  }
}
