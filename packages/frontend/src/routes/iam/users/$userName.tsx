import { createFileRoute } from "@tanstack/react-router";
import { UserDetail } from "@/components/iam/UserDetail";

export const Route = createFileRoute("/iam/users/$userName")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userName } = Route.useParams();
  return <UserDetail userName={userName} />;
}
