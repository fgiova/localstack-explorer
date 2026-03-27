import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessageViewer } from "../../../src/components/sqs/MessageViewer";

// Mock the SQS API hooks
const mockUseReceiveMessages = vi.fn();
const mockUseDeleteMessage = vi.fn();

vi.mock("../../../src/api/sqs", () => ({
  useReceiveMessages: () => mockUseReceiveMessages(),
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
    </QueryClientProvider>
  );
}

describe("MessageViewer", () => {
  const mockDeleteMutate = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteMessage.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it("should render receive messages button", () => {
    mockUseReceiveMessages.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    expect(screen.getByRole("button", { name: /receive messages/i })).toBeInTheDocument();
  });

  it("should render received messages", async () => {
    mockUseReceiveMessages.mockReturnValue({
      data: {
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
      },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    // Click receive to set enabled state
    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(screen.getByText(/ID: msg-001/)).toBeInTheDocument();
      expect(screen.getByText(/ID: msg-002/)).toBeInTheDocument();
      expect(screen.getByText("Hello, World!")).toBeInTheDocument();
      expect(screen.getByText("Another message")).toBeInTheDocument();
    });
  });

  it("should pretty-print JSON body", async () => {
    const jsonBody = '{"key":"value","count":42}';
    mockUseReceiveMessages.mockReturnValue({
      data: {
        messages: [
          {
            messageId: "msg-json-001",
            receiptHandle: "handle-json-001",
            body: jsonBody,
          },
        ],
      },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(screen.getByText(/ID: msg-json-001/)).toBeInTheDocument();
    });

    // The JSON should be pretty-printed and rendered inside a <pre> element
    const preElement = document.querySelector("pre");
    expect(preElement).toBeInTheDocument();
    const prettyJson = JSON.stringify({ key: "value", count: 42 }, null, 2);
    expect(preElement!.textContent).toBe(prettyJson);
  });

  it("should render non-JSON body as plain text", async () => {
    const plainBody = "This is a plain text message, not JSON.";
    mockUseReceiveMessages.mockReturnValue({
      data: {
        messages: [
          {
            messageId: "msg-plain-001",
            receiptHandle: "handle-plain-001",
            body: plainBody,
          },
        ],
      },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(screen.getByText(plainBody)).toBeInTheDocument();
    });

    // Plain text should NOT be inside a <pre> element
    const preElement = document.querySelector("pre");
    expect(preElement).not.toBeInTheDocument();
  });

  it("should call delete mutation when Delete button is clicked", async () => {
    mockUseReceiveMessages.mockReturnValue({
      data: {
        messages: [
          {
            messageId: "msg-del-001",
            receiptHandle: "receipt-handle-to-delete",
            body: "Message to delete",
          },
        ],
      },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(screen.getByText("Message to delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    fireEvent.click(deleteButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith({
      receiptHandle: "receipt-handle-to-delete",
    });
  });

  it("should show message count after receiving", async () => {
    mockUseReceiveMessages.mockReturnValue({
      data: {
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
      },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 messages received/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no messages are available", async () => {
    mockUseReceiveMessages.mockReturnValue({
      data: { messages: [] },
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders();

    fireEvent.click(screen.getByRole("button", { name: /receive messages/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/the queue is empty or no messages are currently visible/i)
      ).toBeInTheDocument();
    });
  });

  it("should show receiving state while fetching", () => {
    mockUseReceiveMessages.mockReturnValue({
      data: undefined,
      isFetching: true,
      refetch: mockRefetch,
    });

    renderWithProviders();

    expect(screen.getByRole("button", { name: /receiving\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receiving\.\.\./i })).toBeDisabled();
  });
});
