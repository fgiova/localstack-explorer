import { Badge } from "@/components/ui/badge";

export function TopicList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SNS Topics</h2>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      <p className="text-muted-foreground">
        SNS topic management will be available in a future release.
      </p>
    </div>
  );
}
