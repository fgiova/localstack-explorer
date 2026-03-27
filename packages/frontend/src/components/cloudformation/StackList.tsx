import { Badge } from "@/components/ui/badge";
import { useListStacks } from "@/api/cloudformation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status.includes("COMPLETE") && !status.includes("ROLLBACK")) return "default";
  if (status.includes("IN_PROGRESS")) return "secondary";
  if (status.includes("ROLLBACK") || status.includes("FAILED")) return "destructive";
  return "outline";
};

export function StackList() {
  const { data, isLoading, error } = useListStacks();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading stacks...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error loading stacks: {error.message}</p>;
  }

  const stacks = data?.stacks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CloudFormation Stacks</h2>
        <Badge variant="secondary">{stacks.length} stacks</Badge>
      </div>

      {stacks.length === 0 ? (
        <p className="text-muted-foreground">No stacks found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stacks.map((stack) => (
              <TableRow key={stack.stackId ?? stack.stackName}>
                <TableCell className="font-medium">{stack.stackName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(stack.status)}>{stack.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {stack.creationTime ? new Date(stack.creationTime).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {stack.lastUpdatedTime ? new Date(stack.lastUpdatedTime).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{stack.description ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
