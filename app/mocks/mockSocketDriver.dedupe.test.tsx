import { act } from "react";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Bid, Market } from "../types/state";
import { queryKeys } from "../lib/query/queryKeys";
import { usePlaceBidMutation } from "../lib/query/bidsQueries";
import { useConnectionStore } from "../store/useConnectionStore";
import { createMockSocketDriver } from "./mockSocketDriver";

// Deliberately does NOT mock socketManager/applySocketMessage or
// lib/query/api — this proves the real end-to-end guarantee: the
// mutation's own onSuccess (clientId -> server id) must land before the
// driver's delayed BID_UPDATE, or the dedupe-by-id in applySocketMessage
// would miss and prepend a duplicate row instead of replacing in place.

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "m1",
    question: "Q",
    category: "Crypto",
    resolutionDate: "2026-01-01T00:00:00.000Z",
    yesPrice: 0.5,
    noPrice: 0.5,
    volume: 1000,
    liquidity: 200,
    isResolved: false,
    ...overrides,
  };
}

describe("mock socket driver + usePlaceBidMutation integration", () => {
  it("does not duplicate the bid row once the driver's delayed BID_UPDATE arrives", async () => {
    vi.useFakeTimers();
    useConnectionStore.setState({ browserOnline: true, socketReadyState: "open", status: "open" });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const market = makeMarket({ id: "m1" });
    queryClient.setQueryData(queryKeys.market("m1"), market);
    queryClient.setQueryData(queryKeys.bids("demo-user"), []);

    const confirmedBid: Bid = {
      id: "srv-1",
      userId: "demo-user",
      marketId: "m1",
      outcome: "yes",
      amount: 100,
      price: 0.5,
      status: "confirmed",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const originalFetch = window.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (init?.method === "POST" && url.includes("/api/bids")) {
          return new Response(JSON.stringify(confirmedBid), { status: 200 });
        }
        if (url.includes("/api/markets/")) {
          return new Response(JSON.stringify(market), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      })
    );

    const driver = createMockSocketDriver(queryClient);
    driver.start();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePlaceBidMutation("demo-user"), { wrapper });

    await act(async () => {
      result.current.mutate({
        payload: { userId: "demo-user", marketId: "m1", outcome: "yes", amount: 100 },
        clientId: "client-abc",
      });
      // waitFor's polling relies on real timers, which are frozen here —
      // flush the mutation's internal await chain (postBid -> onSuccess)
      // via fake-timer-aware microtask flushing instead.
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isSuccess).toBe(true);

    // onSuccess has already swapped clientId -> server id by now; the
    // driver's 300ms-delayed BID_UPDATE hasn't fired yet.
    expect(queryClient.getQueryData<Bid[]>(queryKeys.bids("demo-user"))).toEqual([confirmedBid]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const finalBids = queryClient.getQueryData<Bid[]>(queryKeys.bids("demo-user"));
    expect(finalBids).toHaveLength(1);
    expect(finalBids?.[0].id).toBe("srv-1");

    driver.stop();
    window.fetch = originalFetch;
    vi.useRealTimers();
  });
});
