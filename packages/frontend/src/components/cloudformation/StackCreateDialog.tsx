import { useState, useCallback } from "react";
import { useCreateStack } from "@/api/cloudformation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import { Plus, Trash2 } from "lucide-react";

interface StackCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParameterEntry {
  id: number;
  key: string;
  value: string;
}

let nextParamId = 0;

function tryExtractParameters(templateBody: string): string[] {
  try {
    const parsed = JSON.parse(templateBody);
    const params = parsed?.Parameters;
    if (params && typeof params === "object") {
      return Object.keys(params);
    }
  } catch {
    // Not valid JSON, try YAML-like extraction (simple key detection)
    try {
      const lines = templateBody.split("\n");
      const paramNames: string[] = [];
      let inParameters = false;
      let baseIndent = -1;
      for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed === "" || trimmed.startsWith("#")) continue;
        const indent = line.length - trimmed.length;
        if (/^Parameters\s*:/.test(trimmed)) {
          inParameters = true;
          baseIndent = indent;
          continue;
        }
        if (inParameters) {
          // A top-level key at the same indent as Parameters ends the section
          if (indent <= baseIndent && trimmed.includes(":")) {
            break;
          }
          // Direct children of Parameters (indent == baseIndent + 2 typically)
          if (indent === baseIndent + 2 && trimmed.includes(":")) {
            const name = trimmed.split(":")[0].trim();
            if (name) paramNames.push(name);
          }
        }
      }
      if (paramNames.length > 0) return paramNames;
    } catch {
      // ignore
    }
  }
  return [];
}

function detectLanguage(templateBody: string): string {
  const trimmed = templateBody.trimStart();
  if (trimmed.startsWith("{")) return "json";
  if (trimmed.startsWith("AWSTemplateFormatVersion") || trimmed.startsWith("---") || trimmed.startsWith("Resources")) {
    return "yaml";
  }
  return "json";
}

export function StackCreateDialog({ open, onOpenChange }: StackCreateDialogProps) {
  const [stackName, setStackName] = useState("");
  const [templateSource, setTemplateSource] = useState<"body" | "url">("body");
  const [templateBody, setTemplateBody] = useState("");
  const [templateURL, setTemplateURL] = useState("");
  const [parameters, setParameters] = useState<ParameterEntry[]>([]);
  const [editorLanguage, setEditorLanguage] = useState("json");

  const createStack = useCreateStack();

  const resetForm = useCallback(() => {
    setStackName("");
    setTemplateSource("body");
    setTemplateBody("");
    setTemplateURL("");
    setParameters([]);
    setEditorLanguage("json");
  }, []);

  const handleTemplateChange = useCallback((value: string | undefined) => {
    const body = value ?? "";
    setTemplateBody(body);
    setEditorLanguage(detectLanguage(body));

    const paramNames = tryExtractParameters(body);
    if (paramNames.length > 0) {
      setParameters((prev) => {
        const existingKeys = new Set(prev.map((p) => p.key));
        const merged = [...prev];
        for (const name of paramNames) {
          if (!existingKeys.has(name)) {
            merged.push({ id: nextParamId++, key: name, value: "" });
          }
        }
        return merged;
      });
    }
  }, []);

  const addParameter = () => {
    setParameters((prev) => [...prev, { id: nextParamId++, key: "", value: "" }]);
  };

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: "key" | "value", val: string) => {
    setParameters((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stackName.trim()) return;

    const body: {
      stackName: string;
      templateBody?: string;
      templateURL?: string;
      parameters?: { parameterKey: string; parameterValue: string }[];
    } = {
      stackName: stackName.trim(),
    };

    if (templateSource === "body") {
      body.templateBody = templateBody;
    } else {
      body.templateURL = templateURL.trim();
    }

    const filteredParams = parameters.filter((p) => p.key.trim());
    if (filteredParams.length > 0) {
      body.parameters = filteredParams.map((p) => ({
        parameterKey: p.key.trim(),
        parameterValue: p.value,
      }));
    }

    createStack.mutate(body, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Stack</DialogTitle>
          <DialogDescription>
            Define a new CloudFormation stack with a template and optional parameters.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Stack Name */}
            <div className="space-y-2">
              <Label htmlFor="stack-name">Stack Name</Label>
              <Input
                id="stack-name"
                placeholder="my-stack-name"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Template Source */}
            <div className="space-y-2">
              <Label>Template Source</Label>
              <Tabs
                value={templateSource}
                onValueChange={(v) => setTemplateSource(v as "body" | "url")}
              >
                <TabsList>
                  <TabsTrigger value="body">Template Body</TabsTrigger>
                  <TabsTrigger value="url">Template URL</TabsTrigger>
                </TabsList>
                <TabsContent value="body">
                  <div className="rounded-md border overflow-hidden">
                    <Editor
                      height="300px"
                      language={editorLanguage}
                      theme="vs-dark"
                      value={templateBody}
                      onChange={handleTemplateChange}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        tabSize: 2,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="url">
                  <Input
                    placeholder="https://s3.amazonaws.com/mybucket/mytemplate.json"
                    value={templateURL}
                    onChange={(e) => setTemplateURL(e.target.value)}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Parameters</Label>
                <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Parameter
                </Button>
              </div>
              {parameters.length > 0 && (
                <div className="space-y-2">
                  {parameters.map((param, index) => (
                    <div key={param.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Parameter key"
                        value={param.key}
                        onChange={(e) => updateParameter(index, "key", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateParameter(index, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error display */}
            {createStack.isError && (
              <p className="text-sm text-destructive">
                {createStack.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !stackName.trim() ||
                (templateSource === "body" && !templateBody.trim()) ||
                (templateSource === "url" && !templateURL.trim()) ||
                createStack.isPending
              }
            >
              {createStack.isPending ? "Creating..." : "Create Stack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
