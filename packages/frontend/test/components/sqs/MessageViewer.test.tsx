import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageViewer } from "../../../src/components/sqs/MessageViewer";

// Mock the SQS API
const mockReceiveMessagesPoll = vi.fn();
const mockUseDeleteMessage = vi.fn();

vi.mock("../../../src/api/sqs", () => ({
	receiveMessagesPoll: (...args: unknown[]) => mockReceiveMessagesPoll(...args),
	useDeleteMessage: () => mockUseDeleteMessage(),
}));

const TEST_QUEUE_NAME = "test-queue";

function renderWithProviders() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MessageViewer queueName={TEST_QUEUE_NAME} />
		</QueryClientProvider>,
	);
}

describe("MessageViewer", () => {
	const mockDeleteMutate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteMessage.mockReturnValue({
			mutate: mockDeleteMutate,
			isPending: false,
		});
	});

	it("should render poll button", () => {
		mockReceiveMessagesPoll.mockResolvedValue({ messages: [] });

		renderWithProviders();

		expect(screen.getByRole("button", { name: /poll/i })).toBeInTheDocument();
	});

	it("should render received messages", async () => {
		mockReceiveMessagesPoll.mockResolvedValue({
			messages: [
				{
					messageId: "msg-001",
					receiptHandle: "handle-001",
					body: "Hello, World!",
				},
				{
					messageId: "msg-002",
					receiptHandle: "handle-002",
					body: "Another message",
				},
			],
		});

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(screen.getByText(/ID: msg-001/)).toBeInTheDocument();
			expect(screen.getByText(/ID: msg-002/)).toBeInTheDocument();
			expect(screen.getByText("Hello, World!")).toBeInTheDocument();
			expect(screen.getByText("Another message")).toBeInTheDocument();
		});
	});

	it("should pretty-print JSON body", async () => {
		const jsonBody = '{"key":"value","count":42}';
		mockReceiveMessagesPoll.mockResolvedValue({
			messages: [
				{
					messageId: "msg-json-001",
					receiptHandle: "handle-json-001",
					body: jsonBody,
				},
			],
		});

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(screen.getByText(/ID: msg-json-001/)).toBeInTheDocument();
		});

		const preElement = document.querySelector("pre");
		expect(preElement).toBeInTheDocument();
		const prettyJson = JSON.stringify({ key: "value", count: 42 }, null, 2);
		expect(preElement?.textContent).toBe(prettyJson);
	});

	it("should render non-JSON body as plain text", async () => {
		const plainBody = "This is a plain text message, not JSON.";
		mockReceiveMessagesPoll.mockResolvedValue({
			messages: [
				{
					messageId: "msg-plain-001",
					receiptHandle: "handle-plain-001",
					body: plainBody,
				},
			],
		});

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(screen.getByText(plainBody)).toBeInTheDocument();
		});

		const preElement = document.querySelector("pre");
		expect(preElement).not.toBeInTheDocument();
	});

	it("should call delete mutation when Delete button is clicked", async () => {
		mockReceiveMessagesPoll.mockResolvedValue({
			messages: [
				{
					messageId: "msg-del-001",
					receiptHandle: "receipt-handle-to-delete",
					body: "Message to delete",
				},
			],
		});

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(screen.getByText("Message to delete")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", { name: /^delete$/i });
		fireEvent.click(deleteButton);

		expect(mockDeleteMutate).toHaveBeenCalledWith(
			{ receiptHandle: "receipt-handle-to-delete" },
			expect.any(Object),
		);
	});

	it("should show message count after receiving", async () => {
		mockReceiveMessagesPoll.mockResolvedValue({
			messages: [
				{
					messageId: "msg-count-001",
					receiptHandle: "handle-count-001",
					body: "Message 1",
				},
				{
					messageId: "msg-count-002",
					receiptHandle: "handle-count-002",
					body: "Message 2",
				},
			],
		});

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(screen.getByText(/2 messages/)).toBeInTheDocument();
		});
	});

	it("should show empty state when no messages are available", async () => {
		mockReceiveMessagesPoll.mockResolvedValue({ messages: [] });

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(
				screen.getByText(
					/the queue is empty or no messages are currently visible/i,
				),
			).toBeInTheDocument();
		});
	});

	it("should call receiveMessagesPoll with correct parameters", async () => {
		mockReceiveMessagesPoll.mockResolvedValue({ messages: [] });

		renderWithProviders();

		fireEvent.click(screen.getByRole("button", { name: /poll/i }));

		await waitFor(() => {
			expect(mockReceiveMessagesPoll).toHaveBeenCalledWith(
				TEST_QUEUE_NAME,
				1,
				20,
				expect.any(AbortSignal),
			);
		});
	});
});
