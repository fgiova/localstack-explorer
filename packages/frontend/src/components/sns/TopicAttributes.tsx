import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useSetTopicAttribute, useTopicAttributes } from "@/api/sns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface TopicAttributesProps {
	topicName: string;
}

// --- Read-only attribute display ---

interface ReadOnlyItemProps {
	label: string;
	value: string | number | undefined;
}

function ReadOnlyItem({ label, value }: ReadOnlyItemProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border p-4">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<span className="text-lg font-semibold">
				{value !== undefined && value !== "" ? String(value) : "\u2014"}
			</span>
		</div>
	);
}

// --- JSON display block ---

function formatJson(value: string | undefined): string {
	if (!value) return "\u2014";
	try {
		return JSON.stringify(JSON.parse(value), null, 2);
	} catch {
		return value;
	}
}

// --- Editable text field ---

interface EditableTextFieldProps {
	label: string;
	attributeName: string;
	value: string | undefined;
	topicName: string;
}

function EditableTextField({
	label,
	attributeName,
	value,
	topicName,
}: EditableTextFieldProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value ?? "");
	const setAttribute = useSetTopicAttribute(topicName);

	const handleEdit = () => {
		setDraft(value ?? "");
		setEditing(true);
	};

	const handleCancel = () => {
		setEditing(false);
		setDraft(value ?? "");
	};

	const handleSave = () => {
		setAttribute.mutate(
			{ attributeName, attributeValue: draft },
			{
				onSuccess: () => setEditing(false),
			},
		);
	};

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
				{!editing && (
					<Button variant="ghost" size="sm" onClick={handleEdit}>
						<Pencil className="mr-1 h-3 w-3" />
						Edit
					</Button>
				)}
			</div>
			{editing ? (
				<div className="flex items-center gap-2">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						className="flex-1"
					/>
					<Button
						size="sm"
						onClick={handleSave}
						disabled={setAttribute.isPending}
					>
						<Save className="mr-1 h-3 w-3" />
						{setAttribute.isPending ? "Saving..." : "Save"}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCancel}
						disabled={setAttribute.isPending}
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			) : (
				<span className="text-lg font-semibold">{value || "\u2014"}</span>
			)}
		</div>
	);
}

// --- Editable JSON field ---

interface EditableJsonFieldProps {
	label: string;
	attributeName: string;
	value: string | undefined;
	topicName: string;
}

function EditableJsonField({
	label,
	attributeName,
	value,
	topicName,
}: EditableJsonFieldProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [parseError, setParseError] = useState<string | null>(null);
	const setAttribute = useSetTopicAttribute(topicName);

	const handleEdit = () => {
		setDraft(formatJson(value));
		setParseError(null);
		setEditing(true);
	};

	const handleCancel = () => {
		setEditing(false);
		setDraft("");
		setParseError(null);
	};

	const handleSave = () => {
		// Validate JSON before saving
		try {
			JSON.parse(draft);
		} catch {
			setParseError("Invalid JSON. Please fix the syntax and try again.");
			return;
		}
		setParseError(null);

		setAttribute.mutate(
			{ attributeName, attributeValue: draft },
			{
				onSuccess: () => setEditing(false),
			},
		);
	};

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
				{!editing && (
					<Button variant="ghost" size="sm" onClick={handleEdit}>
						<Pencil className="mr-1 h-3 w-3" />
						Edit
					</Button>
				)}
			</div>
			{editing ? (
				<div className="flex flex-col gap-2">
					<Textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={10}
						className="font-mono text-sm"
					/>
					{parseError && (
						<p className="text-sm text-destructive">{parseError}</p>
					)}
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							onClick={handleSave}
							disabled={setAttribute.isPending}
						>
							<Save className="mr-1 h-3 w-3" />
							{setAttribute.isPending ? "Saving..." : "Save"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCancel}
							disabled={setAttribute.isPending}
						>
							<X className="mr-1 h-3 w-3" />
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<pre className="overflow-auto rounded-md bg-muted p-3 text-sm">
					{formatJson(value)}
				</pre>
			)}
		</div>
	);
}

// --- Main component ---

export function TopicAttributes({ topicName }: TopicAttributesProps) {
	const { data, isLoading, error } = useTopicAttributes(topicName);
	const topic = data?.topic;

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
				Error loading topic attributes: {error.message}
			</div>
		);
	}

	if (!topic) {
		return (
			<div className="rounded-md border p-4 text-muted-foreground">
				No attributes available.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Read-only attributes */}
			<Card>
				<CardHeader>
					<CardTitle>Topic Information</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<ReadOnlyItem label="Topic ARN" value={topic.topicArn} />
						<ReadOnlyItem label="Owner" value={topic.owner} />
						<div className="flex flex-col gap-1 rounded-lg border p-4">
							<span className="text-xs font-medium text-muted-foreground">
								Subscriptions Confirmed
							</span>
							<Badge variant="secondary" className="w-fit text-lg">
								{topic.subscriptionsConfirmed ?? 0}
							</Badge>
						</div>
						<div className="flex flex-col gap-1 rounded-lg border p-4">
							<span className="text-xs font-medium text-muted-foreground">
								Subscriptions Pending
							</span>
							<Badge variant="secondary" className="w-fit text-lg">
								{topic.subscriptionsPending ?? 0}
							</Badge>
						</div>
						<div className="flex flex-col gap-1 rounded-lg border p-4">
							<span className="text-xs font-medium text-muted-foreground">
								Subscriptions Deleted
							</span>
							<Badge variant="secondary" className="w-fit text-lg">
								{topic.subscriptionsDeleted ?? 0}
							</Badge>
						</div>
					</div>

					{/* Effective Delivery Policy (read-only JSON) */}
					{topic.effectiveDeliveryPolicy && (
						<div className="mt-4 flex flex-col gap-1 rounded-lg border p-4">
							<span className="text-xs font-medium text-muted-foreground">
								Effective Delivery Policy
							</span>
							<pre className="overflow-auto rounded-md bg-muted p-3 text-sm">
								{formatJson(topic.effectiveDeliveryPolicy)}
							</pre>
						</div>
					)}
				</CardContent>
			</Card>

			<Separator />

			{/* Editable attributes */}
			<Card>
				<CardHeader>
					<CardTitle>Editable Attributes</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<EditableTextField
						label="Display Name"
						attributeName="DisplayName"
						value={topic.displayName}
						topicName={topicName}
					/>

					<EditableJsonField
						label="Policy"
						attributeName="Policy"
						value={topic.policy}
						topicName={topicName}
					/>

					<EditableJsonField
						label="Delivery Policy"
						attributeName="DeliveryPolicy"
						value={topic.deliveryPolicy}
						topicName={topicName}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
