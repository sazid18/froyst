import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

/**
 * Called when the socket transitions back to "open" after having been
 * connected before (i.e. after a real gap, not the initial connect).
 * Messages missed while disconnected mean cached prices may be stale —
 * don't trust the cache blindly, invalidate the visible market queries so
 * they refetch immediately rather than waiting for staleTime to elapse.
 */
export function reconcileOnReconnect(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.markets() });
  queryClient.invalidateQueries({ queryKey: ["market"] });
}
