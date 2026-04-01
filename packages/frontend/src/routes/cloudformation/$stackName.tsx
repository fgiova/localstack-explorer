import { createFileRoute } from "@tanstack/react-router";
import { StackDetail } from "@/components/cloudformation/StackDetail";

export const Route = createFileRoute("/cloudformation/$stackName")({
	component: CloudFormationStackDetailPage,
});

function CloudFormationStackDetailPage() {
	const { stackName } = Route.useParams();
	return <StackDetail stackName={stackName} />;
}
