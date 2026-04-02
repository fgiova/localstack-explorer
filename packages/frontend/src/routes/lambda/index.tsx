import { createFileRoute } from "@tanstack/react-router";
import { FunctionList } from "@/components/lambda/FunctionList";

export const Route = createFileRoute("/lambda/")({
	component: LambdaPage,
});

function LambdaPage() {
	return <FunctionList />;
}
