import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteStack, useGetStack } from "@/api/cloudformation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventsTimeline } from "./EventsTimeline";
import { ResourceList } from "./ResourceList";
import { StackUpdateDialog } from "./StackUpdateDialog";
import { TemplateViewer } from "./TemplateViewer";

const statusVariant = (
	status: string,
): "default" | "secondary" | "destructive" | "outline" => {
	if (status.includes("COMPLETE") && !status.includes("ROLLBACK"))
		return "default";
	if (status.includes("IN_PROGRESS")) return "secondary";
	if (status.includes("ROLLBACK") || status.includes("FAILED"))
		return "destructive";
	return "outline";
};

function formatTimestamp(timestamp: string | undefined): string {
	if (!timestamp) return "\u2014";
	const d = new Date(timestamp);
	return Number.isNaN(d.getTime()) ? timestamp : d.toLocaleString();
}

interface StackDetailProps {
	stackName: string;
}

export function StackDetail({ stackName }: StackDetailProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const navigate = useNavigate();

	const { data: stack, isLoading, error } = useGetStack(stackName);
	const deleteStack = useDeleteStack();

	const handleDelete = () => {
		deleteStack.mutate(stackName, {
			onSuccess: () => {
				setDeleteDialogOpen(false);
				navigate({ to: "/cloudformation" });
			},
			onError: () => {
				setDeleteDialogOpen(false);
			},
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="outline" size="icon" asChild>
						<Link to="/cloudformation">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-2xl font-bold">{stackName}</h2>
							{stack?.status && (
								<Badge variant={statusVariant(stack.status)}>
									{stack.status}
								</Badge>
							)}
						</div>
						{stack?.stackId && (
							<p className="mt-0.5 text-sm text-muted-foreground">
								{stack.stackId}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => setUpdateDialogOpen(true)}>
						<Pencil className="mr-2 h-4 w-4" />
						Update Stack
					</Button>
					<Button
						variant="destructive"
						onClick={() => setDeleteDialogOpen(true)}
						disabled={deleteStack.isPending}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete Stack
					</Button>
				</div>
			</div>

			{/* Loading state */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="rounded-md border border-destructive p-4 text-destructive">
					Error loading stack details: {error.message}
				</div>
			)}

			{/* Tabs */}
			{!isLoading && !error && stack && (
				<Tabs defaultValue="overview">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="parameters">Parameters</TabsTrigger>
						<TabsTrigger value="outputs">Outputs</TabsTrigger>
						<TabsTrigger value="resources">Resources</TabsTrigger>
						<TabsTrigger value="events">Events</TabsTrigger>
						<TabsTrigger value="template">Template</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview">
						<Card>
							<CardHeader>
								<CardTitle>Stack Information</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Stack Name
										</span>
										<span className="text-lg font-semibold">
											{stack.stackName}
										</span>
									</div>
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Stack ID
										</span>
										<span className="text-sm font-semibold break-all">
											{stack.stackId ?? "\u2014"}
										</span>
									</div>
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Status
										</span>
										<span className="text-lg font-semibold">
											{stack.status}
										</span>
									</div>
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Description
										</span>
										<span className="text-lg font-semibold">
											{stack.description || "\u2014"}
										</span>
									</div>
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Creation Time
										</span>
										<span className="text-lg font-semibold">
											{formatTimestamp(stack.creationTime)}
										</span>
									</div>
									<div className="flex flex-col gap-1 rounded-lg border p-4">
										<span className="text-xs font-medium text-muted-foreground">
											Last Updated Time
										</span>
										<span className="text-lg font-semibold">
											{formatTimestamp(stack.lastUpdatedTime)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Parameters Tab */}
					<TabsContent value="parameters">
						<Card>
							<CardHeader>
								<CardTitle>Parameters</CardTitle>
							</CardHeader>
							<CardContent>
								{stack.parameters && stack.parameters.length > 0 ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Key</TableHead>
												<TableHead>Value</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{stack.parameters.map((param, idx) => (
												<TableRow key={param.parameterKey ?? idx}>
													<TableCell className="font-medium">
														{param.parameterKey ?? "\u2014"}
													</TableCell>
													<TableCell>
														{param.parameterValue ?? "\u2014"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<p className="text-muted-foreground">No parameters</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Outputs Tab */}
					<TabsContent value="outputs">
						<Card>
							<CardHeader>
								<CardTitle>Outputs</CardTitle>
							</CardHeader>
							<CardContent>
								{stack.outputs && stack.outputs.length > 0 ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Key</TableHead>
												<TableHead>Value</TableHead>
												<TableHead>Description</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{stack.outputs.map((output, idx) => (
												<TableRow key={output.outputKey ?? idx}>
													<TableCell className="font-medium">
														{output.outputKey ?? "\u2014"}
													</TableCell>
													<TableCell>
														{output.outputValue ?? "\u2014"}
													</TableCell>
													<TableCell>
														{output.description ?? "\u2014"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<p className="text-muted-foreground">No outputs</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Resources Tab */}
					<TabsContent value="resources">
						<ResourceList resources={stack.resources} />
					</TabsContent>

					{/* Events Tab */}
					<TabsContent value="events">
						<EventsTimeline stackName={stackName} stackStatus={stack.status} />
					</TabsContent>

					{/* Template Tab */}
					<TabsContent value="template">
						<TemplateViewer stackName={stackName} />
					</TabsContent>
				</Tabs>
			)}

			{/* Update dialog */}
			<StackUpdateDialog
				open={updateDialogOpen}
				onOpenChange={setUpdateDialogOpen}
				stackName={stackName}
			/>

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Stack</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{stackName}</strong>? This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={deleteStack.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteStack.isPending}
						>
							{deleteStack.isPending ? "Deleting..." : "Delete Stack"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
