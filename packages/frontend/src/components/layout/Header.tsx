import { Menu, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouterState } from "@tanstack/react-router";
import { RegionSelector } from "@/components/settings/RegionSelector";
import { useHealthCheck } from "@/api/config";
import { useConfigStore } from "@/stores/config";
import { cn } from "@/lib/utils";

function ConnectionIndicator() {
  const { data, isLoading } = useHealthCheck();
  const setEndpointModalOpen = useConfigStore((s) => s.setEndpointModalOpen);

  const connected = data?.connected ?? false;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setEndpointModalOpen(true)}
      title={useConfigStore.getState().endpoint}
    >
      <div className="relative">
        <Server className="h-4 w-4" />
        {!isLoading && (
          <span
            className={cn(
              "absolute -right-1 -top-1 h-2 w-2 rounded-full",
              connected ? "bg-green-500" : "bg-red-500"
            )}
          />
        )}
      </div>
    </Button>
  );
}

export function Header() {
  const { toggleSidebar } = useAppStore();
  const routerState = useRouterState();
  const pathSegments = routerState.location.pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
            <BreadcrumbItem key={segment}>
              <BreadcrumbSeparator />
              <BreadcrumbLink
                href={`/${pathSegments.slice(0, index + 1).join("/")}`}
              >
                {decodeURIComponent(segment)}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <RegionSelector />
        <ConnectionIndicator />
      </div>
    </header>
  );
}
