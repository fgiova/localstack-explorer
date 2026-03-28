import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ServicesResponse {
  services: string[];
}

export function useEnabledServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => apiClient.get<ServicesResponse>("/services"),
    staleTime: Infinity,
  });
}
