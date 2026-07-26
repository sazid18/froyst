import type { QueryClient } from "@tanstack/react-query";
import type { Bid, Market, SocketMessage } from "../types/state";
import { applySocketMessage } from "../lib/socket/socketManager";
import { useConnectionStore } from "../store/useConnectionStore";

// Substitutes for a real WebSocket in local/demo environments (no
// NEXT_PUBLIC_WS_URL configured). Transport substitution, not a second
// source of truth: every emitted message goes through the exact same
// applySocketMessage() the real socket manager uses — this driver never
// calls setQueryData itself.

const DRIFT_INTERVAL_MS = 2000;
const POST_BID_MESSAGE_DELAY_MS = 300;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function marketUpdateFrom(market: Market): SocketMessage {
  return {
    type: "MARKET_UPDATE",
    payload: {
      id: market.id,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      volume: market.volume,
      liquidity: market.liquidity,
    },
  };
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

export type MockSocketDriver = {
  start: () => void;
  stop: () => void;
};

export function createMockSocketDriver(queryClient: QueryClient): MockSocketDriver {
  let driftTimer: ReturnType<typeof setInterval> | undefined;
  let originalFetch: typeof window.fetch | undefined;

  async function emitDrift(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/mocks/drift`, { method: "POST" });
      if (!res.ok) {
        return;
      }
      const driftedMarkets = (await res.json()) as Market[];

      // One MARKET_UPDATE per drifted market — the endpoint now moves
      // several at once per tick, not just one.
      for (const market of driftedMarkets) {
        applySocketMessage(queryClient, marketUpdateFrom(market));
      }
    } catch {
      // Best-effort — a missed drift tick is just one less price wiggle.
    }
  }

  /**
   * A real socket would push MARKET_UPDATE/BID_UPDATE from the server the
   * instant a bid lands, independent of which client placed it. The mock
   * has no server-push channel, so it observes this client's own
   * POST /api/bids call (the only bid-placing path there is here) by
   * wrapping fetch, reads the confirmed Bid off the *real* response, and
   * schedules the socket messages off of that — the underlying response is
   * returned untouched, so usePlaceBidMutation's own flow is unaffected.
   */
  function patchFetchForBidUpdates(): void {
    originalFetch = window.fetch.bind(window);
    const original = originalFetch;

    window.fetch = async (input, init) => {
      const response = await original(input, init);

      const isBidPost = init?.method === "POST" && requestUrl(input).includes("/api/bids");
      if (isBidPost && response.ok) {
        response
          .clone()
          .json()
          .then((bid: Bid) => {
            // Delayed so the mutation's own onSuccess (which replaces the
            // optimistic entry: clientId -> server Bid) always runs first
            // — the router's prepend+dedupe-by-id then no-ops on
            // BID_UPDATE instead of duplicating the row.
            setTimeout(() => {
              void (async () => {
                const marketRes = await fetch(`${API_BASE}/api/markets/${bid.marketId}`);
                if (marketRes.ok) {
                  const market = (await marketRes.json()) as Market;
                  applySocketMessage(queryClient, marketUpdateFrom(market));
                }
                applySocketMessage(queryClient, { type: "BID_UPDATE", payload: bid });
              })();
            }, POST_BID_MESSAGE_DELAY_MS);
          })
          .catch(() => {});
      }

      return response;
    };
  }

  function start(): void {
    // Feed the same readyState signal the real socket manager feeds —
    // deriveConnectionStatus computes the actual `status`, never set
    // directly, so an offline browser still correctly shows offline even
    // with the mock "connected".
    useConnectionStore.getState().setSocketReadyState("open");
    patchFetchForBidUpdates();
    driftTimer = setInterval(() => {
      void emitDrift();
    }, DRIFT_INTERVAL_MS);
  }

  function stop(): void {
    if (driftTimer) {
      clearInterval(driftTimer);
      driftTimer = undefined;
    }
    if (originalFetch) {
      window.fetch = originalFetch;
      originalFetch = undefined;
    }
    useConnectionStore.getState().setSocketReadyState("closed");
  }

  return { start, stop };
}
