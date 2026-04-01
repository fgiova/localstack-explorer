import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteGSI, useDescribeTable } from "@/api/dynamodb";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CreateGSIDialog } from "./CreateGSIDialog";

interface IndexManagerProps {
	tableName: string;
}

export function IndexManager({ tableName }: IndexManagerProps) {
	const { data: table, isLoading, error } = useDescribeTable(tableName);
	const deleteGSI = useDeleteGSI(tableName);
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
				Error loading table: {error.message}
			</div>
		);
	}

	if (!table) return null;

	const gsis = table.globalSecondaryIndexes ?? [];
	const lsis = table.localSecondaryIndexes ?? [];

	return (
		<div className="space-y-6">
			{/* GSI Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						Global Secondary Indexes
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create GSI
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{gsis.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							No Global Secondary Indexes. Create one to enable additional query
							patterns.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Index Name</TableHead>
									<TableHead>Key Schema</TableHead>
									<TableHead>Projection</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Items</TableHead>
									<TableHead className="w-[80px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{gsis.map((gsi) => (
									<TableRow key={gsi.indexName}>
										<TableCell className="font-medium">
											{gsi.indexName}
										</TableCell>
										<TableCell>
											{gsi.keySchema.map((ks) => (
												<div key={ks.attributeName} className="text-sm">
													{ks.attributeName}{" "}
													<Badge variant="outline" className="text-xs">
														{ks.keyType === "HASH" ? "PK" : "SK"}
													</Badge>
												</div>
											))}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{gsi.projection.projectionType}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													gsi.indexStatus === "ACTIVE" ? "default" : "secondary"
												}
											>
												{gsi.indexStatus ?? "\u2014"}
											</Badge>
										</TableCell>
										<TableCell>{gsi.itemCount ?? "\u2014"}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setDeleteTarget(gsi.indexName)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* LSI Section */}
			{lsis.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Local Secondary Indexes</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Index Name</TableHead>
									<TableHead>Key Schema</TableHead>
									<TableHead>Projection</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{lsis.map((lsi) => (
									<TableRow key={lsi.indexName}>
										<TableCell className="font-medium">
											{lsi.indexName}
										</TableCell>
										<TableCell>
											{lsi.keySchema.map((ks) => (
												<div key={ks.attributeName} className="text-sm">
													{ks.attributeName}{" "}
													<Badge variant="outline" className="text-xs">
														{ks.keyType === "HASH" ? "PK" : "SK"}
													</Badge>
												</div>
											))}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{lsi.projection.projectionType}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Create GSI Dialog */}
			<CreateGSIDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				tableName={tableName}
			/>

			{/* Delete GSI confirmation */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete GSI</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete index &quot;{deleteTarget}&quot;?
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
									deleteGSI.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteGSI.isPending}
						>
							{deleteGSI.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
