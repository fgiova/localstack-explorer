import { createFileRoute } from "@tanstack/react-router";
import { TopicDetail } from "@/components/sns/TopicDetail";

export const Route = createFileRoute("/sns/$topicName")({
	component: TopicDetailPage,
});

function TopicDetailPage() {
	const { topicName } = Route.useParams();
	return <TopicDetail topicName={topicName} />;
}
