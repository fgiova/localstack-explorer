import { useRef, useState } from "react";
import { useCreateFunction } from "@/api/lambda";
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

const RUNTIMES = [
	"nodejs20.x",
	"nodejs18.x",
	"python3.12",
	"python3.11",
	"java21",
	"java17",
] as const;

interface FunctionCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FunctionCreateDialog({
	open,
	onOpenChange,
}: FunctionCreateDialogProps) {
	const [functionName, setFunctionName] = useState("");
	const [runtime, setRuntime] = useState<string>("nodejs20.x");
	const [handler, setHandler] = useState("");
	const [role, setRole] = useState("");
	const [memorySize, setMemorySize] = useState(128);
	const [timeout, setTimeout] = useState(30);
	const [zipFile, setZipFile] = useState<string | null>(null);
	const [zipFileName, setZipFileName] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const createFunction = useCreateFunction();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setZipFileName(file.name);
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Strip data URL prefix to get raw base64
			const base64 = result.split(",")[1];
			setZipFile(base64 ?? null);
		};
		reader.readAsDataURL(file);
	};

	const resetForm = () => {
		setFunctionName("");
		setRuntime("nodejs20.x");
		setHandler("");
		setRole("");
		setMemorySize(128);
		setTimeout(30);
		setZipFile(null);
		setZipFileName("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!functionName.trim() || !handler.trim() || !role.trim() || !zipFile)
			return;
		createFunction.mutate(
			{
				functionName: functionName.trim(),
				runtime,
				handler: handler.trim(),
				role: role.trim(),
				memorySize,
				timeout,
				zipFile,
			},
			{
				onSuccess: () => {
					resetForm();
					onOpenChange(false);
				},
			},
		);
	};

	const isValid =
		functionName.trim() !== "" &&
		handler.trim() !== "" &&
		role.trim() !== "" &&
		zipFile !== null;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) resetForm();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Lambda Function</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new Lambda function.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-1">
							<Label htmlFor="fn-name">Function Name</Label>
							<Input
								id="fn-name"
								placeholder="my-function"
								value={functionName}
								onChange={(e) => setFunctionName(e.target.value)}
								autoFocus
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="fn-runtime">Runtime</Label>
							<select
								id="fn-runtime"
								value={runtime}
								onChange={(e) => setRuntime(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								{RUNTIMES.map((rt) => (
									<option key={rt} value={rt}>
										{rt}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1">
							<Label htmlFor="fn-handler">Handler</Label>
							<Input
								id="fn-handler"
								placeholder="index.handler"
								value={handler}
								onChange={(e) => setHandler(e.target.value)}
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="fn-role">Role ARN</Label>
							<Input
								id="fn-role"
								placeholder="arn:aws:iam::000000000000:role/my-role"
								value={role}
								onChange={(e) => setRole(e.target.value)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label htmlFor="fn-memory">Memory (MB)</Label>
								<Input
									id="fn-memory"
									type="number"
									min={128}
									max={10240}
									step={64}
									value={memorySize}
									onChange={(e) => setMemorySize(Number(e.target.value))}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="fn-timeout">Timeout (s)</Label>
								<Input
									id="fn-timeout"
									type="number"
									min={1}
									max={900}
									value={timeout}
									onChange={(e) => setTimeout(Number(e.target.value))}
								/>
							</div>
						</div>

						<div className="space-y-1">
							<Label htmlFor="fn-zip">Zip File</Label>
							<div className="flex items-center gap-2">
								<input
									ref={fileInputRef}
									id="fn-zip"
									type="file"
									accept=".zip"
									className="hidden"
									onChange={handleFileChange}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
								>
									Choose File
								</Button>
								<span className="text-sm text-muted-foreground">
									{zipFileName || "No file selected"}
								</span>
							</div>
						</div>

						{createFunction.isError && (
							<p className="text-sm text-destructive">
								{createFunction.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								resetForm();
								onOpenChange(false);
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!isValid || createFunction.isPending}
						>
							{createFunction.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
