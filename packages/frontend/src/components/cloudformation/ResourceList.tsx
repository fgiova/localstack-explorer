import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const statusVariant = (
	status: string,
): "default" | "secondary" | "destructive" | "outline" => {
	if (status.includes("COMPLETE") && !status.includes("ROLLBACK"))
		return "default";
	if (status.includes("IN_PROGRESS")) return "secondary";
	if (status.includes("ROLLBACK") || status.includes("FAILED"))
		return "destructive";
	return "outline";
};

function extractQueueName(physicalResourceId: string): string {
	// Queue URL like http://localhost:4566/000000000000/my-queue or ARN
	const segments = physicalResourceId.split("/");
	return segments[segments.length - 1];
}

function extractTopicName(physicalResourceId: string): string {
	// ARN like arn:aws:sns:us-east-1:000000000000:my-topic
	const segments = physicalResourceId.split(":");
	return segments[segments.length - 1];
}

interface Resource {
	logicalResourceId?: string;
	physicalResourceId?: string;
	resourceType?: string;
	resourceStatus?: string;
}

interface ResourceListProps {
	resources: Resource[];
}

function ResourceLink({ resource }: { resource: Resource }) {
	const physicalId = resource.physicalResourceId ?? "";
	const type = resource.resourceType ?? "";

	if (!physicalId) {
		return <span className="text-muted-foreground">{"\u2014"}</span>;
	}

	switch (type) {
		case "AWS::S3::Bucket":
			return (
				<Link
					to="/s3/$bucketName"
					params={{ bucketName: physicalId }}
					className="text-primary underline hover:no-underline"
				>
					{physicalId}
				</Link>
			);
		case "AWS::SQS::Queue":
			return (
				<Link
					to="/sqs/$queueName"
					params={{ queueName: extractQueueName(physicalId) }}
					className="text-primary underline hover:no-underline"
				>
					{physicalId}
				</Link>
			);
		case "AWS::SNS::Topic":
			return (
				<Link
					to="/sns/$topicName"
					params={{ topicName: extractTopicName(physicalId) }}
					className="text-primary underline hover:no-underline"
				>
					{physicalId}
				</Link>
			);
		case "AWS::IAM::User":
			return (
				<Link to="/iam" className="text-primary underline hover:no-underline">
					{physicalId}
				</Link>
			);
		default:
			return <span>{physicalId}</span>;
	}
}

export function ResourceList({ resources }: ResourceListProps) {
	if (!resources || resources.length === 0) {
		return <p className="text-muted-foreground">No resources</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Logical ID</TableHead>
					<TableHead>Physical ID</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{resources.map((resource, idx) => (
					<TableRow key={resource.logicalResourceId ?? idx}>
						<TableCell className="font-medium">
							{resource.logicalResourceId ?? "\u2014"}
						</TableCell>
						<TableCell>
							<ResourceLink resource={resource} />
						</TableCell>
						<TableCell>{resource.resourceType ?? "\u2014"}</TableCell>
						<TableCell>
							{resource.resourceStatus ? (
								<Badge variant={statusVariant(resource.resourceStatus)}>
									{resource.resourceStatus}
								</Badge>
							) : (
								"\u2014"
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
