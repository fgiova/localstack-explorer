import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SNSClient } from "@aws-sdk/client-sns";
import { IAMClient } from "@aws-sdk/client-iam";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { config } from "../config.js";

const commonConfig = {
  endpoint: config.localstackEndpoint,
  region: config.localstackRegion,
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
};

export function createS3Client(): S3Client {
  return new S3Client({
    ...commonConfig,
    forcePathStyle: true,
  });
}

export function createSQSClient(): SQSClient {
  return new SQSClient(commonConfig);
}

export function createSNSClient(): SNSClient {
  return new SNSClient(commonConfig);
}

export function createIAMClient(): IAMClient {
  return new IAMClient(commonConfig);
}

export function createCloudFrontClient(): CloudFrontClient {
  return new CloudFrontClient(commonConfig);
}

export function createCloudFormationClient(): CloudFormationClient {
  return new CloudFormationClient(commonConfig);
}

export function createDynamoDBClient(): DynamoDBClient {
  return new DynamoDBClient(commonConfig);
}

export function createDynamoDBDocumentClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient(commonConfig);
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export function createDynamoDBStreamsClient(): DynamoDBStreamsClient {
  return new DynamoDBStreamsClient(commonConfig);
}
