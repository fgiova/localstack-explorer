import { Play } from "lucide-react";
import { useState } from "react";
import { useInvokeFunction } from "@/api/lambda";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type InvocationType = "RequestResponse" | "Event" | "DryRun";

interface InvokeFunctionFormProps {
	functionName: string;
}

export function InvokeFunctionForm({ functionName }: InvokeFunctionFormProps) {
	const [payload, setPayload] = useState("{}");
	const [invocationType, setInvocationType] =
		useState<InvocationType>("RequestResponse");
	const [logExpanded, setLogExpanded] = useState(false);

	const invokeFunction = useInvokeFunction();

	const handleInvoke = () => {
		invokeFunction.mutate({
			functionName,
			payload,
			invocationType,
		});
	};

	const result = invokeFunction.data;

	let parsedPayload: string | undefined;
	if (result?.payload) {
		try {
			parsedPayload = JSON.stringify(
				JSON.parse(atob(result.payload)),
				null,
				2,
			);
		} catch {
			try {
				parsedPayload = atob(result.payload);
			} catch {
				parsedPayload = result.payload;
			}
		}
	}

	let decodedLog: string | undefined;
	if (result?.logResult) {
		try {
			decodedLog = atob(result.logResult);
		} catch {
			decodedLog = result.logResult;
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<Label htmlFor="invoke-type">Invocation Type</Label>
				<select
					id="invoke-type"
					value={invocationType}
					onChange={(e) => setInvocationType(e.target.value as InvocationType)}
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<option value="RequestResponse">RequestResponse</option>
					<option value="Event">Event</option>
					<option value="DryRun">DryRun</option>
				</select>
			</div>

			<div className="space-y-1">
				<Label htmlFor="invoke-payload">JSON Payload</Label>
				<textarea
					id="invoke-payload"
					value={payload}
					onChange={(e) => setPayload(e.target.value)}
					rows={8}
					className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					placeholder="{}"
				/>
			</div>

			<Button
				onClick={handleInvoke}
				disabled={invokeFunction.isPending}
			>
				{invokeFunction.isPending ? (
					<>
						<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
						Invoking...
					</>
				) : (
					<>
						<Play className="mr-2 h-4 w-4" />
						Invoke
					</>
				)}
			</Button>

			{invokeFunction.isError && (
				<div className="rounded-md border border-destructive p-4 text-destructive">
					Error invoking function: {invokeFunction.error.message}
				</div>
			)}

			{result && (
				<div className="space-y-3 rounded-md border p-4">
					<h4 className="font-semibold">Result</h4>

					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-muted-foreground">
							Status Code:
						</span>
						<span
							className={[
								"rounded px-2 py-0.5 text-sm font-semibold",
								result.statusCode >= 200 && result.statusCode < 300
									? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
									: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
							].join(" ")}
						>
							{result.statusCode}
						</span>
					</div>

					{result.functionError && (
						<div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
							<span className="font-medium">Function Error: </span>
							{result.functionError}
						</div>
					)}

					{parsedPayload !== undefined && (
						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground">
								Payload:
							</span>
							<pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm">
								<code>{parsedPayload}</code>
							</pre>
						</div>
					)}

					{decodedLog && (
						<div className="space-y-1">
							<button
								type="button"
								onClick={() => setLogExpanded((v) => !v)}
								className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
							>
								<span>{logExpanded ? "▾" : "▸"}</span>
								Log Result
							</button>
							{logExpanded && (
								<pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
									{decodedLog}
								</pre>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
