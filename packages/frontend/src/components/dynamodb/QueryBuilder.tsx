import { Play } from "lucide-react";
import { useState } from "react";
import {
	type ItemsResponse,
	type QueryOptions,
	useDescribeTable,
	useQueryItems,
	useScanItems,
} from "@/api/dynamodb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface QueryBuilderProps {
	tableName: string;
}

interface FilterRow {
	attribute: string;
	operator: string;
	value: string;
}

export function QueryBuilder({ tableName }: QueryBuilderProps) {
	const { data: tableDetail } = useDescribeTable(tableName);
	const queryItems = useQueryItems(tableName);
	const scanItems = useScanItems(tableName);

	// Index selection
	const [selectedIndex, setSelectedIndex] = useState<string>("__table__");

	// Key conditions
	const [pkValue, setPkValue] = useState("");
	const [skOperator, setSkOperator] = useState("=");
	const [skValue, setSkValue] = useState("");
	const [skValue2, setSkValue2] = useState(""); // for BETWEEN

	// Filters
	const [filters, setFilters] = useState<FilterRow[]>([]);

	// Options
	const [limit, setLimit] = useState("25");
	const [scanForward, setScanForward] = useState(true);

	// Results
	const [results, setResults] = useState<ItemsResponse | null>(null);

	// Get current key schema based on selected index
	const getKeySchema = () => {
		if (!tableDetail) return { pk: null, sk: null };

		if (selectedIndex === "__table__") {
			const pk = tableDetail.keySchema.find((k) => k.keyType === "HASH");
			const sk = tableDetail.keySchema.find((k) => k.keyType === "RANGE");
			return { pk: pk ?? null, sk: sk ?? null };
		}

		const gsi = tableDetail.globalSecondaryIndexes?.find(
			(g) => g.indexName === selectedIndex,
		);
		if (!gsi) return { pk: null, sk: null };
		const pk = gsi.keySchema.find((k) => k.keyType === "HASH");
		const sk = gsi.keySchema.find((k) => k.keyType === "RANGE");
		return { pk: pk ?? null, sk: sk ?? null };
	};

	const { pk, sk } = getKeySchema();

	const addFilter = () => {
		setFilters([...filters, { attribute: "", operator: "=", value: "" }]);
	};

	const removeFilter = (index: number) => {
		setFilters(filters.filter((_, i) => i !== index));
	};

	const updateFilter = (
		index: number,
		field: keyof FilterRow,
		value: string,
	) => {
		const updated = [...filters];
		updated[index] = { ...updated[index], [field]: value };
		setFilters(updated);
	};

	const parseValue = (val: string): unknown => {
		const num = Number(val);
		if (!Number.isNaN(num) && val.trim() !== "") return num;
		if (val === "true") return true;
		if (val === "false") return false;
		return val;
	};

	const handleExecute = () => {
		if (!pk) return;

		// If no partition key value, do a scan instead
		if (!pkValue.trim()) {
			const scanOpts: Record<string, unknown> = {};
			if (parseInt(limit, 10)) scanOpts.limit = parseInt(limit, 10);
			if (selectedIndex !== "__table__") scanOpts.indexName = selectedIndex;

			scanItems.mutate(scanOpts as Parameters<typeof scanItems.mutate>[0], {
				onSuccess: (data) => setResults(data),
			});
			return;
		}

		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, unknown> = {};

		// Key condition
		expressionAttributeNames[`#${pk.attributeName}`] = pk.attributeName;
		expressionAttributeValues[":pkVal"] = parseValue(pkValue);

		let keyCondition = `#${pk.attributeName} = :pkVal`;

		if (sk && skValue.trim()) {
			expressionAttributeNames[`#${sk.attributeName}`] = sk.attributeName;
			expressionAttributeValues[":skVal"] = parseValue(skValue);

			if (skOperator === "BETWEEN") {
				expressionAttributeValues[":skVal2"] = parseValue(skValue2);
				keyCondition += ` AND #${sk.attributeName} BETWEEN :skVal AND :skVal2`;
			} else if (skOperator === "begins_with") {
				keyCondition += ` AND begins_with(#${sk.attributeName}, :skVal)`;
			} else {
				keyCondition += ` AND #${sk.attributeName} ${skOperator} :skVal`;
			}
		}

		// Filter expression
		let filterExpression: string | undefined;
		if (filters.length > 0) {
			const parts: string[] = [];
			filters.forEach((f, i) => {
				if (!f.attribute || !f.value) return;
				const nameKey = `#f${i}`;
				const valKey = `:f${i}`;
				expressionAttributeNames[nameKey] = f.attribute;
				expressionAttributeValues[valKey] = parseValue(f.value);

				if (f.operator === "attribute_exists") {
					parts.push(`attribute_exists(${nameKey})`);
				} else if (f.operator === "attribute_not_exists") {
					parts.push(`attribute_not_exists(${nameKey})`);
				} else if (f.operator === "contains") {
					parts.push(`contains(${nameKey}, ${valKey})`);
				} else if (f.operator === "begins_with") {
					parts.push(`begins_with(${nameKey}, ${valKey})`);
				} else {
					parts.push(`${nameKey} ${f.operator} ${valKey}`);
				}
			});
			if (parts.length > 0) {
				filterExpression = parts.join(" AND ");
			}
		}

		const options: QueryOptions = {
			keyConditionExpression: keyCondition,
			expressionAttributeNames,
			expressionAttributeValues,
			scanIndexForward: scanForward,
		};

		if (parseInt(limit, 10)) options.limit = parseInt(limit, 10);
		if (filterExpression) options.filterExpression = filterExpression;
		if (selectedIndex !== "__table__") options.indexName = selectedIndex;

		queryItems.mutate(options, {
			onSuccess: (data) => setResults(data),
		});
	};

	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) return "\u2014";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	// Get result columns
	const resultColumns = results?.items.length
		? Array.from(new Set(results.items.flatMap((item) => Object.keys(item))))
		: [];

	const indexes = [
		{ value: "__table__", label: "Table (Primary Key)" },
		...(tableDetail?.globalSecondaryIndexes?.map((g) => ({
			value: g.indexName,
			label: `GSI: ${g.indexName}`,
		})) ?? []),
	];

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Query Builder</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Index selector */}
					<div className="space-y-2">
						<Label>Index</Label>
						<Select
							value={selectedIndex}
							onChange={(e) => {
								setSelectedIndex(e.target.value);
								setPkValue("");
								setSkValue("");
							}}
						>
							{indexes.map((idx) => (
								<option key={idx.value} value={idx.value}>
									{idx.label}
								</option>
							))}
						</Select>
					</div>

					{/* Key conditions */}
					{pk && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>{pk.attributeName} (Partition Key)</Label>
								<Input
									placeholder={`Enter ${pk.attributeName} value`}
									value={pkValue}
									onChange={(e) => setPkValue(e.target.value)}
								/>
							</div>
							{sk && (
								<div className="space-y-2">
									<Label>{sk.attributeName} (Sort Key)</Label>
									<div className="flex gap-2">
										<Select
											value={skOperator}
											onChange={(e) => setSkOperator(e.target.value)}
										>
											<option value="=">=</option>
											<option value="<">&lt;</option>
											<option value=">">&gt;</option>
											<option value="<=">&lt;=</option>
											<option value=">=">&gt;=</option>
											<option value="BETWEEN">BETWEEN</option>
											<option value="begins_with">begins_with</option>
										</Select>
										<Input
											placeholder="value"
											value={skValue}
											onChange={(e) => setSkValue(e.target.value)}
										/>
										{skOperator === "BETWEEN" && (
											<Input
												placeholder="value 2"
												value={skValue2}
												onChange={(e) => setSkValue2(e.target.value)}
											/>
										)}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Filter expressions */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Filters</Label>
							<Button variant="outline" size="sm" onClick={addFilter}>
								Add Filter
							</Button>
						</div>
						{filters.map((filter, idx) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: dynamic DynamoDB items have no stable unique key
							<div key={idx} className="flex items-center gap-2">
								<Input
									placeholder="attribute"
									value={filter.attribute}
									onChange={(e) =>
										updateFilter(idx, "attribute", e.target.value)
									}
									className="flex-1"
								/>
								<Select
									value={filter.operator}
									onChange={(e) =>
										updateFilter(idx, "operator", e.target.value)
									}
									className="w-[140px]"
								>
									<option value="=">=</option>
									<option value="<>">!=</option>
									<option value="<">&lt;</option>
									<option value=">">&gt;</option>
									<option value="contains">contains</option>
									<option value="begins_with">begins_with</option>
									<option value="attribute_exists">exists</option>
									<option value="attribute_not_exists">not exists</option>
								</Select>
								<Input
									placeholder="value"
									value={filter.value}
									onChange={(e) => updateFilter(idx, "value", e.target.value)}
									className="flex-1"
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeFilter(idx)}
								>
									Remove
								</Button>
							</div>
						))}
					</div>

					{/* Options */}
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Label htmlFor="queryLimit">Limit</Label>
							<Input
								id="queryLimit"
								type="number"
								min="1"
								max="1000"
								value={limit}
								onChange={(e) => setLimit(e.target.value)}
								className="w-[80px]"
							/>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="scanForward"
								checked={scanForward}
								onChange={(e) => setScanForward(e.target.checked)}
								className="h-4 w-4"
							/>
							<Label htmlFor="scanForward">Ascending</Label>
						</div>
					</div>

					{/* Execute button */}
					<Button
						onClick={handleExecute}
						disabled={queryItems.isPending || scanItems.isPending}
					>
						<Play className="mr-2 h-4 w-4" />
						{queryItems.isPending || scanItems.isPending
							? "Running..."
							: pkValue.trim()
								? "Run Query"
								: "Run Scan"}
					</Button>

					{(queryItems.isError || scanItems.isError) && (
						<p className="text-sm text-destructive">
							{queryItems.error?.message || scanItems.error?.message}
						</p>
					)}
				</CardContent>
			</Card>

			{/* Results */}
			{results && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Results
							<Badge variant="secondary">{results.count} items</Badge>
							{results.scannedCount > results.count && (
								<Badge variant="outline">{results.scannedCount} scanned</Badge>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{results.items.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground">
								No results found.
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											{resultColumns.map((col) => (
												<TableHead key={col}>{col}</TableHead>
											))}
										</TableRow>
									</TableHeader>
									<TableBody>
										{results.items.map((item, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: dynamic DynamoDB items have no stable unique key
											<TableRow key={idx}>
												{resultColumns.map((col) => (
													<TableCell
														key={col}
														className="max-w-[300px] truncate font-mono text-sm"
													>
														{formatCellValue(item[col])}
													</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
