import { createFileRoute } from "@tanstack/react-router";
import { DistributionList } from "@/components/cloudfront/DistributionList";

export const Route = createFileRoute("/cloudfront/")({
  component: CloudFrontPage,
});

function CloudFrontPage() {
  return <DistributionList />;
}
