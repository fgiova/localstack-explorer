import { Link } from "@tanstack/react-router";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteTable, useListTables } from "@/api/dynamodb";
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
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CreateTableDialog } from "./CreateTableDialog";

export function TableList() {
	const { data, isLoading, error } = useListTables();
	const deleteTable = useDeleteTable();
	const [searchTerm, setSearchTerm] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const filteredTables =
		data?.tables.filter((t) =>
			t.tableName.toLowerCase().includes(searchTerm.toLowerCase()),
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
				Error loading tables: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">DynamoDB Tables</h2>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Table
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search tables..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-10"
				/>
			</div>

			{filteredTables.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					{data?.tables.length === 0
						? "No tables found. Create one to get started."
						: "No tables match your search."}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Table Name</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Items</TableHead>
							<TableHead>Size</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredTables.map((table) => (
							<TableRow key={table.tableName}>
								<TableCell>
									<Link
										to="/dynamodb/$tableName"
										params={{ tableName: table.tableName }}
										className="font-medium text-primary hover:underline"
									>
										{table.tableName}
									</Link>
								</TableCell>
								<TableCell>
									<Badge
										variant={
											table.tableStatus === "ACTIVE" ? "default" : "secondary"
										}
									>
										{table.tableStatus}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{table.itemCount ?? "\u2014"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{table.tableSizeBytes !== undefined
										? formatBytes(table.tableSizeBytes)
										: "\u2014"}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(table.tableName)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<CreateTableDialog open={createOpen} onOpenChange={setCreateOpen} />

			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Table</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete table &quot;{deleteTarget}&quot;?
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
									deleteTable.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteTable.isPending}
						>
							{deleteTable.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
