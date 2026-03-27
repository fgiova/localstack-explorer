import { createFileRoute } from "@tanstack/react-router";
import { QueueList } from "@/components/sqs/QueueList";

export const Route = createFileRoute("/sqs/")({
  component: SQSPage,
});

function SQSPage() {
  return <QueueList />;
}
