import { useEffect, useState } from "react";
import { useSetFilterPolicy, useSubscriptionAttributes } from "@/api/sns";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FilterPolicyDialogProps {
	subscriptionArn: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FilterPolicyDialog({
	subscriptionArn,
	open,
	onOpenChange,
}: FilterPolicyDialogProps) {
	const { data, isLoading } = useSubscriptionAttributes(subscriptionArn);
	const setFilterPolicy = useSetFilterPolicy(subscriptionArn);
	const [policyText, setPolicyText] = useState("");
	const [jsonError, setJsonError] = useState<string | null>(null);

	// Sync policy text when data loads
	useEffect(() => {
		if (data?.subscription?.filterPolicy) {
			try {
				// Try to pretty-print if it's valid JSON
				const parsed =
					typeof data.subscription.filterPolicy === "string"
						? JSON.parse(data.subscription.filterPolicy)
						: data.subscription.filterPolicy;
				setPolicyText(JSON.stringify(parsed, null, 2));
			} catch {
				setPolicyText(data.subscription.filterPolicy);
			}
		} else {
			setPolicyText("");
		}
	}, [data?.subscription?.filterPolicy]);

	function validateJson(text: string): boolean {
		if (!text.trim()) {
			setJsonError(null);
			return true;
		}
		try {
			JSON.parse(text);
			setJsonError(null);
			return true;
		} catch (err) {
			setJsonError(err instanceof Error ? err.message : "Invalid JSON");
			return false;
		}
	}

	function handleSave() {
		const trimmed = policyText.trim();

		if (!trimmed) {
			// Empty filter policy - set to empty object
			setFilterPolicy.mutate(
				{ filterPolicy: "{}" },
				{
					onSuccess: () => onOpenChange(false),
				},
			);
			return;
		}

		if (!validateJson(trimmed)) return;

		const parsed = JSON.parse(trimmed);
		setFilterPolicy.mutate(
			{ filterPolicy: parsed },
			{
				onSuccess: () => onOpenChange(false),
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Filter Policy</DialogTitle>
					<DialogDescription>
						Edit the filter policy for this subscription. The filter policy
						defines which messages are delivered to the subscription endpoint.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					</div>
				) : (
					<div className="space-y-3 py-2">
						<div className="space-y-2">
							<Label htmlFor="filter-policy">Filter Policy (JSON)</Label>
							<Textarea
								id="filter-policy"
								value={policyText}
								onChange={(e) => {
									setPolicyText(e.target.value);
									if (jsonError) validateJson(e.target.value);
								}}
								onBlur={() => validateJson(policyText)}
								placeholder='{"attribute": ["value1", "value2"]}'
								className="font-mono text-sm min-h-[200px]"
								rows={10}
							/>
							{jsonError && (
								<p className="text-sm text-destructive">{jsonError}</p>
							)}
						</div>

						<div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
							<p className="font-medium mb-1">Example filter policy:</p>
							<pre className="font-mono text-xs whitespace-pre-wrap">
								{`{
  "eventType": ["order_placed", "order_cancelled"],
  "store": [{"prefix": "store-"}],
  "price": [{"numeric": [">=", 100]}]
}`}
							</pre>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isLoading || setFilterPolicy.isPending || !!jsonError}
					>
						{setFilterPolicy.isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
