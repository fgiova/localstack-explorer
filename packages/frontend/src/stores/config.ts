import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConfigState {
  endpoint: string;
  region: string;
  userConfigured: boolean;
  endpointModalOpen: boolean;
  userDismissedModal: boolean;
  setEndpoint: (endpoint: string) => void;
  setRegion: (region: string) => void;
  applyServerDefaults: (endpoint: string, region: string) => void;
  setEndpointModalOpen: (open: boolean) => void;
  dismissModal: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      endpoint: "http://localhost:4566",
      region: "us-east-1",
      userConfigured: false,
      endpointModalOpen: false,
      userDismissedModal: false,
      setEndpoint: (endpoint) => set({ endpoint, userConfigured: true, userDismissedModal: false }),
      setRegion: (region) => set({ region, userConfigured: true }),
      applyServerDefaults: (endpoint, region) => set({ endpoint, region }),
      setEndpointModalOpen: (open) => set({ endpointModalOpen: open }),
      dismissModal: () => set({ endpointModalOpen: false, userDismissedModal: true }),
    }),
    {
      name: "localstack-config",
      partialize: (state) => ({
        endpoint: state.endpoint,
        region: state.region,
        userConfigured: state.userConfigured,
      }),
    }
  )
);
