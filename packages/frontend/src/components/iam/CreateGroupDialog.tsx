import { useState } from "react";
import { useCreateGroup } from "@/api/iam";
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

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({
	open,
	onOpenChange,
}: CreateGroupDialogProps) {
	const [name, setName] = useState("");
	const [path, setPath] = useState("");
	const createGroup = useCreateGroup();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createGroup.mutate(
			{ groupName: name.trim(), ...(path.trim() && { path: path.trim() }) },
			{
				onSuccess: () => {
					setName("");
					setPath("");
					onOpenChange(false);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Group</DialogTitle>
					<DialogDescription>
						Enter a name for the new IAM group.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<Input
							placeholder="my-group"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						<Input
							placeholder="/"
							value={path}
							onChange={(e) => setPath(e.target.value)}
						/>
						{createGroup.isError && (
							<p className="mt-2 text-sm text-destructive">
								{createGroup.error.message}
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
							disabled={!name.trim() || createGroup.isPending}
						>
							{createGroup.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
