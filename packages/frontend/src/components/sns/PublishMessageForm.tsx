import { lazy, Suspense, useCallback, useState } from "react";
import { usePublishBatch, usePublishMessage } from "@/api/sns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

type AttributeDataType = "String" | "Number" | "Binary";

interface MessageAttributeRow {
	id: number;
	name: string;
	dataType: AttributeDataType;
	value: string;
}

interface BatchEntry {
	id: string;
	message: string;
	subject: string;
}

interface PublishMessageFormProps {
	topicName: string;
}

let nextAttrId = 1;
let nextBatchId = 1;

function isValidJson(value: string): boolean {
	try {
		JSON.parse(value);
		return true;
	} catch {
		return false;
	}
}

export function PublishMessageForm({ topicName }: PublishMessageFormProps) {
	// Single publish state
	const [body, setBody] = useState("");
	const [subject, setSubject] = useState("");
	const [targetArn, setTargetArn] = useState("");
	const [attributes, setAttributes] = useState<MessageAttributeRow[]>([]);
	const [jsonMode, setJsonMode] = useState(false);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Batch publish state
	const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
	const [batchSuccessResults, setBatchSuccessResults] = useState<
		Array<{ id: string; messageId: string }>
	>([]);
	const [batchFailedResults, setBatchFailedResults] = useState<
		Array<{ id: string; code: string; message?: string }>
	>([]);
	const [batchError, setBatchError] = useState<string | null>(null);

	const publishMessage = usePublishMessage(topicName);
	const publishBatch = usePublishBatch(topicName);

	// --- JSON helpers ---

	const validateJson = useCallback((value: string) => {
		if (!value.trim()) {
			setJsonError(null);
			return;
		}
		if (isValidJson(value)) {
			setJsonError(null);
		} else {
			setJsonError("Invalid JSON");
		}
	}, []);

	function handleJsonModeToggle(checked: boolean) {
		if (checked) {
			if (body.trim() && !isValidJson(body)) {
				setJsonError(
					"Current content is not valid JSON. Fix it before switching to JSON mode.",
				);
				return;
			}
			if (body.trim()) {
				setBody(JSON.stringify(JSON.parse(body), null, 2));
			}
			setJsonError(null);
			setJsonMode(true);
		} else {
			setJsonMode(false);
			setJsonError(null);
		}
	}

	function handleFormat() {
		if (isValidJson(body)) {
			setBody(JSON.stringify(JSON.parse(body), null, 2));
			setJsonError(null);
		} else {
			setJsonError("Cannot format: invalid JSON");
		}
	}

	function handleEditorChange(value: string | undefined) {
		const newValue = value ?? "";
		setBody(newValue);
		validateJson(newValue);
	}

	// --- Attribute helpers ---

	function addAttribute() {
		setAttributes((prev) => [
			...prev,
			{ id: nextAttrId++, name: "", dataType: "String", value: "" },
		]);
	}

	function removeAttribute(id: number) {
		setAttributes((prev) => prev.filter((attr) => attr.id !== id));
	}

	function updateAttribute(
		id: number,
		field: keyof Omit<MessageAttributeRow, "id">,
		value: string,
	) {
		setAttributes((prev) =>
			prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr)),
		);
	}

	// --- Batch helpers ---

	function addBatchEntry() {
		setBatchEntries((prev) => [
			...prev,
			{ id: `entry-${nextBatchId++}`, message: "", subject: "" },
		]);
	}

	function removeBatchEntry(id: string) {
		setBatchEntries((prev) => prev.filter((entry) => entry.id !== id));
	}

	function updateBatchEntry(
		id: string,
		field: keyof Omit<BatchEntry, "id">,
		value: string,
	) {
		setBatchEntries((prev) =>
			prev.map((entry) =>
				entry.id === id ? { ...entry, [field]: value } : entry,
			),
		);
	}

	// --- Form resets ---

	function resetSingleForm() {
		setBody("");
		setSubject("");
		setTargetArn("");
		setAttributes([]);
		setJsonError(null);
	}

	function resetBatchForm() {
		setBatchEntries([]);
		setBatchSuccessResults([]);
		setBatchFailedResults([]);
	}

	// --- Submit handlers ---

	function handleSingleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSuccessMessage(null);
		setErrorMessage(null);

		const messageAttributes: Record<
			string,
			{ dataType: string; stringValue: string }
		> = {};

		for (const attr of attributes) {
			if (!attr.name.trim()) continue;
			messageAttributes[attr.name.trim()] = {
				dataType: attr.dataType,
				stringValue: attr.value,
			};
		}

		const messageBody =
			jsonMode && isValidJson(body) ? JSON.stringify(JSON.parse(body)) : body;

		const request = {
			message: messageBody,
			...(subject.trim() && { subject: subject.trim() }),
			...(targetArn.trim() && { targetArn: targetArn.trim() }),
			...(Object.keys(messageAttributes).length > 0 && { messageAttributes }),
		};

		publishMessage.mutate(request, {
			onSuccess: (data) => {
				setSuccessMessage(data.messageId);
				resetSingleForm();
			},
			onError: (err: unknown) => {
				const message =
					err instanceof Error ? err.message : "Failed to publish message.";
				setErrorMessage(message);
			},
		});
	}

	function handleBatchSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBatchSuccessResults([]);
		setBatchFailedResults([]);
		setBatchError(null);

		const entries = batchEntries
			.filter((entry) => entry.message.trim())
			.map((entry) => ({
				id: entry.id,
				message: entry.message,
				...(entry.subject.trim() && { subject: entry.subject.trim() }),
			}));

		if (entries.length === 0) {
			setBatchError("At least one entry with a message is required.");
			return;
		}

		publishBatch.mutate(
			{ entries },
			{
				onSuccess: (data) => {
					setBatchSuccessResults(data.successful ?? []);
					setBatchFailedResults(data.failed ?? []);
					resetBatchForm();
					// Keep results visible by re-setting them after reset
					setBatchSuccessResults(data.successful ?? []);
					setBatchFailedResults(data.failed ?? []);
				},
				onError: (err: unknown) => {
					const message =
						err instanceof Error ? err.message : "Failed to publish batch.";
					setBatchError(message);
				},
			},
		);
	}

	const singleIsPending = publishMessage.isPending;
	const batchIsPending = publishBatch.isPending;
	const hasJsonError = jsonMode && jsonError !== null;
	const canSubmitSingle = body.trim() && !singleIsPending && !hasJsonError;

	return (
		<Tabs defaultValue="single" className="w-full">
			<TabsList>
				<TabsTrigger value="single">Single Publish</TabsTrigger>
				<TabsTrigger value="batch">Batch Publish</TabsTrigger>
			</TabsList>

			{/* --- Single Publish --- */}
			<TabsContent value="single">
				<form onSubmit={handleSingleSubmit} className="space-y-4">
					{/* JSON mode toggle */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Switch
								id="sns-json-mode"
								checked={jsonMode}
								onCheckedChange={handleJsonModeToggle}
								disabled={singleIsPending}
							/>
							<Label htmlFor="sns-json-mode" className="text-sm">
								JSON Editor
							</Label>
						</div>
						{jsonMode && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleFormat}
								disabled={singleIsPending || !body.trim()}
							>
								Format
							</Button>
						)}
					</div>

					{/* Message Body */}
					<div className="space-y-1.5">
						<Label htmlFor="sns-message-body">Message Body *</Label>
						{jsonMode ? (
							<Suspense
								fallback={
									<div className="flex h-[200px] items-center justify-center rounded-md border">
										<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									</div>
								}
							>
								<div className="overflow-hidden rounded-md border">
									<MonacoEditor
										height="200px"
										language="json"
										value={body}
										onChange={handleEditorChange}
										options={{
											minimap: { enabled: false },
											scrollBeyondLastLine: false,
											fontSize: 13,
											lineNumbers: "on",
											automaticLayout: true,
											tabSize: 2,
											formatOnPaste: true,
											readOnly: singleIsPending,
										}}
										theme="vs-dark"
									/>
								</div>
							</Suspense>
						) : (
							<Textarea
								id="sns-message-body"
								placeholder="Enter message body..."
								value={body}
								onChange={(e) => setBody(e.target.value)}
								required
								rows={4}
								disabled={singleIsPending}
							/>
						)}
						{jsonError && (
							<p className="text-sm text-destructive">{jsonError}</p>
						)}
					</div>

					{/* Subject */}
					<div className="space-y-1.5">
						<Label htmlFor="sns-subject">Subject (optional)</Label>
						<Input
							id="sns-subject"
							placeholder="Message subject..."
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							disabled={singleIsPending}
						/>
					</div>

					{/* Target ARN */}
					<div className="space-y-1.5">
						<Label htmlFor="sns-target-arn">
							Target ARN (optional, for direct publish)
						</Label>
						<Input
							id="sns-target-arn"
							placeholder="arn:aws:sns:..."
							value={targetArn}
							onChange={(e) => setTargetArn(e.target.value)}
							disabled={singleIsPending}
						/>
					</div>

					{/* Message Attributes */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Message Attributes (optional)</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={addAttribute}
								disabled={singleIsPending}
							>
								Add Attribute
							</Button>
						</div>

						{attributes.length > 0 && (
							<div className="space-y-2">
								{attributes.map((attr) => (
									<div
										key={attr.id}
										className="flex items-center gap-2 rounded-md border border-input p-2"
									>
										<Input
											placeholder="Name"
											value={attr.name}
											onChange={(e) =>
												updateAttribute(attr.id, "name", e.target.value)
											}
											disabled={singleIsPending}
											className="flex-1"
											aria-label="Attribute name"
										/>
										<Select
											value={attr.dataType}
											onChange={(e) =>
												updateAttribute(
													attr.id,
													"dataType",
													e.target.value as AttributeDataType,
												)
											}
											disabled={singleIsPending}
											className="w-28"
											aria-label="Attribute data type"
										>
											<option value="String">String</option>
											<option value="Number">Number</option>
											<option value="Binary">Binary</option>
										</Select>
										<Input
											placeholder="Value"
											value={attr.value}
											onChange={(e) =>
												updateAttribute(attr.id, "value", e.target.value)
											}
											disabled={singleIsPending}
											className="flex-1"
											aria-label="Attribute value"
										/>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => removeAttribute(attr.id)}
											disabled={singleIsPending}
											aria-label="Remove attribute"
										>
											Remove
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Feedback */}
					{successMessage && (
						<div className="flex items-center gap-2">
							<p className="text-sm text-green-600">
								Message published successfully.
							</p>
							<Badge variant="secondary">ID: {successMessage}</Badge>
						</div>
					)}
					{errorMessage && (
						<p className="text-sm text-destructive">{errorMessage}</p>
					)}

					{/* Submit */}
					<Button type="submit" disabled={!canSubmitSingle}>
						{singleIsPending ? "Publishing..." : "Publish"}
					</Button>
				</form>
			</TabsContent>

			{/* --- Batch Publish --- */}
			<TabsContent value="batch">
				<form onSubmit={handleBatchSubmit} className="space-y-4">
					<div className="flex items-center justify-between">
						<Label>Batch Entries</Label>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addBatchEntry}
							disabled={batchIsPending}
						>
							Add Entry
						</Button>
					</div>

					{batchEntries.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No entries yet. Click "Add Entry" to add a message to the batch.
						</p>
					)}

					{batchEntries.length > 0 && (
						<div className="space-y-3">
							{batchEntries.map((entry) => (
								<div
									key={entry.id}
									className="space-y-2 rounded-md border border-input p-3"
								>
									<div className="flex items-center justify-between">
										<Label className="text-xs text-muted-foreground">
											ID: {entry.id}
										</Label>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => removeBatchEntry(entry.id)}
											disabled={batchIsPending}
											aria-label={`Remove entry ${entry.id}`}
										>
											Remove
										</Button>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">Message *</Label>
										<Textarea
											placeholder="Enter message body..."
											value={entry.message}
											onChange={(e) =>
												updateBatchEntry(entry.id, "message", e.target.value)
											}
											rows={3}
											disabled={batchIsPending}
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">Subject (optional)</Label>
										<Input
											placeholder="Message subject..."
											value={entry.subject}
											onChange={(e) =>
												updateBatchEntry(entry.id, "subject", e.target.value)
											}
											disabled={batchIsPending}
										/>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Batch Results */}
					{batchSuccessResults.length > 0 && (
						<div className="space-y-1">
							<Label className="text-sm text-green-600">
								Successful ({batchSuccessResults.length})
							</Label>
							<div className="space-y-1">
								{batchSuccessResults.map((result) => (
									<div
										key={result.id}
										className="flex items-center gap-2 text-sm"
									>
										<Badge variant="secondary">{result.id}</Badge>
										<span className="text-muted-foreground">
											MessageId: {result.messageId}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{batchFailedResults.length > 0 && (
						<div className="space-y-1">
							<Label className="text-sm text-destructive">
								Failed ({batchFailedResults.length})
							</Label>
							<div className="space-y-1">
								{batchFailedResults.map((result) => (
									<div
										key={result.id}
										className="flex items-center gap-2 text-sm"
									>
										<Badge variant="destructive">{result.id}</Badge>
										<span className="text-muted-foreground">
											{result.code}
											{result.message ? `: ${result.message}` : ""}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{batchError && (
						<p className="text-sm text-destructive">{batchError}</p>
					)}

					{/* Submit */}
					<Button
						type="submit"
						disabled={batchIsPending || batchEntries.length === 0}
					>
						{batchIsPending ? "Publishing..." : "Publish Batch"}
					</Button>
				</form>
			</TabsContent>
		</Tabs>
	);
}
