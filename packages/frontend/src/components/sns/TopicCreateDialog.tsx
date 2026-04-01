import { useState } from "react";
import { useCreateTopic } from "@/api/sns";
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

interface TopicCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TopicCreateDialog({
	open,
	onOpenChange,
}: TopicCreateDialogProps) {
	const [name, setName] = useState("");
	const createTopic = useCreateTopic();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createTopic.mutate(
			{ name: name.trim() },
			{
				onSuccess: () => {
					setName("");
					onOpenChange(false);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Topic</DialogTitle>
					<DialogDescription>
						Enter a name for the new SNS topic.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="py-4">
						<Input
							placeholder="my-topic-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						{createTopic.isError && (
							<p className="mt-2 text-sm text-destructive">
								{createTopic.error.message}
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
							disabled={!name.trim() || createTopic.isPending}
						>
							{createTopic.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
