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
				error: `HTTP ${response.status}`,
			};
		}

		return { connected: true, endpoint, region };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return { connected: false, endpoint, region, error: message };
	}
}
