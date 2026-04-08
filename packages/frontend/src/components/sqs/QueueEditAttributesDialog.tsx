import { useEffect, useState } from "react";
import { useUpdateQueueAttributes } from "@/api/sqs";
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
import { Label } from "@/components/ui/label";

interface QueueAttributes {
	delaySeconds: number;
	maximumMessageSize: number;
	messageRetentionPeriod: number;
	receiveMessageWaitTimeSeconds: number;
	visibilityTimeout: number;
}

interface QueueEditAttributesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	queueName: string;
	currentAttributes: QueueAttributes;
}

const FIELDS: {
	key: keyof QueueAttributes;
	label: string;
	min: number;
	max: number;
	unit: string;
}[] = [
	{
		key: "delaySeconds",
		label: "Delay Seconds",
		min: 0,
		max: 900,
		unit: "seconds (0–900)",
	},
	{
		key: "visibilityTimeout",
		label: "Visibility Timeout",
		min: 0,
		max: 43200,
		unit: "seconds (0–43200)",
	},
	{
		key: "maximumMessageSize",
		label: "Maximum Message Size",
		min: 1024,
		max: 262144,
		unit: "bytes (1024–262144)",
	},
	{
		key: "messageRetentionPeriod",
		label: "Message Retention Period",
		min: 60,
		max: 1209600,
		unit: "seconds (60–1209600)",
	},
	{
		key: "receiveMessageWaitTimeSeconds",
		label: "Receive Message Wait Time",
		min: 0,
		max: 20,
		unit: "seconds (0–20)",
	},
];

export function QueueEditAttributesDialog({
	open,
	onOpenChange,
	queueName,
	currentAttributes,
}: QueueEditAttributesDialogProps) {
	const [values, setValues] = useState<QueueAttributes>(currentAttributes);
	const updateAttributes = useUpdateQueueAttributes(queueName);

	useEffect(() => {
		if (open) {
			setValues(currentAttributes);
		}
	}, [open, currentAttributes]);

	const handleChange = (key: keyof QueueAttributes, raw: string) => {
		const num = Number(raw);
		if (!Number.isNaN(num)) {
			setValues((prev) => ({ ...prev, [key]: num }));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const changed: Partial<QueueAttributes> = {};
		for (const field of FIELDS) {
			if (values[field.key] !== currentAttributes[field.key]) {
				changed[field.key] = values[field.key];
			}
		}

		if (Object.keys(changed).length === 0) {
			onOpenChange(false);
			return;
		}

		updateAttributes.mutate(changed, {
			onSuccess: () => onOpenChange(false),
		});
	};

	const isValid = FIELDS.every(
		(f) => values[f.key] >= f.min && values[f.key] <= f.max,
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Queue Attributes</DialogTitle>
					<DialogDescription>
						Update the configuration for <strong>{queueName}</strong>.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						{FIELDS.map((field) => (
							<div key={field.key} className="space-y-1.5">
								<Label htmlFor={field.key}>{field.label}</Label>
								<Input
									id={field.key}
									type="number"
									min={field.min}
									max={field.max}
									value={values[field.key]}
									onChange={(e) => handleChange(field.key, e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">{field.unit}</p>
							</div>
						))}
						{updateAttributes.isError && (
							<p className="text-sm text-destructive">
								{updateAttributes.error.message}
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
							disabled={!isValid || updateAttributes.isPending}
						>
							{updateAttributes.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
