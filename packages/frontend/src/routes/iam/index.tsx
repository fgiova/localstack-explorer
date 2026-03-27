import { createFileRoute } from "@tanstack/react-router";
import { UserList } from "@/components/iam/UserList";

export const Route = createFileRoute("/iam/")({
  component: IAMPage,
});

function IAMPage() {
  return <UserList />;
}
