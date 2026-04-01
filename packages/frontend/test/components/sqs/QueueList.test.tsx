import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueueList } from "../../../src/components/sqs/QueueList";

// Mock the SQS API hooks
const mockUseListQueues = vi.fn();
const mockUseDeleteQueue = vi.fn();
const mockUseCreateQueue = vi.fn();

vi.mock("../../../src/api/sqs", () => ({
	useListQueues: () => mockUseListQueues(),
	useDeleteQueue: () => mockUseDeleteQueue(),
	useCreateQueue: () => mockUseCreateQueue(),
}));

function createTestRouter() {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: QueueList,
	});
	const queueRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/sqs/$queueName",
		component: () => null,
	});
	const routeTree = rootRoute.addChildren([indexRoute, queueRoute]);
	return createRouter({ routeTree, history: createMemoryHistory() });
}

function renderWithProviders() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const router = createTestRouter();

	return render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}

describe("QueueList", () => {
	const mockDeleteMutate = vi.fn();
	const mockCreateMutate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteQueue.mockReturnValue({
			mutate: mockDeleteMutate,
			isPending: false,
		});
		mockUseCreateQueue.mockReturnValue({
			mutate: mockCreateMutate,
			isPending: false,
			isError: false,
			error: null,
		});
	});

	it("should render queue list with data", async () => {
		mockUseListQueues.mockReturnValue({
			data: {
				queues: [
					{
						queueName: "my-queue",
						queueUrl: "http://localhost:4566/000000000000/my-queue",
					},
					{
						queueName: "other-queue",
						queueUrl: "http://localhost:4566/000000000000/other-queue",
					},
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("my-queue")).toBeInTheDocument();
		});
		expect(screen.getByText("other-queue")).toBeInTheDocument();
	});

	it("should show loading state", async () => {
		mockUseListQueues.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});
	});

	it("should show error state", async () => {
		mockUseListQueues.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Connection refused"),
		});
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText(/error loading queues/i)).toBeInTheDocument();
		});
	});

	it("should filter queues by search term", async () => {
		mockUseListQueues.mockReturnValue({
			data: {
				queues: [
					{
						queueName: "alpha-queue",
						queueUrl: "http://localhost:4566/000000000000/alpha-queue",
					},
					{
						queueName: "beta-queue",
						queueUrl: "http://localhost:4566/000000000000/beta-queue",
					},
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText("alpha-queue")).toBeInTheDocument();
		});

		const searchInput = screen.getByPlaceholderText("Search queues...");
		fireEvent.change(searchInput, { target: { value: "alpha" } });

		expect(screen.getByText("alpha-queue")).toBeInTheDocument();
		expect(screen.queryByText("beta-queue")).not.toBeInTheDocument();
	});

	it("should open create dialog when Create Queue button is clicked", async () => {
		mockUseListQueues.mockReturnValue({
			data: { queues: [] },
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /create queue/i }),
			).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /create queue/i }));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("my-queue-name")).toBeInTheDocument();
		});
	});

	it("should submit create queue form", async () => {
		mockUseListQueues.mockReturnValue({
			data: { queues: [] },
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText(/create queue/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText(/create queue/i));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("my-queue-name")).toBeInTheDocument();
		});

		const input = screen.getByPlaceholderText("my-queue-name");
		fireEvent.change(input, { target: { value: "new-test-queue" } });

		const submitButton = screen.getByRole("button", { name: /^create$/i });
		fireEvent.click(submitButton);

		expect(mockCreateMutate).toHaveBeenCalledWith(
			{ name: "new-test-queue" },
			expect.any(Object),
		);
	});

	it("should open delete confirmation dialog when trash icon is clicked", async () => {
		mockUseListQueues.mockReturnValue({
			data: {
				queues: [
					{
						queueName: "test-queue",
						queueUrl: "http://localhost:4566/000000000000/test-queue",
					},
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText("test-queue")).toBeInTheDocument();
		});

		const trashButton = document
			.querySelector("svg.text-destructive")
			?.closest("button");
		if (trashButton) fireEvent.click(trashButton);

		await waitFor(() => {
			expect(
				screen.getByText(/are you sure you want to delete queue/i),
			).toBeInTheDocument();
		});
	});

	it("should call delete mutation when delete is confirmed", async () => {
		mockUseListQueues.mockReturnValue({
			data: {
				queues: [
					{
						queueName: "test-queue",
						queueUrl: "http://localhost:4566/000000000000/test-queue",
					},
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText("test-queue")).toBeInTheDocument();
		});

		const trashButton = document
			.querySelector("svg.text-destructive")
			?.closest("button");
		if (trashButton) fireEvent.click(trashButton);

		await waitFor(() => {
			expect(
				screen.getByText(/are you sure you want to delete queue/i),
			).toBeInTheDocument();
		});

		const confirmDeleteButton = screen.getByRole("button", {
			name: /^delete$/i,
		});
		fireEvent.click(confirmDeleteButton);

		expect(mockDeleteMutate).toHaveBeenCalledWith(
			"test-queue",
			expect.any(Object),
		);
	});
});
