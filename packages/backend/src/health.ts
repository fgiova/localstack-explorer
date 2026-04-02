import { config } from "./config.js";

interface LocalStackHealthResponse {
	services?: Record<string, string>;
}

export async function checkLocalstackHealth(endpoint: string, region: string) {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);

		const response = await fetch(`${endpoint}/_localstack/health`, {
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (!response.ok) {
			return {
				connected: false,
				endpoint,
				region,
				services: [] as string[],
				error: `HTTP ${response.status}`,
			};
		}

		const body = (await response.json()) as LocalStackHealthResponse;
		const enabledSet = new Set<string>(config.enabledServices);
		const activeServices = Object.entries(body.services ?? {})
			.filter(
				([name, status]) =>
					enabledSet.has(name) &&
					(status === "running" || status === "available"),
			)
			.map(([name]) => name);

		return { connected: true, endpoint, region, services: activeServices };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return {
			connected: false,
			endpoint,
			region,
			services: [] as string[],
			error: message,
		};
	}
}
