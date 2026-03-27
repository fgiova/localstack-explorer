import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Queue {
  queueUrl: string;
  queueName: string;
}

interface ListQueuesResponse {
  queues: Queue[];
}

export function useListQueues() {
  return useQuery({
    queryKey: ["sqs", "queues"],
    queryFn: () => apiClient.get<ListQueuesResponse>("/sqs"),
  });
}
