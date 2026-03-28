import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Origin {
  id: string;
  domainName: string;
  originPath?: string;
  httpPort?: number;
  httpsPort?: number;
  protocolPolicy: "http-only" | "https-only" | "match-viewer";
}

interface CacheBehavior {
  pathPattern: string;
  targetOriginId: string;
  viewerProtocolPolicy: "allow-all" | "https-only" | "redirect-to-https";
  allowedMethods: string[];
  cachedMethods: string[];
  defaultTTL: number;
  maxTTL: number;
  minTTL: number;
  compress: boolean;
}

interface DistributionSummary {
  id: string;
  domainName: string;
  status: string;
  enabled: boolean;
  originsCount: number;
  lastModified?: string;
}

interface DistributionDetail {
  id: string;
  arn: string;
  domainName: string;
  status: string;
  enabled: boolean;
  comment?: string;
  defaultRootObject?: string;
  origins: Origin[];
  defaultCacheBehavior: CacheBehavior;
  cacheBehaviors: CacheBehavior[];
  lastModified?: string;
}

interface Invalidation {
  id: string;
  status: string;
  createTime: string;
  paths: string[];
}

interface ListDistributionsResponse {
  distributions: DistributionSummary[];
}

interface ListInvalidationsResponse {
  invalidations: Invalidation[];
}

interface CreateDistributionBody {
  origins: Origin[];
  defaultRootObject?: string;
  comment?: string;
  enabled: boolean;
  defaultCacheBehavior: CacheBehavior;
}

interface UpdateDistributionBody {
  comment?: string;
  enabled?: boolean;
  defaultRootObject?: string;
}

export function useListDistributions() {
  return useQuery({
    queryKey: ["cloudfront", "distributions"],
    queryFn: () => apiClient.get<ListDistributionsResponse>("/cloudfront"),
  });
}

export function useGetDistribution(distributionId: string) {
  return useQuery({
    queryKey: ["cloudfront", "distribution", distributionId],
    queryFn: () => apiClient.get<DistributionDetail>(`/cloudfront/${distributionId}`),
    enabled: !!distributionId,
  });
}

export function useListInvalidations(distributionId: string) {
  return useQuery({
    queryKey: ["cloudfront", "invalidations", distributionId],
    queryFn: () => apiClient.get<ListInvalidationsResponse>(`/cloudfront/${distributionId}/invalidations`),
    enabled: !!distributionId,
  });
}

export function useCreateDistribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDistributionBody) =>
      apiClient.post<DistributionDetail>("/cloudfront", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudfront", "distributions"] });
    },
  });
}

export function useUpdateDistribution(distributionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDistributionBody) =>
      apiClient.put<DistributionDetail>(`/cloudfront/${distributionId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudfront", "distributions"] });
      queryClient.invalidateQueries({ queryKey: ["cloudfront", "distribution", distributionId] });
    },
  });
}

export function useDeleteDistribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (distributionId: string) =>
      apiClient.delete<{ success: boolean }>(`/cloudfront/${distributionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudfront", "distributions"] });
    },
  });
}

export function useCreateInvalidation(distributionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paths: string[]) =>
      apiClient.post<Invalidation>(`/cloudfront/${distributionId}/invalidations`, { paths }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudfront", "invalidations", distributionId] });
    },
  });
}
