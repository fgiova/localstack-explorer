import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegionSelector } from "../../../src/components/settings/RegionSelector";
import { useConfigStore } from "../../../src/stores/config";

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegionSelector />
    </QueryClientProvider>
  );
}

describe("RegionSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to known state
    useConfigStore.setState({
      endpoint: "http://localhost:4566",
      region: "us-east-1",
      endpointModalOpen: false,
      userDismissedModal: false,
    });
  });

  it("renders with the current region displayed", () => {
    useConfigStore.setState({ region: "eu-west-1" });
    renderWithProviders();

    const _select = screen.getByRole("combobox", { hidden: true });
    // The select element is a native <select>, check via aria-label
    const selectEl = screen.getByLabelText("AWS Region") as HTMLSelectElement;
    expect(selectEl.value).toBe("eu-west-1");
  });

  it("renders all 30 region options", () => {
    renderWithProviders();

    const selectEl = screen.getByLabelText("AWS Region") as HTMLSelectElement;
    const options = Array.from(selectEl.options);
    expect(options).toHaveLength(30);

    const sampleRegions = [
      "us-east-1",
      "eu-central-1",
      "ap-northeast-1",
      "sa-east-1",
      "af-south-1",
      "me-south-1",
      "il-central-1",
      "ca-west-1",
    ];

    sampleRegions.forEach((region) => {
      expect(screen.getByRole("option", { name: region })).toBeInTheDocument();
    });
  });

  it("changing selection updates the store region", () => {
    renderWithProviders();

    const selectEl = screen.getByLabelText("AWS Region") as HTMLSelectElement;
    expect(useConfigStore.getState().region).toBe("us-east-1");

    fireEvent.change(selectEl, { target: { value: "ap-northeast-1" } });

    expect(useConfigStore.getState().region).toBe("ap-northeast-1");
  });

  it("changing selection invalidates react-query cache", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <RegionSelector />
      </QueryClientProvider>
    );

    const selectEl = screen.getByLabelText("AWS Region") as HTMLSelectElement;
    fireEvent.change(selectEl, { target: { value: "us-west-2" } });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
