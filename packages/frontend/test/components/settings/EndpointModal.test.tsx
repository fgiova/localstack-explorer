import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndpointModal } from "../../../src/components/settings/EndpointModal";
import { useConfigStore } from "../../../src/stores/config";

function renderWithProviders() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return {
		queryClient,
		...render(
			<QueryClientProvider client={queryClient}>
				<EndpointModal />
			</QueryClientProvider>,
		),
	};
}

describe("EndpointModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useConfigStore.setState({
			endpoint: "http://localhost:4566",
			region: "us-east-1",
			endpointModalOpen: false,
			userDismissedModal: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("does not render dialog content when endpointModalOpen is false", () => {
		useConfigStore.setState({ endpointModalOpen: false });
		renderWithProviders();

		expect(screen.queryByText("LocalStack Endpoint")).not.toBeInTheDocument();
	});

	it("renders dialog when endpointModalOpen is true", () => {
		useConfigStore.setState({ endpointModalOpen: true });
		renderWithProviders();

		expect(screen.getByText("LocalStack Endpoint")).toBeInTheDocument();
		expect(
			screen.getByText(/Enter the URL of your LocalStack instance/i),
		).toBeInTheDocument();
	});

	it("input shows the current endpoint value", () => {
		useConfigStore.setState({
			endpoint: "http://localhost:4566",
			endpointModalOpen: true,
		});
		renderWithProviders();

		const input = screen.getByPlaceholderText(
			"http://localhost:4566",
		) as HTMLInputElement;
		expect(input.value).toBe("http://localhost:4566");
	});

	it("Test Connection button triggers fetch to /api/health", async () => {
		useConfigStore.setState({ endpointModalOpen: true });

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				connected: true,
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		renderWithProviders();

		const testButton = screen.getByRole("button", { name: /test connection/i });
		fireEvent.click(testButton);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/health",
				expect.objectContaining({
					headers: expect.objectContaining({
						"x-localstack-endpoint": "http://localhost:4566",
					}),
				}),
			);
		});
	});

	it("Save button is disabled before a successful test connection", () => {
		useConfigStore.setState({ endpointModalOpen: true });
		renderWithProviders();

		const saveButton = screen.getByRole("button", { name: /^save$/i });
		expect(saveButton).toBeDisabled();
	});

	it("Save button becomes enabled after a successful test connection", async () => {
		useConfigStore.setState({ endpointModalOpen: true });

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				connected: true,
				endpoint: "http://localhost:4566",
				region: "us-east-1",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		renderWithProviders();

		const saveButton = screen.getByRole("button", { name: /^save$/i });
		expect(saveButton).toBeDisabled();

		const testButton = screen.getByRole("button", { name: /test connection/i });
		fireEvent.click(testButton);

		await waitFor(() => {
			expect(screen.getByText(/connected successfully/i)).toBeInTheDocument();
		});

		expect(saveButton).not.toBeDisabled();
	});

	it("shows error message when test connection fails", async () => {
		useConfigStore.setState({ endpointModalOpen: true });

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				connected: false,
				endpoint: "http://localhost:4566",
				region: "us-east-1",
				error: "Connection refused",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		renderWithProviders();

		const testButton = screen.getByRole("button", { name: /test connection/i });
		fireEvent.click(testButton);

		await waitFor(() => {
			expect(screen.getByText("Connection refused")).toBeInTheDocument();
		});
	});

	it("shows error message when fetch throws", async () => {
		useConfigStore.setState({ endpointModalOpen: true });

		const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
		vi.stubGlobal("fetch", mockFetch);

		renderWithProviders();

		const testButton = screen.getByRole("button", { name: /test connection/i });
		fireEvent.click(testButton);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("Cancel button calls dismissModal", () => {
		useConfigStore.setState({
			endpointModalOpen: true,
			userDismissedModal: false,
		});
		renderWithProviders();

		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		fireEvent.click(cancelButton);

		const state = useConfigStore.getState();
		expect(state.endpointModalOpen).toBe(false);
		expect(state.userDismissedModal).toBe(true);
	});

	it("Save button saves endpoint and closes modal after successful test", async () => {
		useConfigStore.setState({
			endpoint: "http://localhost:4566",
			endpointModalOpen: true,
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				connected: true,
				endpoint: "http://localhost:9999",
				region: "us-east-1",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		renderWithProviders();

		// Change the endpoint input
		const input = screen.getByPlaceholderText("http://localhost:4566");
		fireEvent.change(input, { target: { value: "http://localhost:9999" } });

		// Test connection
		const testButton = screen.getByRole("button", { name: /test connection/i });
		fireEvent.click(testButton);

		await waitFor(() => {
			expect(screen.getByText(/connected successfully/i)).toBeInTheDocument();
		});

		// Save
		const saveButton = screen.getByRole("button", { name: /^save$/i });
		fireEvent.click(saveButton);

		expect(useConfigStore.getState().endpoint).toBe("http://localhost:9999");
		expect(useConfigStore.getState().endpointModalOpen).toBe(false);
	});
});
