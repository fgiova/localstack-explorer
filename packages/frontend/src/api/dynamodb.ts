import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// --- Interfaces ---

export interface TableSummary {
  tableName: string;
  tableStatus: string;
  itemCount?: number;
  tableSizeBytes?: number;
}

interface ListTablesResponse {
  tables: TableSummary[];
}

export interface KeySchemaElement {
  attributeName: string;
  keyType: string;
}

export interface AttributeDefinition {
  attributeName: string;
  attributeType: string;
}

export interface ProvisionedThroughput {
  readCapacityUnits: number;
  writeCapacityUnits: number;
}

export interface Projection {
  projectionType: string;
  nonKeyAttributes?: string[];
}

export interface GSI {
  indexName: string;
  keySchema: KeySchemaElement[];
  projection: Projection;
  provisionedThroughput?: ProvisionedThroughput;
  indexStatus?: string;
  itemCount?: number;
}

export interface LSI {
  indexName: string;
  keySchema: KeySchemaElement[];
  projection: Projection;
}

export interface StreamSpecification {
  streamEnabled: boolean;
  streamViewType?: string;
}

export interface TableDetail {
  tableName: string;
  tableStatus: string;
  tableArn?: string;
  creationDateTime?: string;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
  provisionedThroughput?: ProvisionedThroughput;
  globalSecondaryIndexes?: GSI[];
  localSecondaryIndexes?: LSI[];
  streamSpecification?: StreamSpecification;
  itemCount?: number;
  tableSizeBytes?: number;
  latestStreamArn?: string;
}

export interface CreateTableRequest {
  tableName: string;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
  provisionedThroughput?: ProvisionedThroughput;
  globalSecondaryIndexes?: {
    indexName: string;
    keySchema: KeySchemaElement[];
    projection: Projection;
    provisionedThroughput?: ProvisionedThroughput;
  }[];
  localSecondaryIndexes?: {
    indexName: string;
    keySchema: KeySchemaElement[];
    projection: Projection;
  }[];
}

export interface CreateGSIRequest {
  indexName: string;
  keySchema: KeySchemaElement[];
  projection: Projection;
  provisionedThroughput?: ProvisionedThroughput;
}

export interface ItemsResponse {
  items: Record<string, unknown>[];
  count: number;
  scannedCount: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface ScanOptions {
  indexName?: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  projectionExpression?: string;
}

export interface QueryOptions {
  keyConditionExpression: string;
  indexName?: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  projectionExpression?: string;
  scanIndexForward?: boolean;
}

export interface BatchWriteResponse {
  processedCount: number;
  unprocessedCount: number;
}

export interface BatchGetResponse {
  items: Record<string, unknown>[];
  unprocessedKeys?: Record<string, unknown>[];
}

export interface StreamDescription {
  streamArn?: string;
  streamLabel?: string;
  streamStatus?: string;
  streamViewType?: string;
  shards?: {
    shardId: string;
    parentShardId?: string;
    sequenceNumberRange: {
      startingSequenceNumber?: string;
      endingSequenceNumber?: string;
    };
  }[];
}

export interface StreamRecord {
  eventID?: string;
  eventName?: string;
  eventSource?: string;
  dynamodb?: {
    keys?: Record<string, unknown>;
    newImage?: Record<string, unknown>;
    oldImage?: Record<string, unknown>;
    sequenceNumber?: string;
    sizeBytes?: number;
    streamViewType?: string;
  };
}

export interface StreamRecordsResponse {
  records: StreamRecord[];
  nextShardIterator?: string;
}

interface PartiQLResponse {
  items: Record<string, unknown>[];
}

// --- Table hooks ---

export function useListTables() {
  return useQuery({
    queryKey: ["dynamodb", "tables"],
    queryFn: () => apiClient.get<ListTablesResponse>("/dynamodb"),
  });
}

export function useDescribeTable(tableName: string) {
  return useQuery({
    queryKey: ["dynamodb", "table", tableName],
    queryFn: () => apiClient.get<TableDetail>(`/dynamodb/${tableName}`),
    enabled: !!tableName,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTableRequest) =>
      apiClient.post<{ message: string }>("/dynamodb", request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "tables"] });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tableName: string) =>
      apiClient.delete<{ success: boolean }>(`/dynamodb/${tableName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "tables"] });
    },
  });
}

// --- Index hooks ---

export function useCreateGSI(tableName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateGSIRequest) =>
      apiClient.post<{ message: string }>(`/dynamodb/${tableName}/indexes`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "table", tableName] });
    },
  });
}

export function useDeleteGSI(tableName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indexName: string) =>
      apiClient.delete<{ success: boolean }>(`/dynamodb/${tableName}/indexes/${indexName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "table", tableName] });
    },
  });
}

// --- Item hooks ---

export function useScanItems(tableName: string) {
  return useMutation({
    mutationFn: (options?: ScanOptions) =>
      apiClient.post<ItemsResponse>(`/dynamodb/${tableName}/items/scan`, options ?? {}),
  });
}

export function useQueryItems(tableName: string) {
  return useMutation({
    mutationFn: (options: QueryOptions) =>
      apiClient.post<ItemsResponse>(`/dynamodb/${tableName}/items/query`, options),
  });
}

export function useGetItem(tableName: string) {
  return useMutation({
    mutationFn: (key: Record<string, unknown>) =>
      apiClient.post<ItemsResponse>(`/dynamodb/${tableName}/items/get`, { key }),
  });
}

export function usePutItem(tableName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Record<string, unknown>) =>
      apiClient.post<{ message: string }>(`/dynamodb/${tableName}/items`, { item }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "items", tableName] });
    },
  });
}

export function useDeleteItem(tableName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: Record<string, unknown>) =>
      apiClient.delete<{ success: boolean }>(`/dynamodb/${tableName}/items`, { key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "items", tableName] });
    },
  });
}

export function useBatchWriteItems(tableName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { putItems?: Record<string, unknown>[]; deleteKeys?: Record<string, unknown>[] }) =>
      apiClient.post<BatchWriteResponse>(`/dynamodb/${tableName}/items/batch-write`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb", "items", tableName] });
    },
  });
}

export function useBatchGetItems(tableName: string) {
  return useMutation({
    mutationFn: (data: { keys: Record<string, unknown>[]; projectionExpression?: string }) =>
      apiClient.post<BatchGetResponse>(`/dynamodb/${tableName}/items/batch-get`, data),
  });
}

// --- PartiQL hooks ---

export function useExecutePartiQL() {
  return useMutation({
    mutationFn: (data: { statement: string; parameters?: unknown[] }) =>
      apiClient.post<PartiQLResponse>("/dynamodb/partiql", data),
  });
}

// --- Stream hooks ---

export function useDescribeStream(tableName: string) {
  return useQuery({
    queryKey: ["dynamodb", "streams", tableName],
    queryFn: () => apiClient.get<StreamDescription>(`/dynamodb/${tableName}/streams`),
    enabled: !!tableName,
  });
}

export function useGetStreamRecords(tableName: string) {
  return useMutation({
    mutationFn: (params?: { shardId?: string; limit?: number }) => {
      const queryParams: Record<string, string> = {};
      if (params?.shardId) queryParams.shardId = params.shardId;
      if (params?.limit) queryParams.limit = String(params.limit);
      return apiClient.get<StreamRecordsResponse>(`/dynamodb/${tableName}/streams/records`, queryParams);
    },
  });
}
