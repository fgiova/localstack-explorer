import { lazy, Suspense, useState } from "react";
import { useCreatePolicy } from "@/api/iam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_POLICY_DOCUMENT = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "*",
        Resource: "*",
      },
    ],
  },
  null,
  2
);

export function CreatePolicyDialog({ open, onOpenChange }: CreatePolicyDialogProps) {
  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");
  const [path, setPath] = useState("");
  const [policyDocument, setPolicyDocument] = useState(DEFAULT_POLICY_DOCUMENT);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const createPolicy = useCreatePolicy();

  const resetForm = () => {
    setPolicyName("");
    setDescription("");
    setPath("");
    setPolicyDocument(DEFAULT_POLICY_DOCUMENT);
    setJsonError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim()) return;

    try {
      JSON.parse(policyDocument);
    } catch {
      setJsonError("Invalid JSON in policy document. Please fix before submitting.");
      return;
    }

    setJsonError(null);

    createPolicy.mutate(
      {
        policyName: policyName.trim(),
        policyDocument,
        ...(description.trim() && { description: description.trim() }),
        ...(path.trim() && { path: path.trim() }),
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Managed Policy</DialogTitle>
          <DialogDescription>
            Define a new IAM policy with a JSON policy document.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="policy-name">Policy Name *</Label>
              <Input
                id="policy-name"
                placeholder="my-policy"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="policy-description">Description (optional)</Label>
              <Input
                id="policy-description"
                placeholder="Policy description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="policy-path">Path (optional)</Label>
              <Input
                id="policy-path"
                placeholder="/"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Policy Document *</Label>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                }
              >
                <div className="overflow-hidden rounded-md border">
                  <MonacoEditor
                    height="300px"
                    language="json"
                    value={policyDocument}
                    onChange={(value) => setPolicyDocument(value ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      readOnly: createPolicy.isPending,
                    }}
                    theme="vs-dark"
                  />
                </div>
              </Suspense>
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
            </div>

            {createPolicy.isError && (
              <p className="text-sm text-destructive">
                {createPolicy.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!policyName.trim() || createPolicy.isPending}
            >
              {createPolicy.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
