import { Badge } from "@/components/ui/badge";

export function DistributionList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CloudFront Distributions</h2>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      <p className="text-muted-foreground">
        CloudFront distribution management will be available in a future release.
      </p>
    </div>
  );
}
