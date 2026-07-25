import type { QueryClient } from "@tanstack/react-query";
import type { Bid, BidPayload } from "../../types/state";
import { postBid } from "../query/api";
import { queryKeys } from "../query/queryKeys";
import { getQueuedBids, removeQueuedBid, updateQueuedBid } from "./offlineQueueDb";

// Network-only, no React/Next imports — this runs from the page (manual
// retry-on-reconnect) AND from the service worker (Background Sync
// handler in public/sw.ts), so it can't depend on the QueryClient or any
// browser API the SW doesn't have.

export type FlushOutcome =
  | { queueId: string; payload: BidPayload; kind: "confirmed"; bid: Bid }
  | { queueId: string; payload: BidPayload; kind: "still-offline" }
  | { queueId: string; payload: BidPayload; kind: "failed"; error: string };

/**
 * POSTs every queued bid and updates IndexedDB accordingly. A network
 * failure (fetch itself rejecting, as opposed to an HTTP error status)
 * means we're still offline — the item stays queued for the next attempt
 * rather than being marked failed.
 */
export async function flushOfflineQueue(): Promise<FlushOutcome[]> {
  const items = await getQueuedBids();
  const outcomes: FlushOutcome[] = [];

  for (const item of items) {
    try {
      const bid = await postBid(item.payload, item.queueId);
      await removeQueuedBid(item.queueId);
      outcomes.push({ queueId: item.queueId, payload: item.payload, kind: "confirmed", bid });
    } catch (error) {
      if (error instanceof TypeError) {
        // fetch() throws TypeError for network-level failures (offline,
        // DNS, CORS) — distinct from an HTTP error response. Leave queued.
        outcomes.push({ queueId: item.queueId, payload: item.payload, kind: "still-offline" });
        continue;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      await updateQueuedBid(item.queueId, {
        status: "failed",
        attempts: item.attempts + 1,
        lastError: message,
      });
      outcomes.push({ queueId: item.queueId, payload: item.payload, kind: "failed", error: message });
    }
  }

  return outcomes;
}

/**
 * Client-side only: reconciles the Query cache's optimistic bid entries
 * (matched by id === queueId, see usePlaceBidMutation) against flush
 * outcomes. Grouped by userId internally so callers don't need to know
 * which user(s) the flushed items belonged to.
 */
export function reconcileBidsCache(queryClient: QueryClient, outcomes: FlushOutcome[]): void {
  const outcomesByUserId = new Map<string, FlushOutcome[]>();
  for (const outcome of outcomes) {
    const list = outcomesByUserId.get(outcome.payload.userId) ?? [];
    list.push(outcome);
    outcomesByUserId.set(outcome.payload.userId, list);
  }

  for (const [userId, userOutcomes] of outcomesByUserId) {
    queryClient.setQueryData<Bid[]>(queryKeys.bids(userId), (old) => {
      if (!old) {
        return old;
      }
      return old.map((bid) => {
        const outcome = userOutcomes.find((o) => o.queueId === bid.id);
        if (!outcome) {
          return bid;
        }
        if (outcome.kind === "confirmed") {
          return outcome.bid;
        }
        if (outcome.kind === "failed") {
          return { ...bid, status: "failed" as const };
        }
        return bid; // still-offline: leave the optimistic "pending" bid as-is
      });
    });
  }
}
