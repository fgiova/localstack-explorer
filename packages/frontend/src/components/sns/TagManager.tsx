import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAddTags, useRemoveTags, useTopicTags } from "@/api/sns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface TagManagerProps {
	topicName: string;
}

export function TagManager({ topicName }: TagManagerProps) {
	const { data, isLoading, error } = useTopicTags(topicName);
	const addTags = useAddTags(topicName);
	const removeTags = useRemoveTags(topicName);

	const [newKey, setNewKey] = useState("");
	const [newValue, setNewValue] = useState("");

	const tags = data?.tags ?? [];

	function handleAddTag() {
		const trimmedKey = newKey.trim();
		const trimmedValue = newValue.trim();
		if (!trimmedKey || !trimmedValue) return;

		addTags.mutate(
			{ tags: [{ key: trimmedKey, value: trimmedValue }] },
			{
				onSuccess: () => {
					setNewKey("");
					setNewValue("");
				},
			},
		);
	}

	function handleRemoveTag(key: string) {
		removeTags.mutate({ tagKeys: [key] });
	}

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
				Error loading tags: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Add Tag Form */}
			<div className="flex items-end gap-3">
				<div className="flex-1 space-y-1">
					<Label htmlFor="tag-key">Key</Label>
					<Input
						id="tag-key"
						placeholder="Tag key"
						value={newKey}
						onChange={(e) => setNewKey(e.target.value)}
					/>
				</div>
				<div className="flex-1 space-y-1">
					<Label htmlFor="tag-value">Value</Label>
					<Input
						id="tag-value"
						placeholder="Tag value"
						value={newValue}
						onChange={(e) => setNewValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleAddTag();
						}}
					/>
				</div>
				<Button
					onClick={handleAddTag}
					disabled={!newKey.trim() || !newValue.trim() || addTags.isPending}
				>
					<Plus className="mr-2 h-4 w-4" />
					{addTags.isPending ? "Adding..." : "Add Tag"}
				</Button>
			</div>

			{addTags.isError && (
				<div className="rounded-md border border-destructive p-3 text-sm text-destructive">
					Failed to add tag: {addTags.error.message}
				</div>
			)}

			{removeTags.isError && (
				<div className="rounded-md border border-destructive p-3 text-sm text-destructive">
					Failed to remove tag: {removeTags.error.message}
				</div>
			)}

			{/* Tags Table */}
			{tags.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					No tags found. Add a tag above to get started.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Key</TableHead>
							<TableHead>Value</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tags.map((tag) => (
							<TableRow key={tag.key}>
								<TableCell className="font-medium">{tag.key}</TableCell>
								<TableCell className="text-muted-foreground">
									{tag.value}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveTag(tag.key)}
										disabled={removeTags.isPending}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
