import { useState } from "react";
import { useCreateUser } from "@/api/iam";
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

interface CreateUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({
	open,
	onOpenChange,
}: CreateUserDialogProps) {
	const [name, setName] = useState("");
	const [path, setPath] = useState("");
	const createUser = useCreateUser();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createUser.mutate(
			{ userName: name.trim(), ...(path.trim() && { path: path.trim() }) },
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
					<DialogTitle>Create User</DialogTitle>
					<DialogDescription>
						Enter a name for the new IAM user.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<Input
							placeholder="user-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						<Input
							placeholder="/"
							value={path}
							onChange={(e) => setPath(e.target.value)}
						/>
						{createUser.isError && (
							<p className="mt-2 text-sm text-destructive">
								{createUser.error.message}
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
							disabled={!name.trim() || createUser.isPending}
						>
							{createUser.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
