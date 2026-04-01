import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
	type Stack,
	useDeleteStack,
	useListStacks,
} from "@/api/cloudformation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StackCreateDialog } from "./StackCreateDialog";
import { StackFilters } from "./StackFilters";

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

export function StackList() {
	const [createOpen, setCreateOpen] = useState(false);
	const [filteredStacks, setFilteredStacks] = useState<Stack[]>([]);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	// Auto-refresh: poll every 5s if any stack is in progress
	const hasInProgress = filteredStacks.some((s) =>
		s.status.includes("IN_PROGRESS"),
	);
	const { data, isLoading, error } = useListStacks(
		hasInProgress ? 5000 : false,
	);
	const deleteStack = useDeleteStack();

	const stacks = data?.stacks ?? [];

	const handleFilteredChange = useCallback((filtered: Stack[]) => {
		setFilteredStacks(filtered);
	}, []);

	if (isLoading) {
		return <p className="text-muted-foreground">Loading stacks...</p>;
	}

	if (error) {
		return (
			<p className="text-destructive">Error loading stacks: {error.message}</p>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-2xl font-bold">CloudFormation Stacks</h2>
					{hasInProgress && (
						<RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
					)}
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">
						{filteredStacks.length === stacks.length
							? `${stacks.length} stacks`
							: `${filteredStacks.length} / ${stacks.length} stacks`}
					</Badge>
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Stack
					</Button>
				</div>
			</div>

			<StackFilters stacks={stacks} onFilteredChange={handleFilteredChange} />

			{filteredStacks.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					{stacks.length === 0
						? "No stacks found. Create one to get started."
						: "No stacks match your filters."}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Last Updated</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredStacks.map((stack) => (
							<TableRow key={stack.stackName}>
								<TableCell>
									<a
										href={`/cloudformation/${stack.stackName}`}
										className="font-medium text-primary hover:underline"
									>
										{stack.stackName}
									</a>
								</TableCell>
								<TableCell>
									<Badge variant={statusVariant(stack.status)}>
										{stack.status}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{stack.creationTime
										? new Date(stack.creationTime).toLocaleString()
										: "\u2014"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{stack.lastUpdatedTime
										? new Date(stack.lastUpdatedTime).toLocaleString()
										: "\u2014"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{stack.description ?? "\u2014"}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										disabled={stack.status === "DELETE_IN_PROGRESS"}
										onClick={() => setDeleteTarget(stack.stackName)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<StackCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

			{/* Delete confirmation dialog */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Stack</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete stack &quot;{deleteTarget}&quot;?
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
									deleteStack.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteStack.isPending}
						>
							{deleteStack.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
