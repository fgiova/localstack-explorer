import { useState } from "react";
import { useCreateSubscription } from "@/api/sns";
import { useListQueues } from "@/api/sqs";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SubscriptionCreateDialogProps {
	topicName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type Protocol = "sqs" | "http" | "https" | "email" | "email-json" | "lambda";

const protocolOptions: { value: Protocol; label: string }[] = [
	{ value: "sqs", label: "SQS" },
	{ value: "http", label: "HTTP" },
	{ value: "https", label: "HTTPS" },
	{ value: "email", label: "Email" },
	{ value: "email-json", label: "Email (JSON)" },
	{ value: "lambda", label: "Lambda" },
];

export function SubscriptionCreateDialog({
	topicName,
	open,
	onOpenChange,
}: SubscriptionCreateDialogProps) {
	const createSubscription = useCreateSubscription(topicName);
	const { data: queuesData, isLoading: queuesLoading } = useListQueues();
	const [protocol, setProtocol] = useState<Protocol>("sqs");
	const [endpoint, setEndpoint] = useState("");
	const [sqsMode, setSqsMode] = useState<"select" | "manual">("select");
	const [selectedQueue, setSelectedQueue] = useState("");
	const [rawMessageDelivery, setRawMessageDelivery] = useState(false);
	const [filterPolicy, setFilterPolicy] = useState("");
	const [filterPolicyError, setFilterPolicyError] = useState<string | null>(
		null,
	);

	const queues = queuesData?.queues ?? [];

	function resetForm() {
		setProtocol("sqs");
		setEndpoint("");
		setSqsMode("select");
		setSelectedQueue("");
		setRawMessageDelivery(false);
		setFilterPolicy("");
		setFilterPolicyError(null);
	}

	function getEndpointValue(): string {
		if (protocol === "sqs" && sqsMode === "select" && selectedQueue) {
			// Construct an ARN from the selected queue
			// LocalStack uses a standard ARN format
			const queue = queues.find((q) => q.queueName === selectedQueue);
			if (queue) {
				// Extract region and account from queue URL
				// URL format: http://localhost:4566/000000000000/queue-name
				const urlParts = queue.queueUrl.split("/");
				const accountId = urlParts[urlParts.length - 2] || "000000000000";
				return `arn:aws:sqs:us-east-1:${accountId}:${queue.queueName}`;
			}
			return "";
		}
		return endpoint;
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const endpointValue = getEndpointValue();
		if (!endpointValue) return;

		// Validate filter policy JSON if provided
		const trimmedPolicy = filterPolicy.trim();
		if (trimmedPolicy) {
			try {
				JSON.parse(trimmedPolicy);
				setFilterPolicyError(null);
			} catch (err) {
				setFilterPolicyError(
					err instanceof Error ? err.message : "Invalid JSON",
				);
				return;
			}
		}

		const parsedPolicy = trimmedPolicy ? JSON.parse(trimmedPolicy) : undefined;

		createSubscription.mutate(
			{
				protocol,
				endpoint: endpointValue,
				...(rawMessageDelivery ? { rawMessageDelivery } : {}),
				...(parsedPolicy ? { filterPolicy: parsedPolicy } : {}),
			},
			{
				onSuccess: () => {
					resetForm();
					onOpenChange(false);
				},
			},
		);
	}

	function renderEndpointInput() {
		if (protocol === "sqs") {
			return (
				<div className="space-y-3">
					<div className="flex gap-2">
						<Button
							type="button"
							variant={sqsMode === "select" ? "default" : "outline"}
							size="sm"
							onClick={() => setSqsMode("select")}
						>
							Select Queue
						</Button>
						<Button
							type="button"
							variant={sqsMode === "manual" ? "default" : "outline"}
							size="sm"
							onClick={() => setSqsMode("manual")}
						>
							Enter ARN
						</Button>
					</div>
					{sqsMode === "select" ? (
						<Select
							value={selectedQueue}
							onChange={(e) => setSelectedQueue(e.target.value)}
							disabled={queuesLoading}
						>
							<option value="">
								{queuesLoading ? "Loading queues..." : "Select a queue"}
							</option>
							{queues.map((queue) => (
								<option key={queue.queueUrl} value={queue.queueName}>
									{queue.queueName}
								</option>
							))}
						</Select>
					) : (
						<Input
							value={endpoint}
							onChange={(e) => setEndpoint(e.target.value)}
							placeholder="arn:aws:sqs:us-east-1:000000000000:queue-name"
						/>
					)}
				</div>
			);
		}

		if (protocol === "http" || protocol === "https") {
			return (
				<Input
					type="url"
					value={endpoint}
					onChange={(e) => setEndpoint(e.target.value)}
					placeholder={`${protocol}://example.com/webhook`}
				/>
			);
		}

		if (protocol === "email" || protocol === "email-json") {
			return (
				<Input
					type="email"
					value={endpoint}
					onChange={(e) => setEndpoint(e.target.value)}
					placeholder="user@example.com"
				/>
			);
		}

		if (protocol === "lambda") {
			return (
				<Input
					value={endpoint}
					onChange={(e) => setEndpoint(e.target.value)}
					placeholder="arn:aws:lambda:us-east-1:000000000000:function:my-function"
				/>
			);
		}

		return null;
	}

	const isValid =
		protocol === "sqs" && sqsMode === "select" ? !!selectedQueue : !!endpoint;

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				if (!value) resetForm();
				onOpenChange(value);
			}}
		>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Add Subscription</DialogTitle>
						<DialogDescription>
							Create a new subscription for topic &quot;{topicName}&quot;.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="protocol">Protocol</Label>
							<Select
								id="protocol"
								value={protocol}
								onChange={(e) => {
									setProtocol(e.target.value as Protocol);
									setEndpoint("");
									setSelectedQueue("");
								}}
							>
								{protocolOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Endpoint</Label>
							{renderEndpointInput()}
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="rawMessageDelivery"
								checked={rawMessageDelivery}
								onChange={(e) => setRawMessageDelivery(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<Label htmlFor="rawMessageDelivery">Raw Message Delivery</Label>
						</div>

						<div className="space-y-2">
							<Label htmlFor="filterPolicy">
								Filter Policy (JSON, optional)
							</Label>
							<Textarea
								id="filterPolicy"
								value={filterPolicy}
								onChange={(e) => {
									setFilterPolicy(e.target.value);
									if (filterPolicyError) {
										try {
											if (e.target.value.trim()) JSON.parse(e.target.value);
											setFilterPolicyError(null);
										} catch {
											// keep error until valid
										}
									}
								}}
								placeholder='{"attribute": ["value1", "value2"]}'
								className="font-mono text-sm min-h-[100px]"
								rows={5}
							/>
							{filterPolicyError && (
								<p className="text-sm text-destructive">{filterPolicyError}</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								resetForm();
								onOpenChange(false);
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!isValid || createSubscription.isPending}
						>
							{createSubscription.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
