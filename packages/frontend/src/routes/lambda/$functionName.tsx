import { createFileRoute } from "@tanstack/react-router";
import { FunctionDetail } from "@/components/lambda/FunctionDetail";

export const Route = createFileRoute("/lambda/$functionName")({
	component: LambdaFunctionDetailPage,
});

function LambdaFunctionDetailPage() {
	const { functionName } = Route.useParams();
	return <FunctionDetail functionName={functionName} />;
}
