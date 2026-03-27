import { useState } from "react";
import { useCreateQueue } from "@/api/sqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface QueueCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QueueCreateDialog({ open, onOpenChange }: QueueCreateDialogProps) {
  const [name, setName] = useState("");
  const createQueue = useCreateQueue();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createQueue.mutate({ name: name.trim() }, {
      onSuccess: () => {
        setName("");
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Queue</DialogTitle>
          <DialogDescription>
            Enter a name for the new SQS queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              placeholder="my-queue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {createQueue.isError && (
              <p className="mt-2 text-sm text-destructive">
                {createQueue.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createQueue.isPending}>
              {createQueue.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
