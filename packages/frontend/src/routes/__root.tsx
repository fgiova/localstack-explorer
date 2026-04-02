import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConnectionGuard } from "@/components/settings/ConnectionGuard";
import { EndpointModal } from "@/components/settings/EndpointModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const { sidebarOpen } = useAppStore();

	return (
		<TooltipProvider>
			<div className="min-h-screen bg-background">
				<Sidebar />
				<div
					className={cn(
						"transition-all duration-300",
						sidebarOpen ? "ml-64" : "ml-16",
					)}
				>
					<Header />
					<main className="p-6">
						<Outlet />
					</main>
				</div>
				<ConnectionGuard />
				<EndpointModal />
			</div>
		</TooltipProvider>
	);
}
