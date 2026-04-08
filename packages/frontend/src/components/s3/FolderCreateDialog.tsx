import { useState } from "react";
import { useCreateFolder } from "@/api/s3";
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

interface FolderCreateDialogProps {
	bucketName: string;
	prefix: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FolderCreateDialog({
	bucketName,
	prefix,
	open,
	onOpenChange,
}: FolderCreateDialogProps) {
	const [name, setName] = useState("");
	const createFolder = useCreateFolder(bucketName);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		const folderKey = `${prefix}${name.trim()}`;
		createFolder.mutate(folderKey, {
			onSuccess: () => {
				setName("");
				onOpenChange(false);
			},
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Folder</DialogTitle>
					<DialogDescription>
						Create a new folder in {bucketName}/{prefix}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="py-4">
						<Input
							placeholder="folder-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						{createFolder.isError && (
							<p className="mt-2 text-sm text-destructive">
								{createFolder.error.message}
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
							disabled={!name.trim() || createFolder.isPending}
						>
							{createFolder.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
