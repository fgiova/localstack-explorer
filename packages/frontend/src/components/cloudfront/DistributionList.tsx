import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, Search } from "lucide-react";
import { useListDistributions, useCreateDistribution, useDeleteDistribution } from "@/api/cloudfront";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface OriginFormData {
  id: string;
  domainName: string;
  originPath: string;
  protocolPolicy: "match-viewer" | "http-only" | "https-only";
  httpPort: number;
  httpsPort: number;
}

interface CreateFormData {
  comment: string;
  defaultRootObject: string;
  enabled: boolean;
  origins: OriginFormData[];
  defaultCacheBehavior: {
    targetOriginId: string;
    viewerProtocolPolicy: "allow-all" | "redirect-to-https" | "https-only";
    allowedMethods: string;
    cachedMethods: string;
    defaultTTL: number;
    maxTTL: number;
    minTTL: number;
    compress: boolean;
  };
}

function makeEmptyOrigin(): OriginFormData {
  return {
    id: "",
    domainName: "",
    originPath: "",
    protocolPolicy: "match-viewer",
    httpPort: 80,
    httpsPort: 443,
  };
}

function makeDefaultForm(): CreateFormData {
  return {
    comment: "",
    defaultRootObject: "",
    enabled: true,
    origins: [makeEmptyOrigin()],
    defaultCacheBehavior: {
      targetOriginId: "",
      viewerProtocolPolicy: "allow-all",
      allowedMethods: "GET,HEAD",
      cachedMethods: "GET,HEAD",
      defaultTTL: 86400,
      maxTTL: 31536000,
      minTTL: 0,
      compress: false,
    },
  };
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Deployed") return "default";
  if (status === "InProgress") return "secondary";
  return "outline";
}

