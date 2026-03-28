import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useGetDistribution,
  useUpdateDistribution,
  useDeleteDistribution,
  useListInvalidations,
  useCreateInvalidation,
} from "@/api/cloudfront";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "Deployed") return "default";
  if (status === "InProgress") return "secondary";
  return "outline";
};

function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return "\u2014";
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? timestamp : d.toLocaleString();
}

interface DistributionDetailProps {
  distributionId: string;
}

export function DistributionDetail({ distributionId }: DistributionDetailProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [invalidationDialogOpen, setInvalidationDialogOpen] = useState(false);

  // Update form state
  const [updateComment, setUpdateComment] = useState("");
  const [updateDefaultRootObject, setUpdateDefaultRootObject] = useState("");
  const [updateEnabled, setUpdateEnabled] = useState(true);

  // Invalidation form state
  const [invalidationPaths, setInvalidationPaths] = useState("");

  const navigate = useNavigate();

  const { data: distribution, isLoading, error } = useGetDistribution(distributionId);
  const { data: invalidationsData } = useListInvalidations(distributionId);
  const updateDistribution = useUpdateDistribution(distributionId);
  const deleteDistribution = useDeleteDistribution();
  const createInvalidation = useCreateInvalidation(distributionId);

  const handleOpenUpdateDialog = () => {
    if (distribution) {
      setUpdateComment(distribution.comment ?? "");
      setUpdateDefaultRootObject(distribution.defaultRootObject ?? "");
      setUpdateEnabled(distribution.enabled);
    }
    setUpdateDialogOpen(true);
  };

  const handleUpdate = () => {
    updateDistribution.mutate(
      {
        comment: updateComment,
        defaultRootObject: updateDefaultRootObject,
        enabled: updateEnabled,
      },
      {
        onSuccess: () => {
          setUpdateDialogOpen(false);
          setUpdateComment("");
          setUpdateDefaultRootObject("");
          setUpdateEnabled(true);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteDistribution.mutate(distributionId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate({ to: "/cloudfront" });
      },
      onError: () => {
        setDeleteDialogOpen(false);
      },
    });
  };

  const handleCreateInvalidation = () => {
    const paths = invalidationPaths
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (paths.length === 0) return;
    createInvalidation.mutate(paths, {
      onSuccess: () => {
        setInvalidationDialogOpen(false);
        setInvalidationPaths("");
      },
    });
  };

  const invalidations = invalidationsData?.invalidations ?? [];

  // Build behaviors list: default behavior first, then cache behaviors
  const allBehaviors = distribution
    ? [
        { ...distribution.defaultCacheBehavior, pathPattern: "*" },
        ...distribution.cacheBehaviors,
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/cloudfront">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{distributionId}</h2>
              {distribution?.status && (
                <Badge variant={statusVariant(distribution.status)}>
                  {distribution.status}
                </Badge>
              )}
              {distribution && (
                <Badge variant={distribution.enabled ? "default" : "secondary"}>
                  {distribution.enabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
            {distribution?.domainName && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {distribution.domainName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenUpdateDialog}>
            <Pencil className="mr-2 h-4 w-4" />
            Update
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteDistribution.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
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
          Error loading distribution details: {error.message}
        </div>
      )}

      {/* Tabs */}
      {!isLoading && !error && distribution && (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="origins">Origins</TabsTrigger>
            <TabsTrigger value="behaviors">Behaviors</TabsTrigger>
            <TabsTrigger value="invalidations">Invalidations</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Distribution Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">ID</span>
                    <span className="text-sm font-semibold break-all">{distribution.id}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">ARN</span>
                    <span className="text-sm font-semibold break-all">{distribution.arn}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Domain Name</span>
                    <span className="text-sm font-semibold break-all">{distribution.domainName}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <span className="text-lg font-semibold">{distribution.status}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Comment</span>
                    <span className="text-lg font-semibold">{distribution.comment || "\u2014"}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Default Root Object</span>
                    <span className="text-lg font-semibold">{distribution.defaultRootObject || "\u2014"}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Enabled</span>
                    <span className="text-lg font-semibold">{distribution.enabled ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <span className="text-xs font-medium text-muted-foreground">Last Modified</span>
                    <span className="text-lg font-semibold">{formatTimestamp(distribution.lastModified)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Origins Tab */}
          <TabsContent value="origins">
            <Card>
              <CardHeader>
                <CardTitle>Origins</CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.origins && distribution.origins.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Domain Name</TableHead>
                        <TableHead>Origin Path</TableHead>
                        <TableHead>Protocol Policy</TableHead>
                        <TableHead>HTTP Port</TableHead>
                        <TableHead>HTTPS Port</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distribution.origins.map((origin) => (
                        <TableRow key={origin.id}>
                          <TableCell className="font-medium">{origin.id}</TableCell>
                          <TableCell>{origin.domainName}</TableCell>
                          <TableCell>{origin.originPath || "\u2014"}</TableCell>
                          <TableCell>{origin.protocolPolicy}</TableCell>
                          <TableCell>{origin.httpPort ?? "\u2014"}</TableCell>
                          <TableCell>{origin.httpsPort ?? "\u2014"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No origins configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behaviors Tab */}
          <TabsContent value="behaviors">
            <Card>
              <CardHeader>
                <CardTitle>Cache Behaviors</CardTitle>
              </CardHeader>
              <CardContent>
                {allBehaviors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path Pattern</TableHead>
                        <TableHead>Target Origin</TableHead>
                        <TableHead>Viewer Protocol Policy</TableHead>
                        <TableHead>Allowed Methods</TableHead>
                        <TableHead>TTLs (default/max/min)</TableHead>
                        <TableHead>Compress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBehaviors.map((behavior) => (
                        <TableRow key={`${behavior.pathPattern}-${behavior.targetOriginId}`}>
                          <TableCell className="font-medium">
                            {behavior.pathPattern}
                            {behavior.pathPattern === "*" && (
                              <Badge variant="outline" className="ml-2">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>{behavior.targetOriginId}</TableCell>
                          <TableCell>{behavior.viewerProtocolPolicy}</TableCell>
                          <TableCell>{behavior.allowedMethods?.join(", ") ?? "\u2014"}</TableCell>
                          <TableCell>
                            {behavior.defaultTTL} / {behavior.maxTTL} / {behavior.minTTL}
                          </TableCell>
                          <TableCell>
                            <Badge variant={behavior.compress ? "default" : "secondary"}>
                              {behavior.compress ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No cache behaviors configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invalidations Tab */}
          <TabsContent value="invalidations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invalidations</CardTitle>
                  <Button onClick={() => setInvalidationDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invalidation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invalidations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Paths</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidations.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.id}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === "Completed" ? "default" : "secondary"}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTimestamp(inv.createTime)}</TableCell>
                          <TableCell>{inv.paths.join(", ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No invalidations</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Distribution</DialogTitle>
            <DialogDescription>
              Update the configuration for distribution{" "}
              <strong>{distributionId}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-comment">Comment</Label>
              <Input
                id="update-comment"
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                placeholder="Distribution comment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-root-object">Default Root Object</Label>
              <Input
                id="update-root-object"
                value={updateDefaultRootObject}
                onChange={(e) => setUpdateDefaultRootObject(e.target.value)}
                placeholder="e.g. index.html"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="update-enabled"
                checked={updateEnabled}
                onCheckedChange={setUpdateEnabled}
              />
              <Label htmlFor="update-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updateDistribution.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateDistribution.isPending}
            >
              {updateDistribution.isPending ? "Updating..." : "Update Distribution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Distribution</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete distribution{" "}
              <strong>{distributionId}</strong>? You must disable the
              distribution before it can be deleted. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteDistribution.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDistribution.isPending}
            >
              {deleteDistribution.isPending ? "Deleting..." : "Delete Distribution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invalidation Dialog */}
      <Dialog open={invalidationDialogOpen} onOpenChange={setInvalidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invalidation</DialogTitle>
            <DialogDescription>
              Enter the paths to invalidate, one per line (e.g. /images/*).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invalidation-paths">Paths</Label>
              <Textarea
                id="invalidation-paths"
                value={invalidationPaths}
                onChange={(e) => setInvalidationPaths(e.target.value)}
                placeholder={"/images/*\n/css/*\n/index.html"}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInvalidationDialogOpen(false)}
              disabled={createInvalidation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvalidation}
              disabled={createInvalidation.isPending}
            >
              {createInvalidation.isPending ? "Creating..." : "Create Invalidation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
