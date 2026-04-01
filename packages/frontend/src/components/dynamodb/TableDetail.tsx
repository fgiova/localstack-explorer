import { useDescribeTable } from "@/api/dynamodb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface AttributeItemProps {
	label: string;
	value: string | number | undefined;
}

function AttributeItem({ label, value }: AttributeItemProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border p-4">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<span className="text-lg font-semibold">
				{value !== undefined && value !== "" ? String(value) : "\u2014"}
			</span>
		</div>
	);
}

function formatBytes(bytes: number | undefined): string {
	if (bytes === undefined) return "\u2014";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TableDetailProps {
	tableName: string;
}

export function TableDetail({ tableName }: TableDetailProps) {
	const { data: table, isLoading, error } = useDescribeTable(tableName);

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
				Error loading table: {error.message}
			</div>
		);
	}

	if (!table) return null;

	return (
		<div className="space-y-6">
			{/* Table Overview */}
			<Card>
				<CardHeader>
					<CardTitle>Table Overview</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						<AttributeItem label="Status" value={table.tableStatus} />
						<AttributeItem label="Item Count" value={table.itemCount} />
						<AttributeItem
							label="Table Size"
							value={formatBytes(table.tableSizeBytes)}
						/>
						<AttributeItem
							label="Created"
							value={
								table.creationDateTime
									? new Date(table.creationDateTime).toLocaleString()
									: undefined
							}
						/>
						<AttributeItem
							label="Read Capacity"
							value={table.provisionedThroughput?.readCapacityUnits}
						/>
						<AttributeItem
							label="Write Capacity"
							value={table.provisionedThroughput?.writeCapacityUnits}
						/>
						<AttributeItem
							label="Stream"
							value={
								table.streamSpecification?.streamEnabled
									? (table.streamSpecification.streamViewType ?? "Enabled")
									: "Disabled"
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Key Schema */}
			<Card>
				<CardHeader>
					<CardTitle>Key Schema</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Attribute</TableHead>
								<TableHead>Key Type</TableHead>
								<TableHead>Data Type</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{table.keySchema.map((ks) => {
								const attrDef = table.attributeDefinitions.find(
									(ad) => ad.attributeName === ks.attributeName,
								);
								return (
									<TableRow key={ks.attributeName}>
										<TableCell className="font-medium">
											{ks.attributeName}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													ks.keyType === "HASH" ? "default" : "secondary"
												}
											>
												{ks.keyType === "HASH" ? "Partition Key" : "Sort Key"}
											</Badge>
										</TableCell>
										<TableCell>{attrDef?.attributeType ?? "\u2014"}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* ARN */}
			{table.tableArn && (
				<Card>
					<CardHeader>
						<CardTitle>ARN</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm font-mono text-muted-foreground break-all">
							{table.tableArn}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
