import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteQueue, useListQueues } from "@/api/sqs";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { QueueCreateDialog } from "./QueueCreateDialog";

export function QueueList() {
	const { data, isLoading, error } = useListQueues();
	const deleteQueue = useDeleteQueue();
	const [searchTerm, setSearchTerm] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const filteredQueues =
		data?.queues.filter((q) =>
			q.queueName.toLowerCase().includes(searchTerm.toLowerCase()),
		) ?? [];

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
				Error loading queues: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">SQS Queues</h2>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Queue
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search queues..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-10"
				/>
			</div>

			{filteredQueues.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					{data?.queues.length === 0
						? "No queues found. Create one to get started."
						: "No queues match your search."}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>URL</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredQueues.map((queue) => (
							<TableRow key={queue.queueUrl}>
								<TableCell>
									<a
										href={`/sqs/${queue.queueName}`}
										className="font-medium text-primary hover:underline"
									>
										{queue.queueName}
									</a>
								</TableCell>
								<TableCell className="text-muted-foreground font-mono text-sm">
									{queue.queueUrl}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(queue.queueName)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<QueueCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

			{/* Delete confirmation dialog */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Queue</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete queue &quot;{deleteTarget}&quot;?
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteTarget) {
									deleteQueue.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteQueue.isPending}
						>
							{deleteQueue.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
