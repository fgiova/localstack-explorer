import { useState, lazy, Suspense } from "react";
import { ArrowLeft, Plus, Trash2, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useGetPolicy,
  useGetPolicyDocument,
  useListPolicyVersions,
  useCreatePolicyVersion,
  useDeletePolicyVersion,
  useSetDefaultPolicyVersion,
  type ManagedPolicyDetail,
} from "@/api/iam";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface PolicyDetailProps {
  policyArn: string;
}

export function PolicyDetail({ policyArn }: PolicyDetailProps) {
  const { data: policy, isLoading, error } = useGetPolicy(policyArn);

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
        Error loading policy: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/iam">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{policy?.policyName}</h2>
            <p className="text-sm text-muted-foreground">{policy?.arn}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="document">Policy Document</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <InfoTab policy={policy} />
        </TabsContent>
        <TabsContent value="document">
          <DocumentTab policyArn={policyArn} />
        </TabsContent>
        <TabsContent value="versions">
          <VersionsTab policyArn={policyArn} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoTab({ policy }: { policy: ManagedPolicyDetail | undefined }) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Policy Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Policy Name</p>
            <p className="font-medium">{policy?.policyName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Policy ID</p>
            <p className="font-medium font-mono text-sm">{policy?.policyId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ARN</p>
            <p className="font-medium font-mono text-sm break-all">{policy?.arn}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">{policy?.description || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Attachment Count</p>
            <p className="font-medium">{policy?.attachmentCount ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Default Version</p>
            <p className="font-medium">{policy?.defaultVersionId ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">
              {policy?.createDate
                ? new Date(policy.createDate).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentTab({ policyArn }: { policyArn: string }) {
  const { data, isLoading } = useGetPolicyDocument(policyArn);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const formatted = tryFormatJson(data?.policyDocument ?? "");

  return (
    <div className="mt-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-[400px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <MonacoEditor
          height="400px"
          language="json"
          value={formatted}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            automaticLayout: true,
            tabSize: 2,
            readOnly: true,
          }}
          theme="vs-dark"
        />
      </Suspense>
    </div>
  );
}

function VersionsTab({ policyArn }: { policyArn: string }) {
  const { data, isLoading } = useListPolicyVersions(policyArn);
  const createVersion = useCreatePolicyVersion();
  const deleteVersion = useDeletePolicyVersion();
  const setDefault = useSetDefaultPolicyVersion();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewVersion, setViewVersion] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState(
    JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }],
      },
      null,
      2
    )
  );
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [jsonError, setJsonError] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const versions = data?.versions ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Policy Versions</h3>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Version
        </Button>
      </div>

      {versions.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No versions found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version ID</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.versionId}>
                <TableCell className="font-mono">{v.versionId}</TableCell>
                <TableCell>
                  {v.isDefaultVersion ? (
                    <Badge className="bg-green-600">Default</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDefault.mutate({
                          policyArn,
                          versionId: v.versionId,
                        })
                      }
                      disabled={setDefault.isPending}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      Set Default
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {v.createDate
                    ? new Date(v.createDate).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewVersion(v.versionId)}
                  >
                    View
                  </Button>
                  {!v.isDefaultVersion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(v.versionId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* View Version Dialog */}
      <ViewVersionDialog
        policyArn={policyArn}
        versionId={viewVersion}
        onClose={() => setViewVersion(null)}
      />

      {/* Create Version Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Policy Version</DialogTitle>
            <DialogDescription>
              Define the policy document for the new version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-[300px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }
            >
              <MonacoEditor
                height="300px"
                language="json"
                value={newDoc}
                onChange={(value) => {
                  setNewDoc(value ?? "");
                  setJsonError("");
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                  readOnly: createVersion.isPending,
                }}
                theme="vs-dark"
              />
            </Suspense>
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={setAsDefault}
                onCheckedChange={setSetAsDefault}
              />
              <span className="text-sm">Set as default version</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createVersion.isPending}
              onClick={() => {
                try {
                  JSON.parse(newDoc);
                } catch {
                  setJsonError("Invalid JSON");
                  return;
                }
                createVersion.mutate(
                  { policyArn, policyDocument: newDoc, setAsDefault },
                  {
                    onSuccess: () => {
                      setCreateOpen(false);
                      setNewDoc(
                        JSON.stringify(
                          {
                            Version: "2012-10-17",
                            Statement: [
                              {
                                Effect: "Allow",
                                Action: "*",
                                Resource: "*",
                              },
                            ],
                          },
                          null,
                          2
                        )
                      );
                    },
                  }
                );
              }}
            >
              {createVersion.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Version Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete version "{deleteTarget}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteVersion.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteVersion.mutate(
                    { policyArn, versionId: deleteTarget },
                    { onSettled: () => setDeleteTarget(null) }
                  );
                }
              }}
            >
              {deleteVersion.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewVersionDialog({
  policyArn,
  versionId,
  onClose,
}: {
  policyArn: string;
  versionId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetPolicyDocument(
    policyArn,
    versionId ?? undefined
  );

  const formatted = tryFormatJson(data?.policyDocument ?? "");

  return (
    <Dialog open={!!versionId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version {versionId} — Policy Document</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[300px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <MonacoEditor
              height="300px"
              language="json"
              value={formatted}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                automaticLayout: true,
                tabSize: 2,
                readOnly: true,
              }}
              theme="vs-dark"
            />
          </Suspense>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
