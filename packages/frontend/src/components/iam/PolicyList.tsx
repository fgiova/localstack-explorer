import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeletePolicy, useListPolicies } from "@/api/iam";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CreatePolicyDialog } from "./CreatePolicyDialog";

function truncateArn(arn: string, maxLength = 50): string {
	if (arn.length <= maxLength) return arn;
	return `${arn.slice(0, maxLength - 3)}...`;
}

export function PolicyList() {
	const { data, isLoading, error } = useListPolicies("Local");
	const deletePolicy = useDeletePolicy();
	const [searchTerm, setSearchTerm] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const filteredPolicies =
		data?.policies.filter((p) =>
			p.policyName.toLowerCase().includes(searchTerm.toLowerCase()),
		) ?? [];

	// Find the policy name for the delete confirmation message
	const deleteTargetName = deleteTarget
		? (data?.policies.find((p) => p.arn === deleteTarget)?.policyName ??
			deleteTarget)
		: null;

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
				Error loading policies: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Managed Policies</h2>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Policy
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search policies..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-10"
				/>
			</div>

			{filteredPolicies.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					{data?.policies.length === 0
						? "No policies found. Create one to get started."
						: "No policies match your search."}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Policy Name</TableHead>
							<TableHead>ARN</TableHead>
							<TableHead>Attachments</TableHead>
							<TableHead>Default Version</TableHead>
							<TableHead>Created Date</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredPolicies.map((policy) => (
							<TableRow key={policy.arn}>
								<TableCell>
									<a
										href={`/iam/policies/${encodeURIComponent(policy.arn)}`}
										className="font-medium text-primary hover:underline"
									>
										{policy.policyName}
									</a>
								</TableCell>
								<TableCell
									className="text-muted-foreground font-mono text-sm"
									title={policy.arn}
								>
									{truncateArn(policy.arn)}
								</TableCell>
								<TableCell>{policy.attachmentCount ?? 0}</TableCell>
								<TableCell>{policy.defaultVersionId ?? "-"}</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{policy.createDate
										? new Date(policy.createDate).toLocaleDateString()
										: "-"}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(policy.arn)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<CreatePolicyDialog open={createOpen} onOpenChange={setCreateOpen} />

			{/* Delete confirmation dialog */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Policy</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete policy &quot;{deleteTargetName}
							&quot;? This action cannot be undone.
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
									deletePolicy.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deletePolicy.isPending}
						>
							{deletePolicy.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
