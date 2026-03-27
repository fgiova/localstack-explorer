import { createFileRoute } from "@tanstack/react-router";
import { QueueDetail } from "@/components/sqs/QueueDetail";

export const Route = createFileRoute("/sqs/$queueName")({
  component: SQSQueueDetailPage,
});

function SQSQueueDetailPage() {
  const { queueName } = Route.useParams();
  return <QueueDetail queueName={queueName} />;
}
