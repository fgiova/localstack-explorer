import { createFileRoute } from "@tanstack/react-router";
import { PolicyDetail } from "@/components/iam/PolicyDetail";

export const Route = createFileRoute("/iam/policies/$policyArn")({
  component: PolicyDetailPage,
});

function PolicyDetailPage() {
  const { policyArn } = Route.useParams();
  return <PolicyDetail policyArn={decodeURIComponent(policyArn)} />;
}
