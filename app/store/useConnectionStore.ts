import { create } from "zustand";
import type { ConnectionState, ConnectionStatus, SocketReadyStateLabel } from "../types/state";

/**
 * Never infer connection status from a single signal: browser-level
 * offline wins outright (status "closed" regardless of socket state,
 * since there's no point pretending a socket is usable without a
 * network), otherwise the socket's own readyState drives it.
 */
export function deriveConnectionStatus(
  browserOnline: boolean,
  socketReadyState: SocketReadyStateLabel
): ConnectionStatus {
  if (!browserOnline) {
    return "closed";
  }
  if (socketReadyState === "open") {
    return "open";
  }
  if (socketReadyState === "connecting") {
    return "connecting";
  }
  return "reconnecting";
}

type ConnectionStore = ConnectionState & {
  setBrowserOnline: (online: boolean) => void;
  setSocketReadyState: (state: SocketReadyStateLabel) => void;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  browserOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  socketReadyState: "closed",
  status: "closed",
  setBrowserOnline: (online) => {
    set({ browserOnline: online, status: deriveConnectionStatus(online, get().socketReadyState) });
  },
  setSocketReadyState: (socketReadyState) => {
    set((state) => ({
      socketReadyState,
      status: deriveConnectionStatus(state.browserOnline, socketReadyState),
    }));
  },
}));

/** Wires navigator.onLine's online/offline window events into the store. Call once at app boot. */
export function bindBrowserConnectivityListeners(): () => void {
  function handleOnline() {
    useConnectionStore.getState().setBrowserOnline(true);
  }
  function handleOffline() {
    useConnectionStore.getState().setBrowserOnline(false);
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
