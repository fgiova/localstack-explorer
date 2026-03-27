import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Bucket {
  name: string;
  creationDate?: string;
}

interface S3Object {
  key: string;
  size?: number;
  lastModified?: string;
  etag?: string;
  storageClass?: string;
}

interface CommonPrefix {
  prefix: string;
}

interface ListBucketsResponse {
  buckets: Bucket[];
}

interface ListObjectsResponse {
  objects: S3Object[];
  commonPrefixes: CommonPrefix[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

interface ObjectProperties {
  key: string;
  size: number;
  lastModified: string;
  contentType: string;
  etag: string;
}

export function useListBuckets() {
  return useQuery({
    queryKey: ["s3", "buckets"],
    queryFn: () => apiClient.get<ListBucketsResponse>("/s3"),
  });
}

export function useCreateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<{ message: string }>("/s3", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["s3", "buckets"] });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bucketName: string) => apiClient.delete<{ success: boolean }>(`/s3/${bucketName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["s3", "buckets"] });
    },
  });
}

export function useListObjects(bucketName: string, prefix?: string) {
  return useQuery({
    queryKey: ["s3", "objects", bucketName, prefix],
    queryFn: () =>
      apiClient.get<ListObjectsResponse>(`/s3/${bucketName}/objects`, {
        prefix: prefix ?? "",
        delimiter: "/",
      }),
    enabled: !!bucketName,
  });
}

export function useObjectProperties(bucketName: string, key: string) {
  return useQuery({
    queryKey: ["s3", "object-properties", bucketName, key],
    queryFn: () =>
      apiClient.get<ObjectProperties>(`/s3/${bucketName}/objects/properties`, { key }),
    enabled: !!bucketName && !!key,
  });
}

export function useUploadObject(bucketName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, key }: { file: File; key?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (key) formData.append("key", key);
      return apiClient.upload<{ key: string; bucket: string }>(`/s3/${bucketName}/objects/upload`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["s3", "objects", bucketName] });
    },
  });
}

export function useDeleteObject(bucketName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      apiClient.delete<{ success: boolean }>(`/s3/${bucketName}/objects?key=${encodeURIComponent(key)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["s3", "objects", bucketName] });
    },
  });
}

export function getDownloadUrl(bucketName: string, key: string): string {
  return `/api/s3/${bucketName}/objects/download?key=${encodeURIComponent(key)}`;
}
