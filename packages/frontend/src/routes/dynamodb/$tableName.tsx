import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { BatchOperations } from "@/components/dynamodb/BatchOperations";
import { IndexManager } from "@/components/dynamodb/IndexManager";
import { ItemBrowser } from "@/components/dynamodb/ItemBrowser";
import { PartiQLEditor } from "@/components/dynamodb/PartiQLEditor";
import { QueryBuilder } from "@/components/dynamodb/QueryBuilder";
import { StreamViewer } from "@/components/dynamodb/StreamViewer";
import { TableDetail } from "@/components/dynamodb/TableDetail";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dynamodb/$tableName")({
	component: DynamoDBTableDetailPage,
});

type TabId =
	| "overview"
	| "items"
	| "query"
	| "partiql"
	| "streams"
	| "indexes"
	| "batch";

function DynamoDBTableDetailPage() {
	const { tableName } = Route.useParams();
	const [activeTab, setActiveTab] = useState<TabId>("overview");

	const tabs: { id: TabId; label: string }[] = [
		{ id: "overview", label: "Overview" },
		{ id: "items", label: "Items" },
		{ id: "query", label: "Query" },
		{ id: "partiql", label: "PartiQL" },
		{ id: "streams", label: "Streams" },
		{ id: "indexes", label: "Indexes" },
		{ id: "batch", label: "Batch" },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Button variant="outline" size="icon" asChild>
					<Link to="/dynamodb">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h2 className="text-2xl font-bold">{tableName}</h2>
			</div>

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
						</button>
					))}
				</nav>
			</div>

			{/* Tab content */}
			{activeTab === "overview" && <TableDetail tableName={tableName} />}
			{activeTab === "items" && <ItemBrowser tableName={tableName} />}
			{activeTab === "query" && <QueryBuilder tableName={tableName} />}
			{activeTab === "partiql" && <PartiQLEditor tableName={tableName} />}
			{activeTab === "streams" && <StreamViewer tableName={tableName} />}
			{activeTab === "indexes" && <IndexManager tableName={tableName} />}
			{activeTab === "batch" && <BatchOperations tableName={tableName} />}
		</div>
	);
}
