import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/iam/UserList";
import { GroupList } from "@/components/iam/GroupList";
import { PolicyList } from "@/components/iam/PolicyList";

export const Route = createFileRoute("/iam/")({
  component: IAMPage,
});

function IAMPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">IAM</h1>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserList />
        </TabsContent>
        <TabsContent value="groups">
          <GroupList />
        </TabsContent>
        <TabsContent value="policies">
          <PolicyList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
