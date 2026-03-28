import { useState } from "react";
import { Plus, Trash2, Filter } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTopicSubscriptions, useDeleteSubscription } from "@/api/sns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SubscriptionCreateDialog } from "./SubscriptionCreateDialog";
import { FilterPolicyDialog } from "./FilterPolicyDialog";

interface SubscriptionListProps {
  topicName: string;
}

const protocolColors: Record<string, string> = {
  sqs: "bg-blue-100 text-blue-800 border-blue-200",
  http: "bg-green-100 text-green-800 border-green-200",
  https: "bg-emerald-100 text-emerald-800 border-emerald-200",
  email: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "email-json": "bg-orange-100 text-orange-800 border-orange-200",
  lambda: "bg-purple-100 text-purple-800 border-purple-200",
};

function extractQueueNameFromArn(arn: string): string | null {
  // ARN format: arn:aws:sqs:region:account-id:queue-name
  const parts = arn.split(":");
  if (parts.length >= 6) {
    return parts[parts.length - 1];
  }
  return null;
}

function truncateArn(arn: string, maxLength = 40): string {
  if (arn.length <= maxLength) return arn;
  return arn.slice(0, maxLength - 3) + "...";
}

export function SubscriptionList({ topicName }: SubscriptionListProps) {
  const { data, isLoading, error } = useTopicSubscriptions(topicName);
  const deleteSubscription = useDeleteSubscription(topicName);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterPolicyArn, setFilterPolicyArn] = useState<string | null>(null);

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
        Error loading subscriptions: {error.message}
      </div>
    );
  }

  const subscriptions = data?.subscriptions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subscriptions</h3>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No subscriptions found. Add one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Subscription ARN</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => {
              const queueName = sub.protocol === "sqs" ? extractQueueNameFromArn(sub.endpoint) : null;
              const colorClass = protocolColors[sub.protocol] ?? "bg-gray-100 text-gray-800 border-gray-200";

              return (
                <TableRow key={sub.subscriptionArn}>
                  <TableCell>
                    <Badge className={colorClass}>
                      {sub.protocol}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {sub.protocol === "sqs" && queueName ? (
                      <Link
                        to={"/sqs/$queueName" as string}
                        params={{ queueName }}
                        className="text-primary hover:underline"
                      >
                        {queueName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{sub.endpoint}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm" title={sub.subscriptionArn}>
                    {truncateArn(sub.subscriptionArn)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Filter Policy"
                        onClick={() => setFilterPolicyArn(sub.subscriptionArn)}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Subscription"
                        onClick={() => setDeleteTarget(sub.subscriptionArn)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <SubscriptionCreateDialog
        topicName={topicName}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <FilterPolicyDialog
        subscriptionArn={filterPolicyArn ?? ""}
        open={!!filterPolicyArn}
        onOpenChange={(open) => {
          if (!open) setFilterPolicyArn(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground font-mono break-all py-2">
            {deleteTarget}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteSubscription.mutate(deleteTarget, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }
              }}
              disabled={deleteSubscription.isPending}
            >
              {deleteSubscription.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
