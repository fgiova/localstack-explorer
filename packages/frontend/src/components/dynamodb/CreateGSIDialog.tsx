import { useState } from "react";
import { type CreateGSIRequest, useCreateGSI } from "@/api/dynamodb";
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

interface CreateGSIDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tableName: string;
}

export function CreateGSIDialog({
	open,
	onOpenChange,
	tableName,
}: CreateGSIDialogProps) {
	const [indexName, setIndexName] = useState("");
	const [pkName, setPkName] = useState("");
	const [pkType, setPkType] = useState("S");
	const [hasSortKey, setHasSortKey] = useState(false);
	const [skName, setSkName] = useState("");
	const [skType, setSkType] = useState("S");
	const [projectionType, setProjectionType] = useState("ALL");
	const [readCapacity, setReadCapacity] = useState("5");
	const [writeCapacity, setWriteCapacity] = useState("5");

	const createGSI = useCreateGSI(tableName);

	const resetForm = () => {
		setIndexName("");
		setPkName("");
		setPkType("S");
		setHasSortKey(false);
		setSkName("");
		setSkType("S");
		setProjectionType("ALL");
		setReadCapacity("5");
		setWriteCapacity("5");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!indexName.trim() || !pkName.trim()) return;

		const keySchema: CreateGSIRequest["keySchema"] = [
			{ attributeName: pkName.trim(), keyType: "HASH" },
		];
		if (hasSortKey && skName.trim()) {
			keySchema.push({ attributeName: skName.trim(), keyType: "RANGE" });
		}

		const request: CreateGSIRequest = {
			indexName: indexName.trim(),
			keySchema,
			projection: { projectionType },
			provisionedThroughput: {
				readCapacityUnits: parseInt(readCapacity, 10) || 5,
				writeCapacityUnits: parseInt(writeCapacity, 10) || 5,
			},
		};

		createGSI.mutate(request, {
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
					<DialogTitle>Create Global Secondary Index</DialogTitle>
					<DialogDescription>
						Add a new GSI to table &quot;{tableName}&quot;.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="gsiName">Index Name</Label>
							<Input
								id="gsiName"
								placeholder="my-index"
								value={indexName}
								onChange={(e) => setIndexName(e.target.value)}
								autoFocus
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Partition Key</Label>
								<Input
									placeholder="attribute"
									value={pkName}
									onChange={(e) => setPkName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Type</Label>
								<Select
									value={pkType}
									onChange={(e) => setPkType(e.target.value)}
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
								id="gsiSortKey"
								checked={hasSortKey}
								onChange={(e) => setHasSortKey(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<Label htmlFor="gsiSortKey">Add Sort Key</Label>
						</div>

						{hasSortKey && (
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Sort Key</Label>
									<Input
										placeholder="attribute"
										value={skName}
										onChange={(e) => setSkName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Type</Label>
									<Select
										value={skType}
										onChange={(e) => setSkType(e.target.value)}
									>
										<option value="S">String (S)</option>
										<option value="N">Number (N)</option>
										<option value="B">Binary (B)</option>
									</Select>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label>Projection Type</Label>
							<Select
								value={projectionType}
								onChange={(e) => setProjectionType(e.target.value)}
							>
								<option value="ALL">ALL</option>
								<option value="KEYS_ONLY">KEYS_ONLY</option>
								<option value="INCLUDE">INCLUDE</option>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Read Capacity Units</Label>
								<Input
									type="number"
									min="1"
									value={readCapacity}
									onChange={(e) => setReadCapacity(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Write Capacity Units</Label>
								<Input
									type="number"
									min="1"
									value={writeCapacity}
									onChange={(e) => setWriteCapacity(e.target.value)}
								/>
							</div>
						</div>

						{createGSI.isError && (
							<p className="text-sm text-destructive">
								{createGSI.error.message}
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
								!indexName.trim() || !pkName.trim() || createGSI.isPending
							}
						>
							{createGSI.isPending ? "Creating..." : "Create GSI"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
