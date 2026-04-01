import { beforeEach, describe, expect, it } from "vitest";
import { useConfigStore } from "../../src/stores/config";

describe("config store", () => {
	beforeEach(() => {
		// Reset store to initial state before each test
		useConfigStore.setState({
			endpoint: "http://localhost:4566",
			region: "us-east-1",
			userConfigured: false,
			endpointModalOpen: false,
			userDismissedModal: false,
		});
	});

	it("should have correct default values", () => {
		const state = useConfigStore.getState();
		expect(state.endpoint).toBe("http://localhost:4566");
		expect(state.region).toBe("us-east-1");
		expect(state.userConfigured).toBe(false);
		expect(state.endpointModalOpen).toBe(false);
		expect(state.userDismissedModal).toBe(false);
	});

	it("setEndpoint updates endpoint, sets userConfigured, and resets userDismissedModal", () => {
		// First set userDismissedModal to true so we can confirm it resets
		useConfigStore.setState({ userDismissedModal: true });

		useConfigStore.getState().setEndpoint("http://localhost:9999");

		const state = useConfigStore.getState();
		expect(state.endpoint).toBe("http://localhost:9999");
		expect(state.userConfigured).toBe(true);
		expect(state.userDismissedModal).toBe(false);
	});

	it("setRegion sets userConfigured to true", () => {
		useConfigStore.getState().setRegion("eu-west-1");
		expect(useConfigStore.getState().userConfigured).toBe(true);
	});

	it("applyServerDefaults updates endpoint and region without setting userConfigured", () => {
		useConfigStore
			.getState()
			.applyServerDefaults("http://custom:4566", "eu-central-1");

		const state = useConfigStore.getState();
		expect(state.endpoint).toBe("http://custom:4566");
		expect(state.region).toBe("eu-central-1");
		expect(state.userConfigured).toBe(false);
	});

	it("setRegion updates region", () => {
		useConfigStore.getState().setRegion("eu-west-1");

		const state = useConfigStore.getState();
		expect(state.region).toBe("eu-west-1");
	});

	it("dismissModal sets endpointModalOpen to false and userDismissedModal to true", () => {
		useConfigStore.setState({
			endpointModalOpen: true,
			userDismissedModal: false,
		});

		useConfigStore.getState().dismissModal();

		const state = useConfigStore.getState();
		expect(state.endpointModalOpen).toBe(false);
		expect(state.userDismissedModal).toBe(true);
	});

	it("setEndpointModalOpen updates endpointModalOpen", () => {
		useConfigStore.getState().setEndpointModalOpen(true);
		expect(useConfigStore.getState().endpointModalOpen).toBe(true);

		useConfigStore.getState().setEndpointModalOpen(false);
		expect(useConfigStore.getState().endpointModalOpen).toBe(false);
	});

	it("only endpoint, region and userConfigured are persisted (partialize)", () => {
		useConfigStore.getState().setEndpointModalOpen(true);
		const stored = localStorage.getItem("localstack-config");
		if (stored) {
			const parsed = JSON.parse(stored);
			const persistedState = parsed.state ?? parsed;
			expect(persistedState.endpointModalOpen).toBeUndefined();
			expect(persistedState.userDismissedModal).toBeUndefined();
			expect(persistedState.endpoint).toBeDefined();
			expect(persistedState.region).toBeDefined();
			expect(persistedState.userConfigured).toBeDefined();
		}
	});
});
