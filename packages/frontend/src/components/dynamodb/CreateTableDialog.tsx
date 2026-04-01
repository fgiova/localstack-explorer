import { useState } from "react";
import { type CreateTableRequest, useCreateTable } from "@/api/dynamodb";
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

interface CreateTableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateTableDialog({
	open,
	onOpenChange,
}: CreateTableDialogProps) {
	const [tableName, setTableName] = useState("");
	const [partitionKeyName, setPartitionKeyName] = useState("");
	const [partitionKeyType, setPartitionKeyType] = useState("S");
	const [hasSortKey, setHasSortKey] = useState(false);
	const [sortKeyName, setSortKeyName] = useState("");
	const [sortKeyType, setSortKeyType] = useState("S");
	const [readCapacity, setReadCapacity] = useState("5");
	const [writeCapacity, setWriteCapacity] = useState("5");

	const createTable = useCreateTable();

	const resetForm = () => {
		setTableName("");
		setPartitionKeyName("");
		setPartitionKeyType("S");
		setHasSortKey(false);
		setSortKeyName("");
		setSortKeyType("S");
		setReadCapacity("5");
		setWriteCapacity("5");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!tableName.trim() || !partitionKeyName.trim()) return;

		const keySchema: CreateTableRequest["keySchema"] = [
			{ attributeName: partitionKeyName.trim(), keyType: "HASH" },
		];
		const attributeDefinitions: CreateTableRequest["attributeDefinitions"] = [
			{
				attributeName: partitionKeyName.trim(),
				attributeType: partitionKeyType,
			},
		];

		if (hasSortKey && sortKeyName.trim()) {
			keySchema.push({ attributeName: sortKeyName.trim(), keyType: "RANGE" });
			attributeDefinitions.push({
				attributeName: sortKeyName.trim(),
				attributeType: sortKeyType,
			});
		}

		const request: CreateTableRequest = {
			tableName: tableName.trim(),
			keySchema,
			attributeDefinitions,
			provisionedThroughput: {
				readCapacityUnits: parseInt(readCapacity, 10) || 5,
				writeCapacityUnits: parseInt(writeCapacity, 10) || 5,
			},
		};

		createTable.mutate(request, {
			onSuccess: () => {
				resetForm();
				onOpenChange(false);
			},
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create Table</DialogTitle>
					<DialogDescription>
						Define the table name and key schema for the new DynamoDB table.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="tableName">Table Name</Label>
							<Input
								id="tableName"
								placeholder="my-table"
								value={tableName}
								onChange={(e) => setTableName(e.target.value)}
								autoFocus
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="pkName">Partition Key</Label>
								<Input
									id="pkName"
									placeholder="id"
									value={partitionKeyName}
									onChange={(e) => setPartitionKeyName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="pkType">Type</Label>
								<Select
									id="pkType"
									value={partitionKeyType}
									onChange={(e) => setPartitionKeyType(e.target.value)}
								>
									<option value="S">String (S)</option>
									<option value="N">Number (N)</option>
									<option value="B">Binary (B)</option>
								</Select>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="hasSortKey"
								checked={hasSortKey}
								onChange={(e) => setHasSortKey(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<Label htmlFor="hasSortKey">Add Sort Key</Label>
						</div>

						{hasSortKey && (
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="skName">Sort Key</Label>
									<Input
										id="skName"
										placeholder="timestamp"
										value={sortKeyName}
										onChange={(e) => setSortKeyName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="skType">Type</Label>
									<Select
										id="skType"
										value={sortKeyType}
										onChange={(e) => setSortKeyType(e.target.value)}
									>
										<option value="S">String (S)</option>
										<option value="N">Number (N)</option>
										<option value="B">Binary (B)</option>
									</Select>
								</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="rcu">Read Capacity Units</Label>
								<Input
									id="rcu"
									type="number"
									min="1"
									value={readCapacity}
									onChange={(e) => setReadCapacity(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="wcu">Write Capacity Units</Label>
								<Input
									id="wcu"
									type="number"
									min="1"
									value={writeCapacity}
									onChange={(e) => setWriteCapacity(e.target.value)}
								/>
							</div>
						</div>

						{createTable.isError && (
							<p className="text-sm text-destructive">
								{createTable.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								!tableName.trim() ||
								!partitionKeyName.trim() ||
								createTable.isPending
							}
						>
							{createTable.isPending ? "Creating..." : "Create Table"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
