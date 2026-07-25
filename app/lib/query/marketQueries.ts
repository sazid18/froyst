"use client";

import { useRef } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Market } from "../../types/state";
import { fetchMarket, fetchMarkets } from "./api";
import { MARKET_STALE_TIME_MS } from "./queryClient";
import { queryKeys } from "./queryKeys";

/** Normalization step: fan the list response out into per-market cache entries. */
function normalizeMarkets(queryClient: QueryClient, markets: Market[]): void {
  for (const market of markets) {
    queryClient.setQueryData(queryKeys.market(market.id), market);
  }
}

/**
 * Homepage market list. SSR callers pass the server-fetched list as
 * `initialData` so the first paint is never a loading state; the list
 * query itself then normalizes into ['market', id] entries so any
 * component reading a single market re-renders independently of the list.
 */
export function useMarketsQuery(initialData?: Market[]) {
  const queryClient = useQueryClient();
  const hasSeededInitialDataRef = useRef(false);

  // `initialData` marks the ['markets'] query as fresh, so queryFn (the
  // only place normalization runs) won't execute until it goes stale —
  // meaning individual ['market', id] entries would stay empty after an
  // SSR-seeded mount, and every MarketRow would trigger its own redundant
  // fetch. Seed them here too, once, so initialData and a real fetch
  // normalize identically.
  if (initialData && !hasSeededInitialDataRef.current) {
    hasSeededInitialDataRef.current = true;
    normalizeMarkets(queryClient, initialData);
  }

  return useQuery({
    queryKey: queryKeys.markets(),
    queryFn: async () => {
      const markets = await fetchMarkets();
      normalizeMarkets(queryClient, markets);
      return markets;
    },
    initialData,
    staleTime: MARKET_STALE_TIME_MS,
  });
}

/**
 * Single-market read. Usually already populated by useMarketsQuery's
 * normalization; the queryFn here is a fallback for deep-linking directly
 * to a market that hasn't been normalized into the cache yet.
 */
export function useMarketQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.market(id),
    queryFn: () => fetchMarket(id),
    staleTime: MARKET_STALE_TIME_MS,
  });
}
