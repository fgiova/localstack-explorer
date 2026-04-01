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
import { BucketList } from "../../../src/components/s3/BucketList";

// Mock the S3 API hooks
const mockUseListBuckets = vi.fn();
const mockUseDeleteBucket = vi.fn();
const mockUseCreateBucket = vi.fn();

vi.mock("../../../src/api/s3", () => ({
	useListBuckets: () => mockUseListBuckets(),
	useDeleteBucket: () => mockUseDeleteBucket(),
	useCreateBucket: () => mockUseCreateBucket(),
}));

function createTestRouter() {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: BucketList,
	});
	const bucketRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/s3/$bucketName",
		component: () => null,
	});
	const routeTree = rootRoute.addChildren([indexRoute, bucketRoute]);
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

describe("BucketList", () => {
	const mockDeleteMutate = vi.fn();
	const mockCreateMutate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteBucket.mockReturnValue({
			mutate: mockDeleteMutate,
			isPending: false,
		});
		mockUseCreateBucket.mockReturnValue({
			mutate: mockCreateMutate,
			isPending: false,
			isError: false,
			error: null,
		});
	});

	it("should show loading state", async () => {
		mockUseListBuckets.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});
	});

	it("should show bucket list when data is available", async () => {
		mockUseListBuckets.mockReturnValue({
			data: {
				buckets: [
					{ name: "my-bucket", creationDate: "2024-01-01T00:00:00.000Z" },
					{ name: "other-bucket", creationDate: "2024-02-01T00:00:00.000Z" },
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("my-bucket")).toBeInTheDocument();
		});
		expect(screen.getByText("other-bucket")).toBeInTheDocument();
	});

	it("should show empty state when no buckets exist", async () => {
		mockUseListBuckets.mockReturnValue({
			data: { buckets: [] },
			isLoading: false,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(
				screen.getByText("No buckets found. Create one to get started."),
			).toBeInTheDocument();
		});
	});

	it("should show error state", async () => {
		mockUseListBuckets.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Connection refused"),
		});
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText(/error loading buckets/i)).toBeInTheDocument();
		});
	});

	it("should have Create Bucket button", async () => {
		mockUseListBuckets.mockReturnValue({
			data: { buckets: [] },
			isLoading: false,
			error: null,
		});
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText(/create bucket/i)).toBeInTheDocument();
		});
	});

	it("should filter buckets by search term", async () => {
		mockUseListBuckets.mockReturnValue({
			data: {
				buckets: [
					{ name: "alpha-bucket", creationDate: "2024-01-01T00:00:00.000Z" },
					{ name: "beta-bucket", creationDate: "2024-02-01T00:00:00.000Z" },
				],
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders();

		await waitFor(() => {
			expect(screen.getByText("alpha-bucket")).toBeInTheDocument();
		});

		const searchInput = screen.getByPlaceholderText("Search buckets...");
		fireEvent.change(searchInput, { target: { value: "alpha" } });

		expect(screen.getByText("alpha-bucket")).toBeInTheDocument();
		expect(screen.queryByText("beta-bucket")).not.toBeInTheDocument();
	});
});
