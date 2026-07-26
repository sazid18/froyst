"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Bid, BidPayload, Market } from "../../types/state";
import { cancelRestingBid, fetchBids, postBid } from "./api";
import { BIDS_STALE_TIME_MS } from "./queryClient";
import { queryKeys } from "./queryKeys";
import { enqueueOfflineBid } from "../offline/offlineQueueDb";
import { registerBidQueueSync } from "../offline/backgroundSync";
import { useConnectionStore } from "../../store/useConnectionStore";

export function useBidsQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.bids(userId),
    queryFn: () => fetchBids(userId),
    staleTime: BIDS_STALE_TIME_MS,
  });
}

type PlaceBidVariables = {
  payload: BidPayload;
  /**
   * Client-generated id, shared between the optimistic Bid entry and (if
   * we end up offline) the OfflineBidQueueItem's queueId. Callers
   * generate it (crypto.randomUUID()) so it's stable across a reload —
   * see reconcileBidsCache in offlineQueueFlush.ts, which relies on this
   * id to find-and-replace the entry later, possibly in a different
   * browser session than the one that submitted it.
   */
  clientId: string;
};

type PlaceBidResult =
  | { kind: "confirmed"; bid: Bid }
  | { kind: "queued" };

type PlaceBidContext = {
  previousBids: Bid[] | undefined;
};

/**
 * Submits a bid with an optimistic update, reading the live price for the
 * outcome from the ['market', id] Query cache. If online submission fails
 * — or the connection store already reports us offline — the bid is
 * queued to IndexedDB instead of failing the mutation; the optimistic
 * entry stays visible with status "pending" until the offline queue
 * flushes (see app/lib/offline/offlineQueueFlush.ts).
 */
export function usePlaceBidMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<PlaceBidResult, Error, PlaceBidVariables, PlaceBidContext>({
    mutationFn: async ({ payload, clientId }) => {
      const status = useConnectionStore.getState().status;

      if (status === "closed") {
        await enqueueOfflineBid(payload, clientId);
        void registerBidQueueSync();
        return { kind: "queued" };
      }

      try {
        const bid = await postBid(payload, clientId);
        return { kind: "confirmed", bid };
      } catch (error) {
        if (error instanceof TypeError) {
          await enqueueOfflineBid(payload, clientId);
          void registerBidQueueSync();
          return { kind: "queued" };
        }
        throw error;
      }
    },
    onMutate: async ({ payload, clientId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bids(userId) });
      const previousBids = queryClient.getQueryData<Bid[]>(queryKeys.bids(userId));
      const market = queryClient.getQueryData<Market>(queryKeys.market(payload.marketId));
      const price = market ? (payload.outcome === "yes" ? market.yesPrice : market.noPrice) : 0;

      const optimisticBid: Bid = {
        id: clientId,
        userId: payload.userId,
        marketId: payload.marketId,
        outcome: payload.outcome,
        amount: payload.amount,
        price,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Bid[]>(queryKeys.bids(userId), (old) => [
        optimisticBid,
        ...(old ?? []),
      ]);

      return { previousBids };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.bids(userId), context.previousBids);
      }
    },
    onSuccess: (result, { clientId }) => {
      if (result.kind !== "confirmed") {
        // Queued: leave the optimistic "pending" bid as-is. Reconciled
        // later by reconcileBidsCache once the queue flushes — including
        // after a reload, independent of this mutation's lifecycle.
        return;
      }
      queryClient.setQueryData<Bid[]>(queryKeys.bids(userId), (old) =>
        old?.map((bid) => (bid.id === clientId ? result.bid : bid))
      );
    },
  });
}

type CancelRestingBidContext = {
  previousBids: Bid[] | undefined;
};

/**
 * Cancels the still-open resting remainder of a bid (the filled portion,
 * if any, is untouched). Online-only — unlike usePlaceBidMutation, a
 * failure here just rolls back the optimistic change and surfaces
 * mutation.error; there's no offline queue for cancellation.
 */
export function useCancelRestingBidMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<Bid, Error, { bidId: string }, CancelRestingBidContext>({
    mutationFn: ({ bidId }) => cancelRestingBid(bidId, userId),
    onMutate: async ({ bidId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bids(userId) });
      const previousBids = queryClient.getQueryData<Bid[]>(queryKeys.bids(userId));

      // Not touching restingAmount — see the field's own doc comment in
      // types/state.ts for why it must survive cancellation.
      queryClient.setQueryData<Bid[]>(queryKeys.bids(userId), (old) =>
        old?.map((bid) => (bid.id === bidId ? { ...bid, status: "cancelled" as const } : bid))
      );

      return { previousBids };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.bids(userId), context.previousBids);
      }
    },
    onSuccess: (bid) => {
      queryClient.setQueryData<Bid[]>(queryKeys.bids(userId), (old) =>
        old?.map((existing) => (existing.id === bid.id ? bid : existing))
      );
    },
  });
}
