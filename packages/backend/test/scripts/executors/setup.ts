import { randomUUID } from "node:crypto";
import { lookup } from "node:dns";
import { getContainerRuntimeClient } from "testcontainers";
import { getReaper } from "testcontainers/build/reaper/reaper.js";
import { startContainer as startContainerLocalStack } from "../runners/localstack.js";

async function hostResolve(host: string): Promise<string> {
	return await new Promise((resolve, reject) => {
		lookup(host, { family: 4 }, (err, address) => {
			if (err) {
				return reject(err);
			}
			return resolve(address);
		});
	});
}

const startReaper = async () => {
	if (
		process.env.TESTCONTAINERS_RYUK_DISABLED === "true" ||
		process.env.TESTCONTAINERS_RYUK_DISABLED === "1"
	) {
		return {};
	}
	const containerRuntimeClient = await getContainerRuntimeClient();
	await getReaper(containerRuntimeClient);
	const runningContainers = await containerRuntimeClient.container.list();
	const reaper = runningContainers.find(
		(container) => container.Labels["org.testcontainers.ryuk"] === "true",
	);
	const reaperNetwork = reaper?.Ports.find((port) => port.PrivatePort === 8080);
	const reaperPort = reaperNetwork?.PublicPort;
	const reaperIp = containerRuntimeClient.info.containerRuntime.host;
	const reaperSessionId = reaper?.Labels["org.testcontainers.session-id"];
	return {
		REAPER: `${reaperIp}:${reaperPort}`,
		REAPER_SESSION: reaperSessionId,
	};
};

export default async function globalSetup() {
	// Skip testcontainers setup when running locally
	if (process.env.TEST_LOCAL) {
		console.log("TEST_LOCAL mode: skipping testcontainers setup");
		return;
	}

	console.log("Start Reaper");
	const reaperEnv = await startReaper();
	process.env.REAPER_SESSION_ID = reaperEnv.REAPER_SESSION ?? randomUUID();

	if (!process.env.SKIP_TEST_LOCALSTACK_SETUP) {
		console.log("Start LocalStack");
		const { port: localStackPort, host: localStackHost } =
			await startContainerLocalStack();
		const ipHost = await hostResolve(localStackHost);
		process.env.LOCALSTACK_ENDPOINT = `http://${ipHost}:${localStackPort}`;
		process.env.LOCALSTACK_REGION = process.env.AWS_REGION;
		console.log(`LocalStack endpoint: ${process.env.LOCALSTACK_ENDPOINT}`);
	}
}
