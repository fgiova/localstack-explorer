import { Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	useDeleteFunction,
	useGetFunction,
	useListAliases,
	useListVersions,
} from "@/api/lambda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { InvokeFunctionForm } from "./InvokeFunctionForm";

type TabId = "configuration" | "invoke" | "versions" | "aliases";

interface AttributeItemProps {
	label: string;
	value: string | number | undefined;
}

function AttributeItem({ label, value }: AttributeItemProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border p-4">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<span className="text-lg font-semibold">
				{value !== undefined && value !== "" ? String(value) : "—"}
			</span>
		</div>
	);
}

interface FunctionDetailProps {
	functionName: string;
}

function VersionsTab({ functionName }: { functionName: string }) {
	const { data, isLoading, error } = useListVersions(functionName);

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
				Error loading versions: {error.message}
			</div>
		);
	}

	const versions = data?.versions ?? [];

	if (versions.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				No versions found.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Version</TableHead>
					<TableHead>ARN</TableHead>
					<TableHead>Runtime</TableHead>
					<TableHead>Last Modified</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{versions.map((v) => (
					<TableRow key={v.functionArn}>
						<TableCell className="font-medium">{v.version}</TableCell>
						<TableCell className="font-mono text-sm text-muted-foreground">
							{v.functionArn}
						</TableCell>
						<TableCell>{v.runtime}</TableCell>
						<TableCell className="text-sm text-muted-foreground">
							{v.lastModified
								? new Date(v.lastModified).toLocaleString()
								: "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function AliasesTab({ functionName }: { functionName: string }) {
	const { data, isLoading, error } = useListAliases(functionName);

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
				Error loading aliases: {error.message}
			</div>
		);
	}

	const aliases = data?.aliases ?? [];

	if (aliases.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				No aliases found.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>ARN</TableHead>
					<TableHead>Function Version</TableHead>
					<TableHead>Description</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{aliases.map((a) => (
					<TableRow key={a.aliasArn}>
						<TableCell className="font-medium">{a.name}</TableCell>
						<TableCell className="font-mono text-sm text-muted-foreground">
							{a.aliasArn}
						</TableCell>
						<TableCell>{a.functionVersion}</TableCell>
						<TableCell className="text-sm text-muted-foreground">
							{a.description || "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export function FunctionDetail({ functionName }: FunctionDetailProps) {
	const [activeTab, setActiveTab] = useState<TabId>("configuration");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { data: fn, isLoading, error } = useGetFunction(functionName);
	const deleteFunction = useDeleteFunction();

	const handleDelete = () => {
		deleteFunction.mutate(functionName, {
			onSettled: () => setDeleteDialogOpen(false),
		});
	};

	const tabs: { id: TabId; label: string }[] = [
		{ id: "configuration", label: "Configuration" },
		{ id: "invoke", label: "Invoke" },
		{ id: "versions", label: "Versions" },
		{ id: "aliases", label: "Aliases" },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="outline" size="icon" asChild>
						<Link to="/lambda">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h2 className="text-2xl font-bold">{functionName}</h2>
						{fn?.functionArn && (
							<p className="mt-0.5 text-sm text-muted-foreground">
								{fn.functionArn}
							</p>
						)}
					</div>
				</div>
				<Button
					variant="destructive"
					onClick={() => setDeleteDialogOpen(true)}
					disabled={deleteFunction.isPending}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Delete Function
				</Button>
			</div>

			{/* Loading / Error states */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)}

			{error && (
				<div className="rounded-md border border-destructive p-4 text-destructive">
					Error loading function: {error.message}
				</div>
			)}

			{/* Tabs */}
			{!isLoading && !error && (
				<>
					{/* Tab bar */}
					<div className="border-b">
						<nav className="-mb-px flex gap-6">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={[
										"border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
										activeTab === tab.id
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground",
									].join(" ")}
								>
									{tab.label}
									{tab.id === "configuration" && fn?.state && (
										<Badge variant="secondary" className="ml-2">
											{fn.state}
										</Badge>
									)}
								</button>
							))}
						</nav>
					</div>

					{/* Tab: Configuration */}
					{activeTab === "configuration" && (
						<Card>
							<CardHeader>
								<CardTitle>Function Configuration</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
									<AttributeItem label="Runtime" value={fn?.runtime} />
									<AttributeItem label="Handler" value={fn?.handler} />
									<AttributeItem label="Role" value={fn?.role} />
									<AttributeItem
										label="Memory"
										value={
											fn?.memorySize !== undefined
												? `${fn.memorySize} MB`
												: undefined
										}
									/>
									<AttributeItem
										label="Timeout"
										value={
											fn?.timeout !== undefined
												? `${fn.timeout}s`
												: undefined
										}
									/>
									<AttributeItem
										label="Code Size"
										value={
											fn?.codeSize !== undefined
												? fn.codeSize < 1024
													? `${fn.codeSize} B`
													: `${(fn.codeSize / 1024).toFixed(1)} KB`
												: undefined
										}
									/>
									<AttributeItem label="State" value={fn?.state} />
									<AttributeItem
										label="Package Type"
										value={fn?.packageType}
									/>
									<AttributeItem
										label="Architectures"
										value={fn?.architectures?.join(", ")}
									/>
									<AttributeItem
										label="SHA256"
										value={fn?.codeSha256}
									/>
								</div>

								{fn?.environment?.variables &&
									Object.keys(fn.environment.variables).length > 0 && (
										<div className="space-y-2">
											<h4 className="text-sm font-medium">
												Environment Variables
											</h4>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Key</TableHead>
														<TableHead>Value</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{Object.entries(fn.environment.variables).map(
														([key, value]) => (
															<TableRow key={key}>
																<TableCell className="font-mono text-sm font-medium">
																	{key}
																</TableCell>
																<TableCell className="font-mono text-sm text-muted-foreground">
																	{value}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										</div>
									)}
							</CardContent>
						</Card>
					)}

					{/* Tab: Invoke */}
					{activeTab === "invoke" && (
						<Card>
							<CardHeader>
								<CardTitle>Invoke Function</CardTitle>
							</CardHeader>
							<CardContent>
								<InvokeFunctionForm functionName={functionName} />
							</CardContent>
						</Card>
					)}

					{/* Tab: Versions */}
					{activeTab === "versions" && (
						<Card>
							<CardHeader>
								<CardTitle>Versions</CardTitle>
							</CardHeader>
							<CardContent>
								<VersionsTab functionName={functionName} />
							</CardContent>
						</Card>
					)}

					{/* Tab: Aliases */}
					{activeTab === "aliases" && (
						<Card>
							<CardHeader>
								<CardTitle>Aliases</CardTitle>
							</CardHeader>
							<CardContent>
								<AliasesTab functionName={functionName} />
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Function</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete function{" "}
							<strong>{functionName}</strong>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={deleteFunction.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteFunction.isPending}
						>
							{deleteFunction.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
