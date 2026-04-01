import { Link } from "@tanstack/react-router";
import { useQueueSubscriptions } from "@/api/sqs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface QueueSubscriptionsProps {
	queueArn: string;
}

function extractTopicName(arn: string): string {
	const parts = arn.split(":");
	return parts[parts.length - 1];
}

function truncateArn(arn: string, maxLength = 40): string {
	if (arn.length <= maxLength) return arn;
	return `${arn.slice(0, maxLength - 3)}...`;
}

export function QueueSubscriptions({ queueArn }: QueueSubscriptionsProps) {
	const { data, isLoading, error } = useQueueSubscriptions(queueArn);

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
				Error loading subscriptions: {error.message}
			</div>
		);
	}

	const subscriptions = data?.subscriptions ?? [];

	if (subscriptions.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				No SNS subscriptions found for this queue.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Topic</TableHead>
					<TableHead>Subscription ARN</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{subscriptions.map((sub) => {
					const topicName = extractTopicName(sub.topicArn);
					return (
						<TableRow key={sub.subscriptionArn}>
							<TableCell>
								<Link
									to={"/sns/$topicName" as string}
									params={{ topicName }}
									className="text-primary hover:underline"
								>
									{topicName}
								</Link>
							</TableCell>
							<TableCell
								className="text-muted-foreground font-mono text-sm"
								title={sub.subscriptionArn}
							>
								{truncateArn(sub.subscriptionArn)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
