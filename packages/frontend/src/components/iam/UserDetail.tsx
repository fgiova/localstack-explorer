import { useState, lazy, Suspense } from "react";
import { ArrowLeft, Plus, Trash2, Key, Copy, Check, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useGetUser,
  useListAccessKeys,
  useCreateAccessKey,
  useDeleteAccessKey,
  useUpdateAccessKey,
  useListUserInlinePolicies,
  useGetUserInlinePolicy,
  usePutUserInlinePolicy,
  useDeleteUserInlinePolicy,
  useListAttachedUserPolicies,
  useAttachUserPolicy,
  useDetachUserPolicy,
  useListUserGroups,
  useAddUserToGroup,
  useRemoveUserFromGroup,
  useListPolicies,
  useListGroups,
} from "@/api/iam";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const DEFAULT_POLICY_DOCUMENT = JSON.stringify(
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
);

const MONACO_OPTIONS = {
  minimap: { enabled: false },
  automaticLayout: true,
  tabSize: 2,
  formatOnPaste: true,
} as const;

interface UserDetailProps {
  userName: string;
}

export function UserDetail({ userName }: UserDetailProps) {
  const { data: user, isLoading, error } = useGetUser(userName);

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
        Error loading user: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/iam">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{userName}</h2>
            <p className="text-sm text-muted-foreground">{user?.arn}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="access-keys">Access Keys</TabsTrigger>
          <TabsTrigger value="inline-policies">Inline Policies</TabsTrigger>
          <TabsTrigger value="managed-policies">Managed Policies</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <InfoTab userName={userName} />
        </TabsContent>
        <TabsContent value="access-keys">
          <AccessKeysTab userName={userName} />
        </TabsContent>
        <TabsContent value="inline-policies">
          <InlinePoliciesTab userName={userName} />
        </TabsContent>
        <TabsContent value="managed-policies">
          <ManagedPoliciesTab userName={userName} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTab userName={userName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info Tab
// ---------------------------------------------------------------------------

function InfoTab({ userName }: { userName: string }) {
  const { data: user } = useGetUser(userName);

  if (!user) return null;

  const fields: { label: string; value: string }[] = [
    { label: "User Name", value: user.userName },
    { label: "User ID", value: user.userId },
    { label: "ARN", value: user.arn },
    { label: "Path", value: user.path ?? "/" },
    {
      label: "Created Date",
      value: user.createDate
        ? new Date(user.createDate).toLocaleString()
        : "-",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f) => (
          <div key={f.label} className="grid grid-cols-3 gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {f.label}
            </span>
            <span className="col-span-2 text-sm font-mono break-all">
              {f.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Access Keys Tab
// ---------------------------------------------------------------------------

function AccessKeysTab({ userName }: { userName: string }) {
  const { data, isLoading } = useListAccessKeys(userName);
  const createAccessKey = useCreateAccessKey();
  const deleteAccessKey = useDeleteAccessKey();
  const updateAccessKey = useUpdateAccessKey();

  const [showCreateResult, setShowCreateResult] = useState<{
    accessKeyId: string;
    secretAccessKey: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    createAccessKey.mutate(userName, {
      onSuccess: (result) => {
        setShowCreateResult({
          accessKeyId: result.accessKeyId,
          secretAccessKey: result.secretAccessKey,
        });
      },
    });
  }

  function handleToggleStatus(accessKeyId: string, currentStatus: string) {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    updateAccessKey.mutate({ userName, accessKeyId, status: newStatus });
  }

  function handleCopySecret() {
    if (showCreateResult) {
      navigator.clipboard.writeText(showCreateResult.secretAccessKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const accessKeys = data?.accessKeys ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Access Keys</h3>
        <Button onClick={handleCreate} disabled={createAccessKey.isPending}>
          <Key className="mr-2 h-4 w-4" />
          {createAccessKey.isPending ? "Creating..." : "Create Access Key"}
        </Button>
      </div>

      {accessKeys.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No access keys found. Create one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Access Key ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessKeys.map((key) => (
              <TableRow key={key.accessKeyId}>
                <TableCell className="font-mono text-sm">
                  {key.accessKeyId}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={key.status === "Active" ? "default" : "destructive"}
                  >
                    {key.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {key.createDate
                    ? new Date(key.createDate).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={key.status === "Active"}
                      onCheckedChange={() =>
                        handleToggleStatus(key.accessKeyId, key.status)
                      }
                      disabled={updateAccessKey.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(key.accessKeyId)}
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

      {/* Created access key result dialog - not dismissible by outside click */}
      <Dialog
        open={!!showCreateResult}
        onOpenChange={() => {
          /* prevent closing via outside click or escape */
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Access Key Created</DialogTitle>
            <DialogDescription>
              This is the only time you can view the secret access key. Save it
              securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Access Key ID
              </span>
              <p className="font-mono text-sm mt-1">
                {showCreateResult?.accessKeyId}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Secret Access Key
              </span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 rounded bg-muted p-2 font-mono text-sm break-all">
                  {showCreateResult?.secretAccessKey}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopySecret}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowCreateResult(null);
                setCopied(false);
              }}
            >
              I have saved the secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete access key confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete access key &quot;{deleteTarget}
              &quot;? This action cannot be undone.
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
                  deleteAccessKey.mutate(
                    { userName, accessKeyId: deleteTarget },
                    { onSettled: () => setDeleteTarget(null) }
                  );
                }
              }}
              disabled={deleteAccessKey.isPending}
            >
              {deleteAccessKey.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Policies Tab
// ---------------------------------------------------------------------------

function InlinePoliciesTab({ userName }: { userName: string }) {
  const { data, isLoading } = useListUserInlinePolicies(userName);
  const putPolicy = usePutUserInlinePolicy();
  const deletePolicy = useDeleteUserInlinePolicy();

  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [policyDoc, setPolicyDoc] = useState(DEFAULT_POLICY_DOCUMENT);

  const policyNames = data?.policyNames ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inline Policies</h3>
        <Button
          onClick={() => {
            setNewPolicyName("");
            setPolicyDoc(DEFAULT_POLICY_DOCUMENT);
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {policyNames.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No inline policies found. Create one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policyNames.map((name) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPolicy(name)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPolicyDoc("");
                        setEditingPolicy(name);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(name)}
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

      {/* View policy dialog */}
      <ViewPolicyDialog
        userName={userName}
        policyName={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />

      {/* Edit policy dialog */}
      <EditPolicyDialog
        userName={userName}
        policyName={editingPolicy}
        onClose={() => setEditingPolicy(null)}
        putPolicy={putPolicy}
      />

      {/* Create policy dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Inline Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="inline-policy-name">Policy Name</label>
              <Input
                id="inline-policy-name"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="Enter policy name"
                className="mt-1"
              />
            </div>
            <div>
              <span className="text-sm font-medium">Policy Document</span>
              <div className="mt-1 rounded border">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  }
                >
                  <MonacoEditor
                    height="250px"
                    language="json"
                    theme="vs-dark"
                    value={policyDoc}
                    onChange={(v) => setPolicyDoc(v ?? "")}
                    options={MONACO_OPTIONS}
                  />
                </Suspense>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                putPolicy.mutate(
                  {
                    userName,
                    policyName: newPolicyName,
                    policyDocument: policyDoc,
                  },
                  { onSuccess: () => setCreateOpen(false) }
                );
              }}
              disabled={!newPolicyName.trim() || putPolicy.isPending}
            >
              {putPolicy.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete policy confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inline Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete policy &quot;{deleteTarget}&quot;?
              This action cannot be undone.
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
                  deletePolicy.mutate(
                    { userName, policyName: deleteTarget },
                    { onSettled: () => setDeleteTarget(null) }
                  );
                }
              }}
              disabled={deletePolicy.isPending}
            >
              {deletePolicy.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewPolicyDialog({
  userName,
  policyName,
  onClose,
}: {
  userName: string;
  policyName: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetUserInlinePolicy(
    userName,
    policyName ?? ""
  );

  const document = data?.policyDocument
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(data.policyDocument), null, 2);
        } catch {
          return data.policyDocument;
        }
      })()
    : "";

  return (
    <Dialog open={!!policyName} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Policy: {policyName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded border">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }
            >
              <MonacoEditor
                height="250px"
                language="json"
                theme="vs-dark"
                value={document}
                options={{ ...MONACO_OPTIONS, readOnly: true }}
              />
            </Suspense>
          </div>
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

function EditPolicyDialog({
  userName,
  policyName,
  onClose,
  putPolicy,
}: {
  userName: string;
  policyName: string | null;
  onClose: () => void;
  putPolicy: ReturnType<typeof usePutUserInlinePolicy>;
}) {
  const { data, isLoading } = useGetUserInlinePolicy(
    userName,
    policyName ?? ""
  );
  const [editDoc, setEditDoc] = useState<string | null>(null);

  const document = data?.policyDocument
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(data.policyDocument), null, 2);
        } catch {
          return data.policyDocument;
        }
      })()
    : "";

  // Use local edit state if set, otherwise use fetched document
  const currentDoc = editDoc ?? document;

  return (
    <Dialog
      open={!!policyName}
      onOpenChange={() => {
        setEditDoc(null);
        onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Policy: {policyName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded border">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }
            >
              <MonacoEditor
                height="250px"
                language="json"
                theme="vs-dark"
                value={currentDoc}
                onChange={(v) => setEditDoc(v ?? "")}
                options={MONACO_OPTIONS}
              />
            </Suspense>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditDoc(null);
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (policyName) {
                putPolicy.mutate(
                  {
                    userName,
                    policyName,
                    policyDocument: currentDoc,
                  },
                  {
                    onSuccess: () => {
                      setEditDoc(null);
                      onClose();
                    },
                  }
                );
              }
            }}
            disabled={putPolicy.isPending}
          >
            {putPolicy.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Managed Policies Tab
// ---------------------------------------------------------------------------

function ManagedPoliciesTab({ userName }: { userName: string }) {
  const { data, isLoading } = useListAttachedUserPolicies(userName);
  const detachPolicy = useDetachUserPolicy();
  const attachPolicy = useAttachUserPolicy();
  const { data: allPolicies } = useListPolicies("Local");

  const [attachOpen, setAttachOpen] = useState(false);
  const [detachTarget, setDetachTarget] = useState<{
    policyName: string;
    policyArn: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const attachedPolicies = data?.attachedPolicies ?? [];
  const attachedArns = new Set(attachedPolicies.map((p) => p.policyArn));

  const availablePolicies = (allPolicies?.policies ?? []).filter(
    (p) =>
      !attachedArns.has(p.arn) &&
      (p.policyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.arn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Managed Policies</h3>
        <Button onClick={() => { setSearchTerm(""); setAttachOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Attach Policy
        </Button>
      </div>

      {attachedPolicies.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No managed policies attached. Attach one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead>Policy ARN</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachedPolicies.map((policy) => (
              <TableRow key={policy.policyArn}>
                <TableCell>
                  <a
                    href={`/iam/policies/${encodeURIComponent(policy.policyArn)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {policy.policyName}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {policy.policyArn}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetachTarget(policy)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Attach policy dialog */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach Managed Policy</DialogTitle>
            <DialogDescription>
              Select a policy to attach to this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {availablePolicies.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No matching policies found.
                </div>
              ) : (
                availablePolicies.map((policy) => (
                  <div
                    key={policy.arn}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {policy.policyName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {policy.arn}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="ml-2 shrink-0"
                      onClick={() => {
                        attachPolicy.mutate(
                          { userName, policyArn: policy.arn },
                          { onSuccess: () => setAttachOpen(false) }
                        );
                      }}
                      disabled={attachPolicy.isPending}
                    >
                      Attach
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detach policy confirmation */}
      <Dialog
        open={!!detachTarget}
        onOpenChange={() => setDetachTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detach Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to detach policy &quot;
              {detachTarget?.policyName}&quot; from this user?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetachTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (detachTarget) {
                  detachPolicy.mutate(
                    { userName, policyArn: detachTarget.policyArn },
                    { onSettled: () => setDetachTarget(null) }
                  );
                }
              }}
              disabled={detachPolicy.isPending}
            >
              {detachPolicy.isPending ? "Detaching..." : "Detach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Groups Tab
// ---------------------------------------------------------------------------

function GroupsTab({ userName }: { userName: string }) {
  const { data, isLoading } = useListUserGroups(userName);
  const removeFromGroup = useRemoveUserFromGroup();
  const addToGroup = useAddUserToGroup();
  const { data: allGroups } = useListGroups();

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    groupName: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const userGroups = data?.groups ?? [];
  const userGroupNames = new Set(userGroups.map((g) => g.groupName));

  const availableGroups = (allGroups?.groups ?? []).filter(
    (g) =>
      !userGroupNames.has(g.groupName) &&
      g.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Groups</h3>
        <Button onClick={() => { setSearchTerm(""); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add to Group
        </Button>
      </div>

      {userGroups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          This user is not a member of any groups.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead>
              <TableHead>Group ID</TableHead>
              <TableHead>ARN</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userGroups.map((group) => (
              <TableRow key={group.groupId}>
                <TableCell>
                  <a
                    href={`/iam/groups/${group.groupName}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {group.groupName}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {group.groupId}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {group.arn}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setRemoveTarget({ groupName: group.groupName })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add to group dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Group</DialogTitle>
            <DialogDescription>
              Select a group to add this user to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {availableGroups.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No matching groups found.
                </div>
              ) : (
                availableGroups.map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {group.groupName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {group.arn}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="ml-2 shrink-0"
                      onClick={() => {
                        addToGroup.mutate(
                          { groupName: group.groupName, userName },
                          { onSuccess: () => setAddOpen(false) }
                        );
                      }}
                      disabled={addToGroup.isPending}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from group confirmation */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this user from group &quot;
              {removeTarget?.groupName}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeTarget) {
                  removeFromGroup.mutate(
                    { groupName: removeTarget.groupName, userName },
                    { onSettled: () => setRemoveTarget(null) }
                  );
                }
              }}
              disabled={removeFromGroup.isPending}
            >
              {removeFromGroup.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
