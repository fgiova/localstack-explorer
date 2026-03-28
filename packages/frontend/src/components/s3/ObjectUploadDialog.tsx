import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { useUploadObject } from "@/api/s3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface ObjectUploadDialogProps {
  bucketName: string;
  prefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObjectUploadDialog({ bucketName, prefix, open, onOpenChange }: ObjectUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [customKey, setCustomKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadObject = useUploadObject(bucketName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const key = customKey.trim() || `${prefix}${file.name}`;
    uploadObject.mutate(
      { file, key },
      {
        onSuccess: () => {
          setFile(null);
          setCustomKey("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Object</DialogTitle>
          <DialogDescription>
            Upload a file to {bucketName}/{prefix}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-transparent p-8 transition-colors hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : "Click or drop a file here"}
              </p>
              {file && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </button>
            <div>
              <label className="text-sm font-medium" htmlFor="object-key-input">Object key (optional)</label>
              <Input
                id="object-key-input"
                placeholder={file ? `${prefix}${file.name}` : "custom/path/filename.ext"}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
              />
            </div>
            {uploadObject.isError && (
              <p className="text-sm text-destructive">{uploadObject.error.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!file || uploadObject.isPending}>
              {uploadObject.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
