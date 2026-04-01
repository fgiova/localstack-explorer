import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface HealthResponse {
	connected: boolean;
	endpoint: string;
	region: string;
	error?: string;
}

export function useHealthCheck() {
	return useQuery({
		queryKey: ["health"],
		queryFn: () => apiClient.get<HealthResponse>("/health"),
		refetchInterval: 30000,
		retry: false,
	});
}
