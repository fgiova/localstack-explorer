import { ChevronRight, Eye, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type ItemsResponse,
	useDeleteItem,
	useDescribeTable,
	useScanItems,
} from "@/api/dynamodb";
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
import { ItemEditorDialog } from "./ItemEditorDialog";

interface ItemBrowserProps {
	tableName: string;
}

export function ItemBrowser({ tableName }: ItemBrowserProps) {
	const { data: tableDetail } = useDescribeTable(tableName);
	const scanItems = useScanItems(tableName);
	const deleteItem = useDeleteItem(tableName);

	const [items, setItems] = useState<Record<string, unknown>[]>([]);
	const [lastKey, setLastKey] = useState<Record<string, unknown> | undefined>();
	const [columns, setColumns] = useState<string[]>([]);
	const [selectedItem, setSelectedItem] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
	const [deleteTarget, setDeleteTarget] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [scanCount, setScanCount] = useState({ count: 0, scannedCount: 0 });

	// Initial scan
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation ref changes every render, tableName triggers re-scan
	useEffect(() => {
		scanItems.mutate(
			{},
			{
				onSuccess: (data: ItemsResponse) => {
					setItems(data.items);
					setLastKey(data.lastEvaluatedKey);
					setScanCount({ count: data.count, scannedCount: data.scannedCount });
					updateColumns(data.items);
				},
			},
		);
	}, [tableName]);

	const updateColumns = (newItems: Record<string, unknown>[]) => {
		const colSet = new Set<string>();
		for (const item of newItems) {
			for (const key of Object.keys(item)) {
				colSet.add(key);
			}
		}
		setColumns(Array.from(colSet));
	};

	const handleLoadMore = () => {
		if (!lastKey) return;
		scanItems.mutate(
			{ exclusiveStartKey: lastKey },
			{
				onSuccess: (data: ItemsResponse) => {
					const allItems = [...items, ...data.items];
					setItems(allItems);
					setLastKey(data.lastEvaluatedKey);
					setScanCount((prev) => ({
						count: prev.count + data.count,
						scannedCount: prev.scannedCount + data.scannedCount,
					}));
					updateColumns(allItems);
				},
			},
		);
	};

	const extractKey = (
		item: Record<string, unknown>,
	): Record<string, unknown> => {
		const key: Record<string, unknown> = {};
		if (tableDetail?.keySchema) {
			for (const ks of tableDetail.keySchema) {
				key[ks.attributeName] = item[ks.attributeName];
			}
		}
		return key;
	};

	const handleEdit = (item: Record<string, unknown>) => {
		setSelectedItem(item);
		setEditorMode("edit");
		setEditorOpen(true);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		setEditorMode("create");
		setEditorOpen(true);
	};

	const handleDelete = (item: Record<string, unknown>) => {
		setDeleteTarget(item);
	};

	const confirmDelete = () => {
		if (!deleteTarget) return;
		const key = extractKey(deleteTarget);
		deleteItem.mutate(key, {
			onSuccess: () => {
				setItems((prev) =>
					prev.filter((i) => {
						const iKey = extractKey(i);
						return JSON.stringify(iKey) !== JSON.stringify(key);
					}),
				);
				setDeleteTarget(null);
			},
		});
	};

	const handleItemSaved = () => {
		// Re-scan to refresh items
		scanItems.mutate(
			{},
			{
				onSuccess: (data: ItemsResponse) => {
					setItems(data.items);
					setLastKey(data.lastEvaluatedKey);
					setScanCount({ count: data.count, scannedCount: data.scannedCount });
					updateColumns(data.items);
				},
			},
		);
	};

	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) return "\u2014";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{scanCount.count} items</Badge>
					{scanCount.scannedCount > scanCount.count && (
						<Badge variant="outline">{scanCount.scannedCount} scanned</Badge>
					)}
				</div>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 h-4 w-4" />
					Add Item
				</Button>
			</div>

			{scanItems.isPending && items.length === 0 ? (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : items.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					No items found. Add an item to get started.
				</div>
			) : (
				<>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									{columns.map((col) => (
										<TableHead key={col}>
											{tableDetail?.keySchema.some(
												(ks) => ks.attributeName === col,
											) ? (
												<span className="flex items-center gap-1">
													{col}
													<Badge variant="outline" className="text-xs">
														key
													</Badge>
												</span>
											) : (
												col
											)}
										</TableHead>
									))}
									<TableHead className="w-[120px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item, idx) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: dynamic DynamoDB items have no stable unique key
									<TableRow key={idx}>
										{columns.map((col) => (
											<TableCell
												key={col}
												className="max-w-[300px] truncate font-mono text-sm"
											>
												{formatCellValue(item[col])}
											</TableCell>
										))}
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(item)}
													title="Edit"
												>
													<Eye className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(item)}
													title="Delete"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{lastKey && (
						<div className="flex justify-center">
							<Button
								variant="outline"
								onClick={handleLoadMore}
								disabled={scanItems.isPending}
							>
								{scanItems.isPending ? "Loading..." : "Load More"}
								<ChevronRight className="ml-2 h-4 w-4" />
							</Button>
						</div>
					)}
				</>
			)}

			<ItemEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				tableName={tableName}
				mode={editorMode}
				item={selectedItem}
				onSaved={handleItemSaved}
			/>

			{/* Delete confirmation */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Item</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this item? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<pre className="rounded-md bg-muted p-4 text-sm overflow-auto max-h-[200px]">
						{deleteTarget
							? JSON.stringify(extractKey(deleteTarget), null, 2)
							: ""}
					</pre>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteItem.isPending}
						>
							{deleteItem.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
