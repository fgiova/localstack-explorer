import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Stack } from "@/api/cloudformation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type StatusCategory = "all" | "complete" | "in_progress" | "failed";

interface StackFiltersProps {
	stacks: Stack[];
	onFilteredChange: (filtered: Stack[]) => void;
}

function matchesStatusCategory(
	status: string,
	category: StatusCategory,
): boolean {
	switch (category) {
		case "all":
			return true;
		case "complete":
			return status.includes("COMPLETE") && !status.includes("ROLLBACK");
		case "in_progress":
			return status.includes("IN_PROGRESS");
		case "failed":
			return status.includes("FAILED") || status.includes("ROLLBACK");
		default:
			return true;
	}
}

export function StackFilters({ stacks, onFilteredChange }: StackFiltersProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusCategory>("all");

	useEffect(() => {
		const lowerSearch = searchTerm.toLowerCase();
		const filtered = stacks.filter((stack) => {
			const matchesSearch = stack.stackName.toLowerCase().includes(lowerSearch);
			const matchesStatus = matchesStatusCategory(stack.status, statusFilter);
			return matchesSearch && matchesStatus;
		});
		onFilteredChange(filtered);
	}, [searchTerm, statusFilter, stacks, onFilteredChange]);

	return (
		<div className="flex items-center gap-4">
			<div className="relative flex-1 max-w-sm">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search stacks..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-8"
				/>
			</div>
			<Select
				value={statusFilter}
				onChange={(e) => setStatusFilter(e.target.value as StatusCategory)}
				className="w-[180px]"
			>
				<option value="all">All</option>
				<option value="complete">Complete</option>
				<option value="in_progress">In Progress</option>
				<option value="failed">Failed / Rollback</option>
			</Select>
		</div>
	);
}
