import { QueryClient } from "@tanstack/react-query";

// Markets are live-patched over the socket; a short staleTime just covers
// the gap between mount and the first WS message (or a dropped message).
export const MARKET_STALE_TIME_MS = 15_000;
export const BIDS_STALE_TIME_MS = 30_000;

// How long persisted (IndexedDB) data is trusted on cold start before the
// persister discards it outright — see app/lib/query/persister.ts and the
// trade-offs note in the PR description for why 24h.
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MARKET_STALE_TIME_MS,
        gcTime: PERSIST_MAX_AGE_MS,
        retry: 2,
        // The socket (plus reconnect reconciliation) is the freshness
        // signal here; refetching on every tab focus would fight it and
        // cause visible price flicker.
        refetchOnWindowFocus: false,
      },
      mutations: {
        // The offline queue owns retry semantics for bids; Query's own
        // retry would race it.
        retry: 0,
      },
    },
  });
}
