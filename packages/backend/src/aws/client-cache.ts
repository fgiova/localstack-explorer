import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { IAMClient } from "@aws-sdk/client-iam";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export interface AwsClients {
	s3: S3Client;
	sqs: SQSClient;
	sns: SNSClient;
	iam: IAMClient;
	cloudformation: CloudFormationClient;
	dynamodb: DynamoDBClient;
	lambda: LambdaClient;
	dynamodbDocument: DynamoDBDocumentClient;
	dynamodbStreams: DynamoDBStreamsClient;
}

const MAX_CACHE_SIZE = 20;

export class ClientCache {
	private cache = new Map<string, AwsClients>();

	private makeKey(endpoint: string, region: string): string {
		return `${endpoint}::${region}`;
	}

	private createClients(endpoint: string, region: string): AwsClients {
		const commonConfig = {
			endpoint,
			region,
			credentials: {
				accessKeyId: "test",
				secretAccessKey: "test",
			},
		};

		const dynamodb = new DynamoDBClient(commonConfig);

		return {
			s3: new S3Client({ ...commonConfig, forcePathStyle: true }),
			sqs: new SQSClient(commonConfig),
			sns: new SNSClient(commonConfig),
			iam: new IAMClient(commonConfig),
			cloudformation: new CloudFormationClient(commonConfig),
			dynamodb,
			lambda: new LambdaClient(commonConfig),
			dynamodbDocument: DynamoDBDocumentClient.from(dynamodb, {
				marshallOptions: { removeUndefinedValues: true },
			}),
			dynamodbStreams: new DynamoDBStreamsClient(commonConfig),
		};
	}

	getClients(endpoint: string, region: string): AwsClients {
		const key = this.makeKey(endpoint, region);

		let clients = this.cache.get(key);
		if (clients) return clients;

		// LRU eviction: remove oldest entry if cache is full
		if (this.cache.size >= MAX_CACHE_SIZE) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) this.cache.delete(firstKey);
		}

		clients = this.createClients(endpoint, region);
		this.cache.set(key, clients);
		return clients;
	}
}
