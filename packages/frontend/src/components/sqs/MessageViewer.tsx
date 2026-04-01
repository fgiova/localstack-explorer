import { Play, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { receiveMessagesPoll, useDeleteMessage } from "@/api/sqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface MessageAttribute {
	dataType: string;
	stringValue?: string;
	binaryValue?: string;
}

interface Message {
	messageId: string;
	receiptHandle: string;
	body: string;
	attributes?: Record<string, string>;
	messageAttributes?: Record<string, MessageAttribute>;
	md5OfBody?: string;
}

interface MessageViewerProps {
	queueName: string;
}

function formatBody(body: string): { isJson: boolean; content: string } {
	try {
		const parsed = JSON.parse(body);
		return { isJson: true, content: JSON.stringify(parsed, null, 2) };
	} catch {
		return { isJson: false, content: body };
	}
}

export function MessageViewer({ queueName }: MessageViewerProps) {
	const [continuousMode, setContinuousMode] = useState(false);
	const [maxMessages, setMaxMessages] = useState("1");
	const [waitTimeSeconds, setWaitTimeSeconds] = useState("20");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isPolling, setIsPolling] = useState(false);
	const [pollError, setPollError] = useState<string | null>(null);
	const [hasPolled, setHasPolled] = useState(false);
	const pollingRef = useRef(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const deleteMessage = useDeleteMessage(queueName);

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			pollingRef.current = false;
			abortControllerRef.current?.abort();
		};
	}, []);

	const handleSinglePoll = async () => {
		setIsPolling(true);
		setPollError(null);
		setHasPolled(true);
		const controller = new AbortController();
		abortControllerRef.current = controller;
		try {
			const result = await receiveMessagesPoll(
				queueName,
				parseInt(maxMessages, 10),
				parseInt(waitTimeSeconds, 10),
				controller.signal,
			);
			setMessages(result.messages);
		} catch (e) {
			if (e instanceof DOMException && e.name === "AbortError") return;
			setPollError(
				e instanceof Error ? e.message : "Failed to receive messages",
			);
		} finally {
			setIsPolling(false);
			abortControllerRef.current = null;
		}
	};

	const startPolling = async () => {
		pollingRef.current = true;
		setIsPolling(true);
		setPollError(null);
		setHasPolled(true);
		while (pollingRef.current) {
			const controller = new AbortController();
			abortControllerRef.current = controller;
			try {
				const result = await receiveMessagesPoll(
					queueName,
					parseInt(maxMessages, 10),
					parseInt(waitTimeSeconds, 10),
					controller.signal,
				);
				if (!pollingRef.current) break;
				if (result.messages.length > 0) {
					setMessages((prev) => {
						const existingIds = new Set(prev.map((m) => m.messageId));
						const newMessages = result.messages.filter(
							(m) => !existingIds.has(m.messageId),
						);
						return newMessages.length > 0 ? [...prev, ...newMessages] : prev;
					});
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === "AbortError") break;
				if (!pollingRef.current) break;
				setPollError(
					e instanceof Error ? e.message : "Failed to receive messages",
				);
				break;
			}
		}
		abortControllerRef.current = null;
		setIsPolling(false);
	};

	const stopPolling = () => {
		pollingRef.current = false;
		abortControllerRef.current?.abort();
	};

	function handleDelete(receiptHandle: string) {
		deleteMessage.mutate(
			{ receiptHandle },
			{
				onSuccess: () => {
					setMessages((prev) =>
						prev.filter((m) => m.receiptHandle !== receiptHandle),
					);
				},
			},
		);
	}

	const clearMessages = () => {
		setMessages([]);
	};

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					<Switch
						id="continuous-mode"
						checked={continuousMode}
						onCheckedChange={(checked: boolean) => {
							if (isPolling) stopPolling();
							setContinuousMode(checked);
						}}
						disabled={isPolling}
					/>
					<Label htmlFor="continuous-mode" className="text-sm">
						{continuousMode ? "Continuous" : "Single Poll"}
					</Label>
				</div>

				<div className="flex items-center gap-2">
					<Label className="text-sm whitespace-nowrap">Max Messages</Label>
					<Select
						value={maxMessages}
						onChange={(e) => setMaxMessages(e.target.value)}
						disabled={isPolling}
						className="w-[70px]"
					>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
							<option key={n} value={String(n)}>
								{n}
							</option>
						))}
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<Label className="text-sm whitespace-nowrap">Wait (s)</Label>
					<Select
						value={waitTimeSeconds}
						onChange={(e) => setWaitTimeSeconds(e.target.value)}
						disabled={isPolling}
						className="w-[70px]"
					>
						{[1, 2, 5, 10, 15, 20].map((s) => (
							<option key={s} value={String(s)}>
								{s}
							</option>
						))}
					</Select>
				</div>
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-3">
				{continuousMode ? (
					<Button
						onClick={isPolling ? stopPolling : startPolling}
						variant={isPolling ? "destructive" : "default"}
					>
						{isPolling ? (
							<>
								<Square className="mr-2 h-4 w-4" />
								Stop
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								Start
							</>
						)}
					</Button>
				) : isPolling ? (
					<Button onClick={stopPolling} variant="destructive">
						<Square className="mr-2 h-4 w-4" />
						Stop
					</Button>
				) : (
					<Button onClick={handleSinglePoll}>
						<Play className="mr-2 h-4 w-4" />
						Poll
					</Button>
				)}
				{messages.length > 0 && (
					<Button
						variant="outline"
						onClick={clearMessages}
						disabled={isPolling}
					>
						Clear
					</Button>
				)}
				<Badge variant="secondary" className="ml-auto">
					{messages.length} message{messages.length !== 1 ? "s" : ""}
				</Badge>
				{isPolling && (
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
			</div>

			{pollError && (
				<div className="rounded-md border border-destructive p-3 text-sm text-destructive">
					{pollError}
				</div>
			)}

			{/* Empty state */}
			{hasPolled && !isPolling && messages.length === 0 && !pollError && (
				<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
					The queue is empty or no messages are currently visible.
				</div>
			)}

			{/* Messages */}
			{messages.map((message) => {
				const { isJson, content } = formatBody(message.body);
				const hasAttributes =
					message.messageAttributes &&
					Object.keys(message.messageAttributes).length > 0;

				return (
					<Card key={message.messageId}>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-mono text-muted-foreground break-all">
								ID: {message.messageId}
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-4">
							{/* Body */}
							<div>
								<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Body
								</p>
								{isJson ? (
									<pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm font-mono whitespace-pre-wrap break-all">
										{content}
									</pre>
								) : (
									<p className="text-sm break-all">{content}</p>
								)}
							</div>

							{/* Message Attributes */}
							{hasAttributes && (
								<div>
									<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Message Attributes
									</p>
									<div className="space-y-1">
										{Object.entries(message.messageAttributes ?? {}).map(
											([key, attr]) => (
												<div
													key={key}
													className="flex flex-wrap items-center gap-2 text-sm"
												>
													<span className="font-medium">{key}:</span>
													<span className="break-all">
														{attr.stringValue ?? attr.binaryValue ?? ""}
													</span>
													<Badge variant="secondary" className="text-xs">
														{attr.dataType}
													</Badge>
												</div>
											),
										)}
									</div>
								</div>
							)}
						</CardContent>

						<CardFooter className="pt-0">
							<Button
								variant="destructive"
								size="sm"
								disabled={deleteMessage.isPending}
								onClick={() => handleDelete(message.receiptHandle)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								{deleteMessage.isPending ? "Deleting..." : "Delete"}
							</Button>
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}
