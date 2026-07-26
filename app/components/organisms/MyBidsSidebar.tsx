"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Divider, Icon, IconButton, Scrim, Text, cn } from "../atoms";
import { BidRow, BidsSummary } from "../molecules";
import { useBidsQuery, useCancelRestingBidMutation } from "../../lib/query/bidsQueries";
import { useMarketQuery } from "../../lib/query/marketQueries";
import { queryKeys } from "../../lib/query/queryKeys";
import { useBidsPanelStore } from "../../store/useBidsPanelStore";
import type { Bid, Market } from "../../types/state";
import { DEMO_USER_ID } from "./FilterBar";

export function MyBidsSidebar() {
  const isOpen = useBidsPanelStore((state) => state.isOpen);
  const { data: bids } = useBidsQuery(DEMO_USER_ID);
  const queryClient = useQueryClient();

  const sortedBids = useMemo(
    () =>
      [...(bids ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [bids]
  );

  function handleClose() {
    useBidsPanelStore.getState().close();
  }

  // Non-reactive cache read: correct on every render this component
  // participates in, which includes every bid change (a bid and its
  // market update together — see mockSocketDriver.ts). An ambient
  // price-only drift tick with no bid change won't by itself force a
  // re-summarize. Each row's own currentPrice (below) doesn't share this
  // limitation — it subscribes directly via useMarketQuery.
  function valueOfBid(bid: Bid): number {
    const filledAmount = bid.amount - (bid.restingAmount ?? 0);
    const market = queryClient.getQueryData<Market>(queryKeys.market(bid.marketId));
    if (!market) {
      return filledAmount;
    }
    const shares = filledAmount / bid.price;
    const currentPrice = bid.outcome === "yes" ? market.yesPrice : market.noPrice;
    return shares * currentPrice;
  }

  return (
    <>
      <Scrim open={isOpen} onDismiss={handleClose} />
      <div
        role="complementary"
        aria-label="My bids"
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col gap-4 bg-surface p-5 shadow-lg",
          "transition-transform duration-200 motion-reduce:transition-none",
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <Text as="span" variant="eyebrow">
            My bids
          </Text>
          <IconButton icon={<Icon name="close" />} label="Close" onClick={handleClose} />
        </div>

        <BidsSummary bids={sortedBids} valueOf={valueOfBid} />
        <Divider />

        <div className="scrollbar-hide flex flex-1 flex-col gap-3 overflow-y-auto">
          {sortedBids.map((bid) => (
            <MyBidsSidebarRow key={bid.id} bid={bid} />
          ))}
        </div>
      </div>
    </>
  );
}

function MyBidsSidebarRow({ bid }: { bid: Bid }) {
  const { data: market } = useMarketQuery(bid.marketId);
  const cancelMutation = useCancelRestingBidMutation(DEMO_USER_ID);
  const currentPrice = market
    ? bid.outcome === "yes"
      ? market.yesPrice
      : market.noPrice
    : bid.price;

  return (
    <BidRow
      bid={bid}
      question={market?.question ?? bid.marketId}
      currentPrice={currentPrice}
      // Market has isResolved but no resolvedOutcome field — settlement
      // can't be derived without guessing which side won.
      // TODO(settlement): extend Market with a resolvedOutcome field, or
      // add a MARKET_RESOLVED socket message, so this can be computed
      // instead of left null.
      settlement={null}
      onCancelResting={
        bid.status === "resting"
          ? () => cancelMutation.mutate({ bidId: bid.id })
          : undefined
      }
      isCancelling={cancelMutation.isPending}
    />
  );
}
