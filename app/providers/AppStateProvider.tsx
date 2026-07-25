"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createQueryClient, PERSIST_MAX_AGE_MS } from "../lib/query/queryClient";
import { createIdbPersister } from "../lib/query/persister";
import { createSocketManager } from "../lib/socket/socketManager";
import { createMockSocketDriver } from "../mocks/mockSocketDriver";
import { flushOfflineQueue, reconcileBidsCache } from "../lib/offline/offlineQueueFlush";
import {
  bindBrowserConnectivityListeners,
  useConnectionStore,
} from "../store/useConnectionStore";
import { bindInstallPromptListeners } from "../store/useInstallPromptStore";

// No real WebSocket server exists in this repo. When NEXT_PUBLIC_WS_URL
// is unset, AppStateProvider runs the mock socket driver (app/mocks/) —
// a transport substitute backed by the mock REST API — instead of trying
// to connect to a socket that isn't there.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    const persister = createIdbPersister();
    const [unsubscribePersister] = persistQueryClient({
      queryClient,
      persister,
      maxAge: PERSIST_MAX_AGE_MS,
      dehydrateOptions: {
        // Only the entity-keyed, normalized caches are worth restoring
        // offline — nothing else lives in this QueryClient today, but this
        // keeps the persisted payload scoped intentionally rather than
        // "whatever happens to be in the cache."
        shouldDehydrateQuery: (query) => {
          const [entity] = query.queryKey;
          return entity === "markets" || entity === "market" || entity === "bids";
        },
      },
    });

    const socketManager = WS_URL ? createSocketManager(WS_URL, queryClient) : undefined;
    const mockSocketDriver = WS_URL ? undefined : createMockSocketDriver(queryClient);
    socketManager?.connect();
    mockSocketDriver?.start();

    const unbindConnectivity = bindBrowserConnectivityListeners();
    const unbindInstallPrompt = bindInstallPromptListeners();

    function runFlush() {
      void flushOfflineQueue().then((outcomes) => {
        reconcileBidsCache(queryClient, outcomes);
      });
    }

    // Manual retry-on-reconnect fallback for browsers without Background
    // Sync (see public/sw.ts for the Background Sync path where it IS
    // supported — both converge on the same flushOfflineQueue()).
    let wasOpen = useConnectionStore.getState().status === "open";
    const unsubscribeConnection = useConnectionStore.subscribe((state) => {
      const isOpen = state.status === "open";
      if (isOpen && !wasOpen) {
        runFlush();
      }
      wasOpen = isOpen;
    });

    // Also try once at boot, in case bids were queued in a previous
    // session and we're already online on cold start.
    if (useConnectionStore.getState().status === "open") {
      runFlush();
    }

    return () => {
      socketManager?.disconnect();
      mockSocketDriver?.stop();
      unbindConnectivity();
      unbindInstallPrompt();
      unsubscribeConnection();
      unsubscribePersister();
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
