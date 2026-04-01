import { createFileRoute } from "@tanstack/react-router";
import { GroupDetail } from "@/components/iam/GroupDetail";

export const Route = createFileRoute("/iam/groups/$groupName")({
	component: GroupDetailPage,
});

function GroupDetailPage() {
	const { groupName } = Route.useParams();
	return <GroupDetail groupName={groupName} />;
}
