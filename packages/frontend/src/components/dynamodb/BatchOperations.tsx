import { useState, useRef } from "react";
import { Upload, Download, Play } from "lucide-react";
import {
  useBatchWriteItems,
  useBatchGetItems,
  type BatchWriteResponse,
  type BatchGetResponse,
} from "@/api/dynamodb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BatchOperationsProps {
  tableName: string;
}

type ActiveTab = "write" | "get";

export function BatchOperations({ tableName }: BatchOperationsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("write");

  // Batch Write state
  const [writeJson, setWriteJson] = useState(
    JSON.stringify({ put: [{ pk: "example", data: "value" }], delete: [{ pk: "to-delete" }] }, null, 2)
  );
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<BatchWriteResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch Get state
  const [getJson, setGetJson] = useState(
    JSON.stringify([{ pk: "key1" }, { pk: "key2" }], null, 2)
  );
  const [getError, setGetError] = useState<string | null>(null);
  const [getResult, setGetResult] = useState<BatchGetResponse | null>(null);

  const batchWrite = useBatchWriteItems(tableName);
  const batchGet = useBatchGetItems(tableName);

  const handleBatchWrite = () => {
    try {
      const parsed = JSON.parse(writeJson);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        setWriteError('Expected object with "put" and/or "delete" arrays');
        return;
      }
      setWriteError(null);

      const putItems = parsed.put as Record<string, unknown>[] | undefined;
      const deleteKeys = parsed.delete as Record<string, unknown>[] | undefined;

      if (!putItems?.length && !deleteKeys?.length) {
        setWriteError('Provide at least "put" or "delete" items');
        return;
      }

      batchWrite.mutate({ putItems, deleteKeys }, {
        onSuccess: (data) => setWriteResult(data),
      });
    } catch {
      setWriteError("Invalid JSON");
    }
  };

  const handleBatchGet = () => {
    try {
      const parsed = JSON.parse(getJson);
      if (!Array.isArray(parsed)) {
        setGetError("Expected an array of key objects");
        return;
      }
      setGetError(null);

      batchGet.mutate({ keys: parsed }, {
        onSuccess: (data) => setGetResult(data),
      });
    } catch {
      setGetError("Invalid JSON");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        JSON.parse(content); // validate
        setWriteJson(content);
        setWriteError(null);
      } catch {
        setWriteError("Imported file is not valid JSON");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportResults = () => {
    if (!getResult?.items.length) return;
    const blob = new Blob([JSON.stringify(getResult.items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}-batch-get-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return "\u2014";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "write", label: "Batch Write" },
    { id: "get", label: "Batch Get" },
  ];

  return (
    <div className="space-y-4">
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

      {/* Batch Write */}
      {activeTab === "write" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Batch Write
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import JSON
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Request Body</Label>
              <textarea
                value={writeJson}
                onChange={(e) => {
                  setWriteJson(e.target.value);
                  setWriteError(null);
                }}
                className="h-[200px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Format: {`{ "put": [...items], "delete": [...keys] }`}
              </p>
            </div>

            {writeError && (
              <p className="text-sm text-destructive">{writeError}</p>
            )}
            {batchWrite.isError && (
              <p className="text-sm text-destructive">{batchWrite.error.message}</p>
            )}

            <Button
              onClick={handleBatchWrite}
              disabled={batchWrite.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {batchWrite.isPending ? "Processing..." : "Execute Batch Write"}
            </Button>

            {writeResult && (
              <div className="flex gap-4 rounded-md border p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Processed</span>
                  <Badge variant="default">{writeResult.processedCount}</Badge>
                </div>
                {writeResult.unprocessedCount > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Unprocessed</span>
                    <Badge variant="destructive">{writeResult.unprocessedCount}</Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Get */}
      {activeTab === "get" && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Get</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Keys (JSON Array)</Label>
              <textarea
                value={getJson}
                onChange={(e) => {
                  setGetJson(e.target.value);
                  setGetError(null);
                }}
                className="h-[150px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Format: [{`{ "pk": "key1" }`}, ...]
              </p>
            </div>

            {getError && <p className="text-sm text-destructive">{getError}</p>}
            {batchGet.isError && (
              <p className="text-sm text-destructive">{batchGet.error.message}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleBatchGet}
                disabled={batchGet.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                {batchGet.isPending ? "Fetching..." : "Execute Batch Get"}
              </Button>
              {getResult?.items.length ? (
                <Button variant="outline" onClick={handleExportResults}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              ) : null}
            </div>

            {getResult && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{getResult.items.length} items</Badge>
                  {getResult.unprocessedKeys && (
                    <Badge variant="destructive">
                      {getResult.unprocessedKeys.length} unprocessed
                    </Badge>
                  )}
                </div>
                {getResult.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Array.from(
                            new Set(getResult.items.flatMap((item) => Object.keys(item)))
                          ).map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getResult.items.map((item, idx) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: dynamic DynamoDB items have no stable unique key
                          <TableRow key={idx}>
                            {Array.from(
                              new Set(getResult.items.flatMap((i) => Object.keys(i)))
                            ).map((col) => (
                              <TableCell key={col} className="max-w-[300px] truncate font-mono text-sm">
                                {formatCellValue(item[col])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
