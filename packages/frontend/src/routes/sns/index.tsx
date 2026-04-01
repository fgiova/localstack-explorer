import { createFileRoute } from "@tanstack/react-router";
import { TopicList } from "@/components/sns/TopicList";

export const Route = createFileRoute("/sns/")({
	component: SNSPage,
});

function SNSPage() {
	return <TopicList />;
}
