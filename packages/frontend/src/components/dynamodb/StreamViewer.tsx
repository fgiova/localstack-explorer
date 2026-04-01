import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
	type StreamRecord,
	useDescribeStream,
	useGetStreamRecords,
} from "@/api/dynamodb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StreamViewerProps {
	tableName: string;
}

function EventBadge({ eventName }: { eventName?: string }) {
	const variant =
		eventName === "INSERT"
			? "default"
			: eventName === "MODIFY"
				? "secondary"
				: eventName === "REMOVE"
					? "destructive"
					: "outline";
	return <Badge variant={variant}>{eventName ?? "UNKNOWN"}</Badge>;
}

function JsonView({
	label,
	data,
}: {
	label: string;
	data?: Record<string, unknown>;
}) {
	const [expanded, setExpanded] = useState(false);

	if (!data) return null;

	return (
		<div className="space-y-1">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				{expanded ? "\u25BC" : "\u25B6"} {label}
			</button>
			{expanded && (
				<pre className="rounded-md bg-muted p-2 text-xs font-mono overflow-auto max-h-[200px]">
					{JSON.stringify(data, null, 2)}
				</pre>
			)}
		</div>
	);
}

export function StreamViewer({ tableName }: StreamViewerProps) {
	const { data: streamInfo, isLoading, error } = useDescribeStream(tableName);
	const getRecords = useGetStreamRecords(tableName);
	const [records, setRecords] = useState<StreamRecord[]>([]);

	const handleFetchRecords = (shardId?: string) => {
		getRecords.mutate(
			{ shardId, limit: 100 },
			{
				onSuccess: (data) => {
					setRecords(data.records);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-md border border-destructive p-4 text-destructive">
				Error loading stream info: {error.message}
			</div>
		);
	}

	// No stream enabled
	if (!streamInfo?.streamArn) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">
						DynamoDB Streams is not enabled for this table.
					</p>
					<p className="mt-2 text-sm text-muted-foreground">
						Enable streams on the table to view change events.
						{streamInfo?.streamViewType && (
							<>
								{" "}
								Current view type:{" "}
								<Badge variant="outline">{streamInfo.streamViewType}</Badge>
							</>
						)}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Stream Info */}
			<Card>
				<CardHeader>
					<CardTitle>Stream Information</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">
								Status
							</span>
							<Badge
								variant={
									streamInfo.streamStatus === "ENABLED"
										? "default"
										: "secondary"
								}
							>
								{streamInfo.streamStatus ?? "\u2014"}
							</Badge>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">
								View Type
							</span>
							<span className="text-sm font-semibold">
								{streamInfo.streamViewType ?? "\u2014"}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">
								Label
							</span>
							<span className="text-sm font-semibold">
								{streamInfo.streamLabel ?? "\u2014"}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">
								Shards
							</span>
							<span className="text-sm font-semibold">
								{streamInfo.shards?.length ?? 0}
							</span>
						</div>
					</div>
					<p className="mt-3 text-xs text-muted-foreground font-mono break-all">
						ARN: {streamInfo.streamArn}
					</p>
				</CardContent>
			</Card>

			{/* Shards */}
			{streamInfo.shards && streamInfo.shards.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Shards</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{streamInfo.shards.map((shard) => (
								<div
									key={shard.shardId}
									className="flex items-center justify-between rounded-md border p-3"
								>
									<div>
										<span className="text-sm font-medium">{shard.shardId}</span>
										{shard.parentShardId && (
											<span className="ml-2 text-xs text-muted-foreground">
												parent: {shard.parentShardId}
											</span>
										)}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleFetchRecords(shard.shardId)}
										disabled={getRecords.isPending}
									>
										<RefreshCw
											className={`mr-2 h-3 w-3 ${getRecords.isPending ? "animate-spin" : ""}`}
										/>
										Fetch Records
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Records */}
			{records.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Stream Records
							<Badge variant="secondary">{records.length}</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{records.map((record, idx) => (
								<div
									key={record.eventID ?? idx}
									className="rounded-md border p-4 space-y-2"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<EventBadge eventName={record.eventName} />
											<span className="text-sm text-muted-foreground">
												{record.eventID ?? ""}
											</span>
										</div>
										{record.dynamodb?.sequenceNumber && (
											<span className="text-xs text-muted-foreground font-mono">
												seq: {record.dynamodb.sequenceNumber}
											</span>
										)}
									</div>
									<JsonView label="Keys" data={record.dynamodb?.keys} />
									<JsonView
										label="New Image"
										data={record.dynamodb?.newImage}
									/>
									<JsonView
										label="Old Image"
										data={record.dynamodb?.oldImage}
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{getRecords.isError && (
				<div className="rounded-md border border-destructive p-4 text-sm text-destructive">
					Error fetching records: {getRecords.error.message}
				</div>
			)}
		</div>
	);
}