export function DistributionList() {
  const { data, isLoading, error } = useListDistributions();
  const createDistribution = useCreateDistribution();
  const deleteDistribution = useDeleteDistribution();

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; domainName: string } | null>(null);
  const [form, setForm] = useState<CreateFormData>(makeDefaultForm);

  const filteredDistributions = data?.distributions.filter((d) => {
    const term = searchTerm.toLowerCase();
    return d.id.toLowerCase().includes(term) || d.domainName.toLowerCase().includes(term);
  }) ?? [];

  function updateOrigin(index: number, updates: Partial<OriginFormData>) {
    setForm((prev) => {
      const origins = [...prev.origins];
      origins[index] = { ...origins[index], ...updates };
      return { ...prev, origins };
    });
  }

  function addOrigin() {
    setForm((prev) => ({ ...prev, origins: [...prev.origins, makeEmptyOrigin()] }));
  }

  function removeOrigin(index: number) {
    setForm((prev) => ({
      ...prev,
      origins: prev.origins.filter((_, i) => i !== index),
    }));
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { defaultCacheBehavior, origins, ...rest } = form;
    createDistribution.mutate(
      {
        ...rest,
        origins: origins.map((o) => ({
          id: o.id,
          domainName: o.domainName,
          originPath: o.originPath || undefined,
          protocolPolicy: o.protocolPolicy,
          httpPort: o.httpPort,
          httpsPort: o.httpsPort,
        })),
        defaultCacheBehavior: {
          pathPattern: "*",
          targetOriginId: defaultCacheBehavior.targetOriginId,
          viewerProtocolPolicy: defaultCacheBehavior.viewerProtocolPolicy,
          allowedMethods: defaultCacheBehavior.allowedMethods.split(",").map((m) => m.trim()).filter(Boolean),
          cachedMethods: defaultCacheBehavior.cachedMethods.split(",").map((m) => m.trim()).filter(Boolean),
          defaultTTL: defaultCacheBehavior.defaultTTL,
          maxTTL: defaultCacheBehavior.maxTTL,
          minTTL: defaultCacheBehavior.minTTL,
          compress: defaultCacheBehavior.compress,
        },
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm(makeDefaultForm());
        },
      },
    );
  }

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
        Error loading distributions: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CloudFront Distributions</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Distribution
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by ID or domain name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredDistributions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {data?.distributions.length === 0
            ? "No distributions found. Create one to get started."
            : "No distributions match your search."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Domain Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Origins</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDistributions.map((dist) => (
              <TableRow key={dist.id}>
                <TableCell>
                  <Link
                    to={"/cloudfront/$distributionId" as string}
                    params={{ distributionId: dist.id } as Record<string, string>}
                    className="font-medium text-primary hover:underline"
                  >
                    {dist.id}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{dist.domainName}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(dist.status)}>{dist.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={dist.enabled ? "default" : "destructive"}>
                    {dist.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{dist.originsCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dist.lastModified ? new Date(dist.lastModified).toLocaleString() : "\u2014"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ id: dist.id, domainName: dist.domainName })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Distribution Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setForm(makeDefaultForm());
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Distribution</DialogTitle>
            <DialogDescription>
              Configure a new CloudFront distribution with origins and cache behavior.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {/* General Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">General</h3>
              <div className="space-y-2">
                <Label htmlFor="create-comment">Comment</Label>
                <Input
                  id="create-comment"
                  value={form.comment}
                  onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-default-root-object">Default Root Object</Label>
                <Input
                  id="create-default-root-object"
                  value={form.defaultRootObject}
                  onChange={(e) => setForm((prev) => ({ ...prev, defaultRootObject: e.target.value }))}
                  placeholder="e.g. index.html"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="create-enabled">Enabled</Label>
              </div>
            </div>

            {/* Origins Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Origins</h3>
                <Button type="button" variant="outline" size="sm" onClick={addOrigin}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Origin
                </Button>
              </div>
              {form.origins.map((origin, index) => (
                <div key={index} className="space-y-3 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Origin {index + 1}</span>
                    {form.origins.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrigin(index)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Origin ID</Label>
                      <Input
                        value={origin.id}
                        onChange={(e) => updateOrigin(index, { id: e.target.value })}
                        placeholder="my-origin"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Domain Name</Label>
                      <Input
                        value={origin.domainName}
                        onChange={(e) => updateOrigin(index, { domainName: e.target.value })}
                        placeholder="example.com"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Origin Path</Label>
                      <Input
                        value={origin.originPath}
                        onChange={(e) => updateOrigin(index, { originPath: e.target.value })}
                        placeholder="/path"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Protocol Policy</Label>
                      <select
                        value={origin.protocolPolicy}
                        onChange={(e) =>
                          updateOrigin(index, {
                            protocolPolicy: e.target.value as OriginFormData["protocolPolicy"],
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="match-viewer">match-viewer</option>
                        <option value="http-only">http-only</option>
                        <option value="https-only">https-only</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>HTTP Port</Label>
                      <Input
                        type="number"
                        value={origin.httpPort}
                        onChange={(e) => updateOrigin(index, { httpPort: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>HTTPS Port</Label>
                      <Input
                        type="number"
                        value={origin.httpsPort}
                        onChange={(e) => updateOrigin(index, { httpsPort: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Default Cache Behavior Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Default Cache Behavior</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Target Origin ID</Label>
                  <Input
                    value={form.defaultCacheBehavior.targetOriginId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, targetOriginId: e.target.value },
                      }))
                    }
                    placeholder="my-origin"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Viewer Protocol Policy</Label>
                  <select
                    value={form.defaultCacheBehavior.viewerProtocolPolicy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: {
                          ...prev.defaultCacheBehavior,
                          viewerProtocolPolicy: e.target.value as CreateFormData["defaultCacheBehavior"]["viewerProtocolPolicy"],
                        },
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="allow-all">allow-all</option>
                    <option value="redirect-to-https">redirect-to-https</option>
                    <option value="https-only">https-only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Allowed Methods (comma-separated)</Label>
                  <Input
                    value={form.defaultCacheBehavior.allowedMethods}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, allowedMethods: e.target.value },
                      }))
                    }
                    placeholder="GET,HEAD"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cached Methods (comma-separated)</Label>
                  <Input
                    value={form.defaultCacheBehavior.cachedMethods}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, cachedMethods: e.target.value },
                      }))
                    }
                    placeholder="GET,HEAD"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={form.defaultCacheBehavior.defaultTTL}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, defaultTTL: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={form.defaultCacheBehavior.maxTTL}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, maxTTL: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Min TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={form.defaultCacheBehavior.minTTL}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, minTTL: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 self-end pb-1">
                  <Switch
                    id="create-compress"
                    checked={form.defaultCacheBehavior.compress}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultCacheBehavior: { ...prev.defaultCacheBehavior, compress: checked },
                      }))
                    }
                  />
                  <Label htmlFor="create-compress">Compress</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDistribution.isPending}>
                {createDistribution.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Distribution</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete distribution &quot;{deleteTarget?.id}&quot; ({deleteTarget?.domainName})?
              This action cannot be undone. Note: the distribution must be disabled before it can be deleted.
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
                  deleteDistribution.mutate(deleteTarget.id, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }
              }}
              disabled={deleteDistribution.isPending}
            >
              {deleteDistribution.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
