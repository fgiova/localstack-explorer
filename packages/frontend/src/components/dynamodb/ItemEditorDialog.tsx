import { useState, useEffect } from "react";
import { usePutItem } from "@/api/dynamodb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface ItemEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  mode: "create" | "edit";
  item: Record<string, unknown> | null;
  onSaved: () => void;
}

export function ItemEditorDialog({
  open, onOpenChange, tableName, mode, item, onSaved,
}: ItemEditorDialogProps) {
  const [json, setJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const putItem = usePutItem(tableName);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && item) {
        setJson(JSON.stringify(item, null, 2));
      } else {
        setJson("{\n  \n}");
      }
      setParseError(null);
    }
  }, [open, mode, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        setParseError("Item must be a JSON object");
        return;
      }
      setParseError(null);
      putItem.mutate(parsed, {
        onSuccess: () => {
          onSaved();
          onOpenChange(false);
        },
      });
    } catch {
      setParseError("Invalid JSON");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Item" : "Edit Item"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enter the JSON representation of the new item."
              : "Modify the item JSON and save."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 py-4">
            <Label htmlFor="itemJson">Item JSON</Label>
            <textarea
              id="itemJson"
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setParseError(null);
              }}
              className="h-[300px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              spellCheck={false}
            />
            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}
            {putItem.isError && (
              <p className="text-sm text-destructive">{putItem.error.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={putItem.isPending}>
              {putItem.isPending ? "Saving..." : "Save Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
