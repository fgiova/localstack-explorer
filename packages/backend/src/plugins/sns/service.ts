import { SNSClient } from "@aws-sdk/client-sns";
import { AppError } from "../../shared/errors.js";

export class SNSService {
  constructor(private client: SNSClient) {}

  async listTopics() {
    throw new AppError("SNS listTopics not implemented", 501, "NOT_IMPLEMENTED");
  }

  async createTopic(_name: string) {
    throw new AppError("SNS createTopic not implemented", 501, "NOT_IMPLEMENTED");
  }

  async deleteTopic(_topicArn: string) {
    throw new AppError("SNS deleteTopic not implemented", 501, "NOT_IMPLEMENTED");
  }

  async listSubscriptions(_topicArn: string) {
    throw new AppError("SNS listSubscriptions not implemented", 501, "NOT_IMPLEMENTED");
  }

  async publish(_topicArn: string, _message: string) {
    throw new AppError("SNS publish not implemented", 501, "NOT_IMPLEMENTED");
  }
}
