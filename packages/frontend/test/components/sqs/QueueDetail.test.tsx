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
import { QueueDetail } from "../../../src/components/sqs/QueueDetail";

// Mock the SQS API hooks
const mockUseQueueAttributes = vi.fn();
const mockUsePurgeQueue = vi.fn();
const mockUseReceiveMessages = vi.fn();
const mockUseDeleteMessage = vi.fn();
const mockUseSendMessage = vi.fn();
const mockUseUpdateQueueAttributes = vi.fn();

vi.mock("../../../src/api/sqs", () => ({
	useQueueAttributes: () => mockUseQueueAttributes(),
	usePurgeQueue: () => mockUsePurgeQueue(),
	useReceiveMessages: () => mockUseReceiveMessages(),
	useDeleteMessage: () => mockUseDeleteMessage(),
	useSendMessage: () => mockUseSendMessage(),
	useUpdateQueueAttributes: () => mockUseUpdateQueueAttributes(),
}));

const TEST_QUEUE_NAME = "test-queue";

function createTestRouter() {
	const rootRoute = createRootRoute();
	const sqsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/sqs",
		component: () => null,
	});
	const queueDetailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/sqs/$queueName",
		component: () => <QueueDetail queueName={TEST_QUEUE_NAME} />,
	});
	const routeTree = rootRoute.addChildren([sqsRoute, queueDetailRoute]);
	const history = createMemoryHistory({
		initialEntries: [`/sqs/${TEST_QUEUE_NAME}`],
	});
	return createRouter({ routeTree, history });
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

describe("QueueDetail", () => {
	const mockPurgeMutate = vi.fn();
	const mockDeleteMessageMutate = vi.fn();
	const mockSendMessageMutate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUsePurgeQueue.mockReturnValue({
			mutate: mockPurgeMutate,
			isPending: false,
		});
		mockUseReceiveMessages.mockReturnValue({
			data: undefined,
			isFetching: false,
			refetch: vi.fn(),
		});
		mockUseDeleteMessage.mockReturnValue({
			mutate: mockDeleteMessageMutate,
			isPending: false,
		});
		mockUseSendMessage.mockReturnValue({
			mutate: mockSendMessageMutate,
			isPending: false,
			isError: false,
			error: null,
			isSuccess: false,
		});
		mockUseUpdateQueueAttributes.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null,
			isSuccess: false,
		});
	});

	it("should render queue attributes", async () => {
		mockUseQueueAttributes.mockReturnValue({
			data: {
				queueArn: "arn:aws:sqs:us-east-1:000000000000:test-queue",
				approximateNumberOfMessages: 5,
				approximateNumberOfMessagesNotVisible: 2,
				approximateNumberOfMessagesDelayed: 0,
				visibilityTimeout: 30,
				maximumMessageSize: 262144,
				messageRetentionPeriod: 345600,
				delaySeconds: 0,
				createdTimestamp: "1704067200",
			},
			isLoading: false,
			error: null,
		});

		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText(TEST_QUEUE_NAME)).toBeInTheDocument();
		});

		expect(
			screen.getByText("arn:aws:sqs:us-east-1:000000000000:test-queue"),
		).toBeInTheDocument();
		expect(screen.getByText("Messages Available")).toBeInTheDocument();
		expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Messages In Flight")).toBeInTheDocument();
		expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
	});

	it("should show loading state", async () => {
		mockUseQueueAttributes.mockReturnValue({
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
		mockUseQueueAttributes.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Failed to fetch attributes"),
		});

		renderWithProviders();

		await waitFor(() => {
			expect(
				screen.getByText(/error loading queue attributes/i),
			).toBeInTheDocument();
		});
	});

	it("should show purge button", async () => {
		mockUseQueueAttributes.mockReturnValue({
			data: {
				approximateNumberOfMessages: 3,
			},
			isLoading: false,
			error: null,
		});

		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText(/purge queue/i)).toBeInTheDocument();
		});
	});

	it("should open purge confirmation dialog when Purge Queue button is clicked", async () => {
		mockUseQueueAttributes.mockReturnValue({
			data: {
				approximateNumberOfMessages: 3,
			},
			isLoading: false,
			error: null,
		});

		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText(/purge queue/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /purge queue/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/are you sure you want to purge all messages/i),
			).toBeInTheDocument();
		});
	});

	it("should call purge mutation when purge is confirmed", async () => {
		mockUseQueueAttributes.mockReturnValue({
			data: {
				approximateNumberOfMessages: 3,
			},
			isLoading: false,
			error: null,
		});

		renderWithProviders();

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /purge queue/i }),
			).toBeInTheDocument();
		});

		// Open the purge dialog
		fireEvent.click(screen.getByRole("button", { name: /purge queue/i }));

		await waitFor(() => {
			// Confirm the dialog is open by checking for description text
			expect(
				screen.getByText(/are you sure you want to purge all messages/i),
			).toBeInTheDocument();
		});

		// There are now multiple "Purge Queue" buttons — the header button and the confirm button in the dialog.
		// Click the last one (dialog footer confirm button).
		const purgeButtons = screen.getAllByRole("button", {
			name: /purge queue/i,
		});
		fireEvent.click(purgeButtons[purgeButtons.length - 1]);

		expect(mockPurgeMutate).toHaveBeenCalledWith(
			TEST_QUEUE_NAME,
			expect.any(Object),
		);
	});

	it("should cancel purge dialog when Cancel is clicked", async () => {
		mockUseQueueAttributes.mockReturnValue({
			data: {
				approximateNumberOfMessages: 3,
			},
			isLoading: false,
			error: null,
		});

		renderWithProviders();

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /purge queue/i }),
			).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /purge queue/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /cancel/i }),
			).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

		expect(mockPurgeMutate).not.toHaveBeenCalled();
	});
});
