import { Link, useRouterState } from "@tanstack/react-router";
import { HardDrive, MessageSquare, Bell, Shield, Globe, Layers, Database, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEnabledServices } from "@/api/services";

const services = [
  { name: "S3", key: "s3", path: "/s3", icon: HardDrive, description: "Object Storage" },
  { name: "SQS", key: "sqs", path: "/sqs", icon: MessageSquare, description: "Message Queue" },
  { name: "SNS", key: "sns", path: "/sns", icon: Bell, description: "Notifications" },
  { name: "IAM", key: "iam", path: "/iam", icon: Shield, description: "Identity & Access" },
  { name: "CloudFront", key: "cloudfront", path: "/cloudfront", icon: Globe, description: "CDN" },
  { name: "CloudFormation", key: "cloudformation", path: "/cloudformation", icon: Layers, description: "Infrastructure as Code" },
  { name: "DynamoDB", key: "dynamodb", path: "/dynamodb", icon: Database, description: "NoSQL Database" },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data } = useEnabledServices();
  const enabledSet = data ? new Set(data.services) : null;

  const visibleServices = enabledSet
    ? services.filter((s) => enabledSet.has(s.key))
    : services;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {sidebarOpen && (
          <span className="text-lg font-bold text-sidebar-foreground">LocalStack</span>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </Button>
      </div>
      <Separator />
      <nav className="space-y-1 p-2">
        {visibleServices.map((service) => {
          const isActive = currentPath.startsWith(service.path);
          return (
            <Link
              key={service.path}
              to={service.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <service.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span>{service.name}</span>
                  <span className="text-xs text-muted-foreground">{service.description}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
