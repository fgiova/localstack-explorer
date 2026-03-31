import { useEffect, useRef } from "react";
import { useHealthCheck } from "@/api/config";
import { useConfigStore } from "@/stores/config";

export function ConnectionGuard() {
  const { data, isSuccess } = useHealthCheck();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!isSuccess || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const { userDismissedModal, setEndpointModalOpen } = useConfigStore.getState();
    if (!data.connected && !userDismissedModal) {
      setEndpointModalOpen(true);
    }
  }, [isSuccess, data]);

  return null; // no UI, just logic
}
