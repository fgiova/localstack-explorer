import Editor from "@monaco-editor/react";
import { useGetTemplate } from "@/api/cloudformation";

interface TemplateViewerProps {
	stackName: string;
}

function detectLanguage(template: string): string {
	const trimmed = template.trimStart();
	if (trimmed.startsWith("{")) return "json";
	return "yaml";
}

export function TemplateViewer({ stackName }: TemplateViewerProps) {
	const { data, isLoading, error } = useGetTemplate(stackName);

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
				Error loading template: {error.message}
			</div>
		);
	}

	const templateBody = data?.templateBody ?? "";
	const language = detectLanguage(templateBody);

	return (
		<div className="rounded-md border overflow-hidden">
			<Editor
				height="500px"
				language={language}
				theme="vs-dark"
				value={templateBody}
				options={{
					readOnly: true,
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					fontSize: 13,
					tabSize: 2,
					wordWrap: "on",
					automaticLayout: true,
				}}
			/>
		</div>
	);
}
