import { createFileRoute } from "@tanstack/react-router";
import { DistributionDetail } from "@/components/cloudfront/DistributionDetail";

export const Route = createFileRoute("/cloudfront/$distributionId")({
  component: CloudFrontDistributionDetailPage,
});

function CloudFrontDistributionDetailPage() {
  const { distributionId } = Route.useParams();
  return <DistributionDetail distributionId={distributionId} />;
}
