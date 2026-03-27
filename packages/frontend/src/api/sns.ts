import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Topic {
  topicArn: string;
  name: string;
}

interface ListTopicsResponse {
  topics: Topic[];
}

export function useListTopics() {
  return useQuery({
    queryKey: ["sns", "topics"],
    queryFn: () => apiClient.get<ListTopicsResponse>("/sns"),
  });
}
