import { createFileRoute } from "@tanstack/react-router";
import { StackList } from "@/components/cloudformation/StackList";

export const Route = createFileRoute("/cloudformation/")({
	component: CloudFormationPage,
});

function CloudFormationPage() {
	return <StackList />;
}
