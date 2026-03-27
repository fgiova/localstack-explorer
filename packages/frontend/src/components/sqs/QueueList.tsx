import { Badge } from "@/components/ui/badge";

export function QueueList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SQS Queues</h2>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      <p className="text-muted-foreground">
        SQS queue management will be available in a future release.
      </p>
    </div>
  );
}
