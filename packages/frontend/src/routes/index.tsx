import { createFileRoute, Link } from "@tanstack/react-router";
import { HardDrive, MessageSquare, Bell, Shield, Globe, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const services = [
  { name: "S3", path: "/s3", icon: HardDrive, description: "Simple Storage Service — Manage buckets and objects", color: "text-green-600" },
  { name: "SQS", path: "/sqs", icon: MessageSquare, description: "Simple Queue Service — Manage message queues", color: "text-blue-600" },
  { name: "SNS", path: "/sns", icon: Bell, description: "Simple Notification Service — Manage topics and subscriptions", color: "text-orange-600" },
  { name: "IAM", path: "/iam", icon: Shield, description: "Identity & Access Management — Manage users, roles, and policies", color: "text-red-600" },
  { name: "CloudFront", path: "/cloudfront", icon: Globe, description: "Content Delivery Network — Manage distributions", color: "text-purple-600" },
  { name: "CloudFormation", path: "/cloudformation", icon: Layers, description: "Infrastructure as Code — Manage stacks and templates", color: "text-teal-600" },
];

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">LocalStack Explorer</h1>
      <p className="mb-8 text-muted-foreground">
        Manage your LocalStack resources from a single dashboard.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
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
