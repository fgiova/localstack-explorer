import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { AppError } from "../../shared/errors.js";

export class CloudFrontService {
  constructor(private client: CloudFrontClient) {}

  async listDistributions() {
    throw new AppError("CloudFront listDistributions not implemented", 501, "NOT_IMPLEMENTED");
  }

  async getDistribution(_id: string) {
    throw new AppError("CloudFront getDistribution not implemented", 501, "NOT_IMPLEMENTED");
  }

  async createDistribution(_originDomainName: string) {
    throw new AppError("CloudFront createDistribution not implemented", 501, "NOT_IMPLEMENTED");
  }

  async deleteDistribution(_id: string) {
    throw new AppError("CloudFront deleteDistribution not implemented", 501, "NOT_IMPLEMENTED");
  }
}
