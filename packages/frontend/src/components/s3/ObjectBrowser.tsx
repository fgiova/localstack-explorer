import {
	ArrowLeft,
	Download,
	FileText,
	Folder,
	Trash2,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { getDownloadUrl, useDeleteObject, useListObjects } from "@/api/s3";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
import { ObjectUploadDialog } from "./ObjectUploadDialog";

function formatBytes(bytes: number | undefined): string {
	if (bytes === undefined || bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

interface ObjectBrowserProps {
	bucketName: string;
}

export function ObjectBrowser({ bucketName }: ObjectBrowserProps) {
	const [prefix, setPrefix] = useState("");
	const [uploadOpen, setUploadOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const { data, isLoading, error } = useListObjects(bucketName, prefix);
	const deleteObject = useDeleteObject(bucketName);

	const pathParts = prefix.split("/").filter(Boolean);

	const navigateToPrefix = (newPrefix: string) => {
		setPrefix(newPrefix);
	};

	const navigateUp = () => {
		const parts = prefix.split("/").filter(Boolean);
		parts.pop();
		setPrefix(parts.length > 0 ? `${parts.join("/")}/` : "");
	};

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
				Error: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">{bucketName}</h2>
					<Breadcrumb className="mt-1">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink
									className="cursor-pointer"
									onClick={() => setPrefix("")}
								>
									root
								</BreadcrumbLink>
							</BreadcrumbItem>
							{pathParts.map((part, index) => (
								<BreadcrumbItem key={pathParts.slice(0, index + 1).join("/")}>
									<BreadcrumbSeparator />
									<BreadcrumbLink
										className="cursor-pointer"
										onClick={() =>
											setPrefix(`${pathParts.slice(0, index + 1).join("/")}/`)
										}
									>
										{part}
									</BreadcrumbLink>
								</BreadcrumbItem>
							))}
						</BreadcrumbList>
					</Breadcrumb>
				</div>
				<div className="flex gap-2">
					{prefix && (
						<Button variant="outline" onClick={navigateUp}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>
					)}
					<Button onClick={() => setUploadOpen(true)}>
						<Upload className="mr-2 h-4 w-4" />
						Upload
					</Button>
				</div>
			</div>

			{data?.commonPrefixes.length === 0 && data?.objects.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					This location is empty. Upload a file to get started.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Size</TableHead>
							<TableHead>Last Modified</TableHead>
							<TableHead className="w-[120px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data?.commonPrefixes.map((cp) => (
							<TableRow
								key={cp.prefix}
								className="cursor-pointer"
								onClick={() => navigateToPrefix(cp.prefix)}
							>
								<TableCell className="flex items-center gap-2 font-medium">
									<Folder className="h-4 w-4 text-yellow-500" />
									{cp.prefix.replace(prefix, "").replace(/\/$/, "")}
								</TableCell>
								<TableCell>{"\u2014"}</TableCell>
								<TableCell>{"\u2014"}</TableCell>
								<TableCell />
							</TableRow>
						))}
						{data?.objects
							.filter((obj) => obj.key !== prefix)
							.map((obj) => (
								<TableRow key={obj.key}>
									<TableCell className="flex items-center gap-2">
										<FileText className="h-4 w-4 text-blue-500" />
										{obj.key.replace(prefix, "")}
									</TableCell>
									<TableCell>{formatBytes(obj.size)}</TableCell>
									<TableCell>
										{obj.lastModified
											? new Date(obj.lastModified).toLocaleString()
											: "\u2014"}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button variant="ghost" size="icon" asChild>
												<a href={getDownloadUrl(bucketName, obj.key)} download>
													<Download className="h-4 w-4" />
												</a>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setDeleteTarget(obj.key)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			)}

			<ObjectUploadDialog
				bucketName={bucketName}
				prefix={prefix}
				open={uploadOpen}
				onOpenChange={setUploadOpen}
			/>

			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Object</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{deleteTarget}&quot;?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteTarget) {
									deleteObject.mutate(deleteTarget, {
										onSettled: () => setDeleteTarget(null),
									});
								}
							}}
							disabled={deleteObject.isPending}
						>
							{deleteObject.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
