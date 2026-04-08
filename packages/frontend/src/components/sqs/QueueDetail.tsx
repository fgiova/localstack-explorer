import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePurgeQueue, useQueueAttributes } from "@/api/sqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { MessageViewer } from "./MessageViewer";
import { QueueEditAttributesDialog } from "./QueueEditAttributesDialog";
import { QueueSubscriptions } from "./QueueSubscriptions";
import { SendMessageForm } from "./SendMessageForm";

type TabId = "attributes" | "send" | "messages" | "subscriptions";

interface AttributeItemProps {
	label: string;
	value: string | number | undefined;
}

function AttributeItem({ label, value }: AttributeItemProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border p-4">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<span className="text-lg font-semibold">
				{value !== undefined && value !== "" ? String(value) : "—"}
			</span>
		</div>
	);
}

function formatSeconds(seconds: number | undefined): string {
	if (seconds === undefined) return "—";
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return `${h}h ${m}m`;
}

function formatBytes(bytes: number | undefined): string {
	if (bytes === undefined) return "—";
	if (bytes < 1024) return `${bytes} B`;
	return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTimestamp(timestamp: string | undefined): string {
	if (!timestamp) return "—";
	const ms = Number(timestamp) * 1000;
	if (!Number.isNaN(ms) && ms > 0) {
		return new Date(ms).toLocaleString();
	}
	const d = new Date(timestamp);
	return Number.isNaN(d.getTime()) ? timestamp : d.toLocaleString();
}

interface QueueDetailProps {
	queueName: string;
}

export function QueueDetail({ queueName }: QueueDetailProps) {
	const [activeTab, setActiveTab] = useState<TabId>("attributes");
	const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	const { data: attributes, isLoading, error } = useQueueAttributes(queueName);
	const purgeQueue = usePurgeQueue();

	const handlePurge = () => {
		purgeQueue.mutate(queueName, {
			onSettled: () => setPurgeDialogOpen(false),
		});
	};

	const tabs: { id: TabId; label: string }[] = [
		{ id: "attributes", label: "Attributes" },
		{ id: "send", label: "Send Message" },
		{ id: "messages", label: "Messages" },
		{ id: "subscriptions", label: "Subscriptions" },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="outline" size="icon" asChild>
						<Link to="/sqs">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h2 className="text-2xl font-bold">{queueName}</h2>
						{attributes?.queueArn && (
							<p className="mt-0.5 text-sm text-muted-foreground">
								{attributes.queueArn}
							</p>
						)}
					</div>
				</div>
				<Button
					variant="destructive"
					onClick={() => setPurgeDialogOpen(true)}
					disabled={purgeQueue.isPending}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Purge Queue
				</Button>
			</div>

			{/* Loading / Error states */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)}

			{error && (
				<div className="rounded-md border border-destructive p-4 text-destructive">
					Error loading queue attributes: {error.message}
				</div>
			)}

			{/* Tabs */}
			{!isLoading && !error && (
				<>
					{/* Tab bar — implemented without @radix-ui/react-tabs since the package is not installed */}
					<div className="border-b">
						<nav className="-mb-px flex gap-6">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={[
										"border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
										activeTab === tab.id
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground",
									].join(" ")}
								>
									{tab.label}
									{tab.id === "attributes" && attributes && (
										<Badge variant="secondary" className="ml-2">
											{attributes.approximateNumberOfMessages ?? 0}
										</Badge>
									)}
								</button>
							))}
						</nav>
					</div>

					{/* Tab: Attributes */}
					{activeTab === "attributes" && (
						<Card>
							<CardHeader className="flex flex-row items-center justify-between">
								<CardTitle>Queue Attributes</CardTitle>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setEditDialogOpen(true)}
								>
									<Pencil className="mr-2 h-4 w-4" />
									Edit
								</Button>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
									<AttributeItem
										label="Messages Available"
										value={attributes?.approximateNumberOfMessages}
									/>
									<AttributeItem
										label="Messages In Flight"
										value={attributes?.approximateNumberOfMessagesNotVisible}
									/>
									<AttributeItem
										label="Messages Delayed"
										value={attributes?.approximateNumberOfMessagesDelayed}
									/>
									<AttributeItem
										label="Delay Seconds"
										value={
											attributes?.delaySeconds !== undefined
												? formatSeconds(attributes.delaySeconds)
												: undefined
										}
									/>
									<AttributeItem
										label="Visibility Timeout"
										value={
											attributes?.visibilityTimeout !== undefined
												? formatSeconds(attributes.visibilityTimeout)
												: undefined
										}
									/>
									<AttributeItem
										label="Maximum Message Size"
										value={
											attributes?.maximumMessageSize !== undefined
												? formatBytes(attributes.maximumMessageSize)
												: undefined
										}
									/>
									<AttributeItem
										label="Message Retention Period"
										value={
											attributes?.messageRetentionPeriod !== undefined
												? formatSeconds(attributes.messageRetentionPeriod)
												: undefined
										}
									/>
									<AttributeItem
										label="Receive Message Wait Time"
										value={
											attributes?.receiveMessageWaitTimeSeconds !== undefined
												? formatSeconds(
														attributes.receiveMessageWaitTimeSeconds,
													)
												: undefined
										}
									/>
									<AttributeItem
										label="Created"
										value={formatTimestamp(attributes?.createdTimestamp)}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Tab: Send Message */}
					{activeTab === "send" && <SendMessageForm queueName={queueName} />}

					{/* Tab: Messages */}
					{activeTab === "messages" && <MessageViewer queueName={queueName} />}

					{/* Tab: Subscriptions */}
					{activeTab === "subscriptions" && attributes?.queueArn && (
						<QueueSubscriptions queueArn={attributes.queueArn} />
					)}
				</>
			)}

			{/* Edit attributes dialog */}
			{attributes && (
				<QueueEditAttributesDialog
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
					queueName={queueName}
					currentAttributes={{
						delaySeconds: attributes.delaySeconds,
						maximumMessageSize: attributes.maximumMessageSize,
						messageRetentionPeriod: attributes.messageRetentionPeriod,
						receiveMessageWaitTimeSeconds:
							attributes.receiveMessageWaitTimeSeconds,
						visibilityTimeout: attributes.visibilityTimeout,
					}}
				/>
			)}

			{/* Purge confirmation dialog */}
			<Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Purge Queue</DialogTitle>
						<DialogDescription>
							Are you sure you want to purge all messages from{" "}
							<strong>{queueName}</strong>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setPurgeDialogOpen(false)}
							disabled={purgeQueue.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handlePurge}
							disabled={purgeQueue.isPending}
						>
							{purgeQueue.isPending ? "Purging..." : "Purge Queue"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
