import { useState } from "react";
import { useCreateBucket } from "@/api/s3";
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

interface BucketCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BucketCreateDialog({
	open,
	onOpenChange,
}: BucketCreateDialogProps) {
	const [name, setName] = useState("");
	const createBucket = useCreateBucket();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createBucket.mutate(name.trim(), {
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
					<DialogTitle>Create Bucket</DialogTitle>
					<DialogDescription>
						Enter a name for the new S3 bucket.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="py-4">
						<Input
							placeholder="my-bucket-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						{createBucket.isError && (
							<p className="mt-2 text-sm text-destructive">
								{createBucket.error.message}
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
							disabled={!name.trim() || createBucket.isPending}
						>
							{createBucket.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
