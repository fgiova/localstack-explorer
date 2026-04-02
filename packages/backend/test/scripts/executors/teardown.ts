import { getContainerRuntimeClient } from "testcontainers";

export default async function globalTeardown() {
	if (
		process.env.REAPER_SESSION_ID !== undefined &&
		process.env.REAPER_SESSION_ID !== ""
	) {
		const reapersessionid = process.env.REAPER_SESSION_ID;
		const containerRuntimeClient = await getContainerRuntimeClient();
		const runningContainers = await containerRuntimeClient.container.list();
		const containers = runningContainers.filter(
			(container) =>
				container.Labels["org.testcontainers.reaper-session-id"] ===
				reapersessionid,
		);
		for (const containerInfo of containers) {
			const container = containerRuntimeClient.container.getById(
				containerInfo.Id,
			);
			await containerRuntimeClient.container.stop(container);
		}
	}
}
