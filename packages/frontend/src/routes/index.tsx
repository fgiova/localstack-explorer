import { createFileRoute, Link } from "@tanstack/react-router";
import { HardDrive, MessageSquare, Bell, Shield, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEnabledServices } from "@/api/services";

export const services = [
  { name: "S3", key: "s3", path: "/s3", icon: HardDrive, description: "Simple Storage Service — Manage buckets and objects", color: "text-green-600" },
  { name: "SQS", key: "sqs", path: "/sqs", icon: MessageSquare, description: "Simple Queue Service — Manage message queues", color: "text-blue-600" },
  { name: "SNS", key: "sns", path: "/sns", icon: Bell, description: "Simple Notification Service — Manage topics and subscriptions", color: "text-orange-600" },
  { name: "IAM", key: "iam", path: "/iam", icon: Shield, description: "Identity & Access Management — Manage users, roles, and policies", color: "text-red-600" },
  { name: "CloudFormation", key: "cloudformation", path: "/cloudformation", icon: Layers, description: "Infrastructure as Code — Manage stacks and templates", color: "text-teal-600" },
];

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useEnabledServices();
  const enabledSet = data ? new Set(data.services) : null;

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
        {visibleServices.map((service) => (
          <Link key={service.path} to={service.path} className="block">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                <service.icon className={cn("h-8 w-8", service.color)} />
                <div>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">Click to manage →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
