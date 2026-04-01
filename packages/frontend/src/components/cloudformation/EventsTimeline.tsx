import { RefreshCw } from "lucide-react";
import { useGetStackEvents } from "@/api/cloudformation";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface EventsTimelineProps {
	stackName: string;
	stackStatus?: string;
}

const eventStatusVariant = (
	status: string,
): "default" | "secondary" | "destructive" | "outline" => {
	if (status.includes("COMPLETE") && !status.includes("ROLLBACK"))
		return "default";
	if (status.includes("IN_PROGRESS")) return "secondary";
	if (status.includes("ROLLBACK") || status.includes("FAILED"))
		return "destructive";
	return "outline";
};

export function EventsTimeline({
	stackName,
	stackStatus,
}: EventsTimelineProps) {
	const isInProgress = stackStatus?.includes("IN_PROGRESS") ?? false;

	const { data, isLoading, error } = useGetStackEvents(stackName);
	// Note: auto-refresh is handled at the parent level via refetchInterval on the stack query

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
				Error loading events: {error.message}
			</div>
		);
	}

	const events = data?.events ?? [];

	if (events.length === 0) {
		return <p className="text-muted-foreground py-4">No events found.</p>;
	}

	return (
		<div className="space-y-2">
			{isInProgress && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<RefreshCw className="h-3 w-3 animate-spin" />
					Stack operation in progress...
				</div>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Timestamp</TableHead>
						<TableHead>Logical ID</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Reason</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{events.map((event) => (
						<TableRow key={event.eventId}>
							<TableCell className="text-muted-foreground whitespace-nowrap">
								{event.timestamp
									? new Date(event.timestamp).toLocaleString()
									: "\u2014"}
							</TableCell>
							<TableCell className="font-medium">
								{event.logicalResourceId ?? "\u2014"}
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{event.resourceType ?? "\u2014"}
							</TableCell>
							<TableCell>
								{event.resourceStatus ? (
									<Badge variant={eventStatusVariant(event.resourceStatus)}>
										{event.resourceStatus}
									</Badge>
								) : (
									"\u2014"
								)}
							</TableCell>
							<TableCell
								className="text-sm text-muted-foreground max-w-[300px] truncate"
								title={event.resourceStatusReason ?? ""}
							>
								{event.resourceStatusReason ?? "\u2014"}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
