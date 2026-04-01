import { History, Play, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useExecutePartiQL } from "@/api/dynamodb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface PartiQLEditorProps {
	tableName: string;
}

interface HistoryEntry {
	statement: string;
	timestamp: Date;
	success: boolean;
	itemCount?: number;
}

const EXAMPLES = [
	{ label: "Select all", template: (t: string) => `SELECT * FROM "${t}"` },
	{
		label: "Select with condition",
		template: (t: string) => `SELECT * FROM "${t}" WHERE pk = 'value'`,
	},
	{
		label: "Insert",
		template: (t: string) =>
			`INSERT INTO "${t}" VALUE {'pk': 'id1', 'data': 'example'}`,
	},
	{
		label: "Update",
		template: (t: string) => `UPDATE "${t}" SET data='updated' WHERE pk='id1'`,
	},
	{
		label: "Delete",
		template: (t: string) => `DELETE FROM "${t}" WHERE pk='id1'`,
	},
];

export function PartiQLEditor({ tableName }: PartiQLEditorProps) {
	const [statement, setStatement] = useState(`SELECT * FROM "${tableName}"`);
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [results, setResults] = useState<Record<string, unknown>[] | null>(
		null,
	);

	const executePartiQL = useExecutePartiQL();

	const handleExecute = useCallback(() => {
		if (!statement.trim()) return;

		executePartiQL.mutate(
			{ statement: statement.trim() },
			{
				onSuccess: (data) => {
					setResults(data.items);
					setHistory((prev) => [
						{
							statement: statement.trim(),
							timestamp: new Date(),
							success: true,
							itemCount: data.items.length,
						},
						...prev.slice(0, 9),
					]);
				},
				onError: () => {
					setHistory((prev) => [
						{
							statement: statement.trim(),
							timestamp: new Date(),
							success: false,
						},
						...prev.slice(0, 9),
					]);
				},
			},
		);
	}, [statement, executePartiQL]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleExecute();
		}
	};

	const loadExample = (template: (t: string) => string) => {
		setStatement(template(tableName));
	};

	const loadFromHistory = (entry: HistoryEntry) => {
		setStatement(entry.statement);
		setShowHistory(false);
	};

	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) return "\u2014";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	const resultColumns = results?.length
		? Array.from(new Set(results.flatMap((item) => Object.keys(item))))
		: [];

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						PartiQL Editor
						<div className="flex gap-2">
							{EXAMPLES.map((ex) => (
								<Button
									key={ex.label}
									variant="outline"
									size="sm"
									onClick={() => loadExample(ex.template)}
								>
									{ex.label}
								</Button>
							))}
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="partiql">Statement</Label>
						<textarea
							id="partiql"
							value={statement}
							onChange={(e) => setStatement(e.target.value)}
							onKeyDown={handleKeyDown}
							className="h-[120px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							placeholder={`SELECT * FROM "${tableName}"`}
							spellCheck={false}
						/>
						<p className="text-xs text-muted-foreground">
							Press Cmd+Enter (Ctrl+Enter) to execute
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Button
							onClick={handleExecute}
							disabled={executePartiQL.isPending || !statement.trim()}
						>
							<Play className="mr-2 h-4 w-4" />
							{executePartiQL.isPending ? "Executing..." : "Execute"}
						</Button>
						{history.length > 0 && (
							<Button
								variant="outline"
								onClick={() => setShowHistory(!showHistory)}
							>
								<History className="mr-2 h-4 w-4" />
								History ({history.length})
							</Button>
						)}
					</div>

					{executePartiQL.isError && (
						<div className="rounded-md border border-destructive p-3 text-sm text-destructive">
							{executePartiQL.error.message}
						</div>
					)}
				</CardContent>
			</Card>

			{/* History */}
			{showHistory && history.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							Statement History
							<Button variant="ghost" size="sm" onClick={() => setHistory([])}>
								<Trash2 className="mr-2 h-4 w-4" />
								Clear
							</Button>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{history.map((entry) => (
								<button
									key={entry.timestamp.getTime()}
									type="button"
									onClick={() => loadFromHistory(entry)}
									className="w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted"
								>
									<div className="flex items-center justify-between">
										<code className="font-mono text-xs truncate max-w-[80%]">
											{entry.statement}
										</code>
										<div className="flex items-center gap-2">
											{entry.success ? (
												<Badge variant="default">{entry.itemCount} items</Badge>
											) : (
												<Badge variant="destructive">Error</Badge>
											)}
											<span className="text-xs text-muted-foreground">
												{entry.timestamp.toLocaleTimeString()}
											</span>
										</div>
									</div>
								</button>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Results */}
			{results && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Results
							<Badge variant="secondary">{results.length} items</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{results.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground">
								No results returned. The statement executed successfully.
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
										{results.map((item, idx) => (
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
