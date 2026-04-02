import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Bell,
	Database,
	HardDrive,
	Layers,
	MessageSquare,
	Shield,
} from "lucide-react";
import { useHealthCheck } from "@/api/config";
import { useEnabledServices } from "@/api/services";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const services = [
	{
		name: "S3",
		key: "s3",
		path: "/s3",
		icon: HardDrive,
		description: "Simple Storage Service — Manage buckets and objects",
		color: "text-green-600",
	},
	{
		name: "SQS",
		key: "sqs",
		path: "/sqs",
		icon: MessageSquare,
		description: "Simple Queue Service — Manage message queues",
		color: "text-blue-600",
	},
	{
		name: "SNS",
		key: "sns",
		path: "/sns",
		icon: Bell,
		description:
			"Simple Notification Service — Manage topics and subscriptions",
		color: "text-orange-600",
	},
	{
		name: "IAM",
		key: "iam",
		path: "/iam",
		icon: Shield,
		description:
			"Identity & Access Management — Manage users, roles, and policies",
		color: "text-red-600",
	},
	{
		name: "DynamoDB",
		key: "dynamodb",
		path: "/dynamodb",
		icon: Database,
		description: "NoSQL Database — Manage tables, items, and queries",
		color: "text-purple-600",
	},
	{
		name: "CloudFormation",
		key: "cloudformation",
		path: "/cloudformation",
		icon: Layers,
		description: "Infrastructure as Code — Manage stacks and templates",
		color: "text-teal-600",
	},
];

export const Route = createFileRoute("/")({
	component: Dashboard,
});

function Dashboard() {
	const { data } = useEnabledServices();
	const { data: healthData } = useHealthCheck();
	const enabledSet = data ? new Set(data.services) : null;
	const activeSet = healthData?.services
		? new Set(healthData.services)
		: null;

	const visibleServices = enabledSet
		? services.filter((s) => enabledSet.has(s.key))
		: services;

	return (
		<div>
			<h1 className="mb-6 text-3xl font-bold">LocalStack Explorer</h1>
			<p className="mb-8 text-muted-foreground">
				Manage your LocalStack resources from a single dashboard.
			</p>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{visibleServices.map((service) => {
					const isServiceActive =
						!activeSet || activeSet.has(service.key);

					if (!isServiceActive) {
						return (
							<div key={service.path} className="block">
								<Card className="opacity-40 cursor-not-allowed">
									<CardHeader className="flex flex-row items-center gap-4">
										<service.icon
											className={cn("h-8 w-8", service.color)}
										/>
										<div>
											<CardTitle>{service.name}</CardTitle>
											<CardDescription>
												Service not active on LocalStack
											</CardDescription>
										</div>
									</CardHeader>
									<CardContent>
										<span className="text-sm text-muted-foreground">
											Not available
										</span>
									</CardContent>
								</Card>
							</div>
						);
					}

					return (
						<Link key={service.path} to={service.path} className="block">
							<Card className="transition-shadow hover:shadow-lg">
								<CardHeader className="flex flex-row items-center gap-4">
									<service.icon
										className={cn("h-8 w-8", service.color)}
									/>
									<div>
										<CardTitle>{service.name}</CardTitle>
										<CardDescription>
											{service.description}
										</CardDescription>
									</div>
								</CardHeader>
								<CardContent>
									<span className="text-sm text-muted-foreground">
										Click to manage →
									</span>
								</CardContent>
							</Card>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
