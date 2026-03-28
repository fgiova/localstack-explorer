import { createFileRoute } from "@tanstack/react-router";
import { TableList } from "@/components/dynamodb/TableList";

export const Route = createFileRoute("/dynamodb/")({
  component: DynamoDBPage,
});

function DynamoDBPage() {
  return <TableList />;
}
