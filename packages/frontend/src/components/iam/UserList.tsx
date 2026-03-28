import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { useListUsers, useDeleteUser } from "@/api/iam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CreateUserDialog } from "./CreateUserDialog";

function truncateArn(arn: string, maxLength = 50): string {
  if (arn.length <= maxLength) return arn;
  return `${arn.slice(0, maxLength - 3)}...`;
}

export function UserList() {
  const { data, isLoading, error } = useListUsers();
  const deleteUser = useDeleteUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filteredUsers = data?.users.filter((u) =>
    u.userName.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4 text-destructive">
        Error loading users: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">IAM Users</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {data?.users.length === 0
            ? "No users found. Create one to get started."
            : "No users match your search."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>ARN</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.userId}>
                <TableCell>
                  <a
                    href={`/iam/users/${user.userName}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {user.userName}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {user.userId}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm" title={user.arn}>
                  {truncateArn(user.arn)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.createDate ? new Date(user.createDate).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(user.userName)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user &quot;{deleteTarget}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteUser.mutate(deleteTarget, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }
              }}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
