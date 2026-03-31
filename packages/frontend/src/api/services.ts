import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useConfigStore } from "@/stores/config";

interface ServicesResponse {
  services: string[];
  defaultEndpoint: string;
  defaultRegion: string;
}

let defaultsApplied = false;

export function useEnabledServices() {
  const query = useQuery({
    queryKey: ["services"],
    queryFn: () => apiClient.get<ServicesResponse>("/services"),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!query.data || defaultsApplied) return;
    defaultsApplied = true;

    const { userConfigured, applyServerDefaults } = useConfigStore.getState();
    if (!userConfigured) {
      applyServerDefaults(query.data.defaultEndpoint, query.data.defaultRegion);
    }
  }, [query.data]);

  return query;
}
