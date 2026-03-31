import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { EndpointModal } from "@/components/settings/EndpointModal";
import { ConnectionGuard } from "@/components/settings/ConnectionGuard";
import { useAppStore } from "@/stores/app";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <ConnectionGuard />
      <EndpointModal />
    </div>
  );
}
