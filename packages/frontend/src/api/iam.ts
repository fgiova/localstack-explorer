import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface User {
  userName: string;
  userId: string;
  arn: string;
  createDate?: string;
}

interface ListUsersResponse {
  users: User[];
}

export function useListUsers() {
  return useQuery({
    queryKey: ["iam", "users"],
    queryFn: () => apiClient.get<ListUsersResponse>("/iam/users"),
  });
}
