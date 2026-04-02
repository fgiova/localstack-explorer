import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteFunction, useListFunctions } from "@/api/lambda";
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
import { FunctionCreateDialog } from "./FunctionCreateDialog";

export function FunctionList() {
	const { data, isLoading, error } = useListFunctions();
	const deleteFunction = useDeleteFunction();
	const [searchTerm, setSearchTerm] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const filteredFunctions =
		data?.functions.filter((fn) =>
			fn.functionName.toLowerCase().includes(searchTerm.toLowerCase()),
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
				Error loading functions: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Lambda Functions</h2>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Function
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search functions..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-10"
				/>
			</div>

			{filteredFunctions.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					{data?.functions.length === 0
						? "No functions found. Create one to get started."
						: "No functions match your search."}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Runtime</TableHead>
							<TableHead>Memory</TableHead>
							<TableHead>Timeout</TableHead>
							<TableHead>Last Modified</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredFunctions.map((fn) => (
							<TableRow key={fn.functionArn}>
								<TableCell>
									<a
										href={`/lambda/${fn.functionName}`}
										className="font-medium text-primary hover:underline"
									>
										{fn.functionName}
									</a>
								</TableCell>
								<TableCell className="font-mono text-sm">
									{fn.runtime}
								</TableCell>
								<TableCell>{fn.memorySize} MB</TableCell>
								<TableCell>{fn.timeout}s</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{fn.lastModified
										? new Date(fn.lastModified).toLocaleString()
										: "—"}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(fn.functionName)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<FunctionCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

			{/* Delete confirmation dialog */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Function</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete function &quot;{deleteTarget}
							&quot;? This action cannot be undone.
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
									deleteFunction.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteFunction.isPending}
						>
							{deleteFunction.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
