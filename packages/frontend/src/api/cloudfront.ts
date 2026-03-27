import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Distribution {
  id: string;
  domainName: string;
  status: string;
  lastModified?: string;
}

interface ListDistributionsResponse {
  distributions: Distribution[];
}

export function useListDistributions() {
  return useQuery({
    queryKey: ["cloudfront", "distributions"],
    queryFn: () => apiClient.get<ListDistributionsResponse>("/cloudfront"),
  });
}
