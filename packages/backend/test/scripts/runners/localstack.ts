import { randomUUID } from "node:crypto";
import { GenericContainer, Wait } from "testcontainers";
import { spawnProcess } from "./spawnProcess.js";

const startContainer = async () => {
	const localStack = await new GenericContainer("localstack/localstack:4")
		.withExposedPorts(4566)
		.withEnvironment({
			SERVICES: "s3,sqs,sns,iam,lambda,cloudformation,dynamodb",
			DEBUG: "0",
			NODE_TLS_REJECT_UNAUTHORIZED: "0",
			HOSTNAME: "localhost",
			AWS_DEFAULT_REGION: "eu-south-1",
		})
		.withLabels({
			"org.testcontainers.reaper-session-id":
				process.env.REAPER_SESSION_ID || randomUUID(), // This is mandatory for the reaper to clean up the container
		})
		.withWaitStrategy(Wait.forListeningPorts())
		.start();
	const port = localStack.getMappedPort(4566);
	const host = localStack.getHost();
	process.env.AWS_REGION = "eu-central-1";
	process.env.AWS_DEFAULT_REGION = process.env.AWS_REGION;
	process.env.AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID";
	process.env.AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY";
	return {
		container: localStack,
		port,
		host,
	};
};

const bootstrap = async (host: string, port: number) => {
	const cdkEnv = {
		env: {
			...process.env,
			AWS_ENDPOINT_URL: `http://${host}:${port}`,
			AWS_ENDPOINT_URL_S3: `http://${host}:${port}`,
			CDK_DISABLE_LEGACY_EXPORT_WARNING: 1,
			AWS_ENVAR_ALLOWLIST: "AWS_REGION,AWS_DEFAULT_REGION",
		},
	};

	console.log("Bootstrap CDK stack to LocalStack");
	await spawnProcess("pnpm", ["cdklocal:bootstrap"], cdkEnv);

	console.log("Deploy CDK stack to LocalStack");
	await spawnProcess("pnpm", ["cdklocal:deploy"], cdkEnv);
};

export { bootstrap, startContainer };
