import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useConfigStore } from "@/stores/config";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";

export function EndpointModal() {
	const endpointModalOpen = useConfigStore((s) => s.endpointModalOpen);
	const currentEndpoint = useConfigStore((s) => s.endpoint);
	const setEndpointModalOpen = useConfigStore((s) => s.setEndpointModalOpen);
	const setEndpoint = useConfigStore((s) => s.setEndpoint);
	const dismissModal = useConfigStore((s) => s.dismissModal);

	const [candidateEndpoint, setCandidateEndpoint] = useState(currentEndpoint);
	const [status, setStatus] = useState<ConnectionStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const queryClient = useQueryClient();

	function handleOpenChange(open: boolean) {
		if (!open) {
			dismissModal();
		} else {
			setEndpointModalOpen(true);
		}
	}

	function handleEndpointChange(e: React.ChangeEvent<HTMLInputElement>) {
		setCandidateEndpoint(e.target.value);
		// Reset test status whenever the URL changes
		setStatus("idle");
		setErrorMessage("");
	}

	async function handleTestConnection() {
		setStatus("testing");
		setErrorMessage("");
		try {
			const res = await fetch("/api/health", {
				headers: {
					"x-localstack-endpoint": candidateEndpoint,
					"x-localstack-region": useConfigStore.getState().region,
				},
			});
			const data = await res.json();
			if (data.connected) {
				setStatus("connected");
			} else {
				setStatus("failed");
				setErrorMessage(data.error ?? "Connection failed");
			}
		} catch (err) {
			setStatus("failed");
			setErrorMessage(err instanceof Error ? err.message : "Connection failed");
		}
	}

	function handleSave() {
		setEndpoint(candidateEndpoint);
		queryClient.invalidateQueries();
		setEndpointModalOpen(false);
	}

	function handleCancel() {
		dismissModal();
	}

	// Re-sync candidate endpoint when modal opens or server defaults arrive
	useEffect(() => {
		if (endpointModalOpen) {
			setCandidateEndpoint(currentEndpoint);
			setStatus("idle");
			setErrorMessage("");
		}
	}, [endpointModalOpen, currentEndpoint]);

	return (
		<Dialog open={endpointModalOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>LocalStack Endpoint</DialogTitle>
					<DialogDescription>
						Enter the URL of your LocalStack instance and test the connection
						before saving.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder="http://localhost:4566"
							value={candidateEndpoint}
							onChange={handleEndpointChange}
							autoFocus
							className="flex-1"
						/>
						<Button
							type="button"
							variant="outline"
							onClick={handleTestConnection}
							disabled={status === "testing" || !candidateEndpoint.trim()}
						>
							{status === "testing" ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Testing...
								</>
							) : (
								"Test Connection"
							)}
						</Button>
					</div>

					{status === "connected" && (
						<div className="flex items-center gap-2 text-sm text-green-600">
							<CheckCircle2 className="h-4 w-4 shrink-0" />
							<span>Connected successfully</span>
						</div>
					)}

					{status === "failed" && (
						<div className="flex items-start gap-2 text-sm text-destructive">
							<XCircle className="h-4 w-4 shrink-0 mt-0.5" />
							<span>{errorMessage || "Connection failed"}</span>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={status !== "connected"}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
