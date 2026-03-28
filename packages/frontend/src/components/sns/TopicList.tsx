import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { useListTopics, useDeleteTopic } from "@/api/sns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TopicCreateDialog } from "./TopicCreateDialog";

function truncateArn(arn: string, maxLength = 50): string {
  if (arn.length <= maxLength) return arn;
  return arn.slice(0, maxLength - 3) + "...";
}

export function TopicList() {
  const { data, isLoading, error } = useListTopics();
  const deleteTopic = useDeleteTopic();
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filteredTopics = data?.topics.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

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
        Error loading topics: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SNS Topics</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Topic
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredTopics.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {data?.topics.length === 0
            ? "No topics found. Create one to get started."
            : "No topics match your search."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ARN</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTopics.map((topic) => (
              <TableRow key={topic.topicArn}>
                <TableCell>
                  <a
                    href={`/sns/${topic.name}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {topic.name}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm" title={topic.topicArn}>
                  {truncateArn(topic.topicArn)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(topic.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TopicCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete topic &quot;{deleteTarget}&quot;? This action cannot be undone.
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
                  deleteTopic.mutate(deleteTarget, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }
              }}
              disabled={deleteTopic.isPending}
            >
              {deleteTopic.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
