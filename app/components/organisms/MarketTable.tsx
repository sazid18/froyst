"use client";

import { Skeleton, Text, cn } from "../atoms";
import { EmptyState } from "../molecules";
import { useMarketsQuery } from "../../lib/query/marketQueries";
import type { Market } from "../../types/state";
import { MarketRow } from "./MarketRow";
import { MARKET_ROW_GRID_COLS_CLASS } from "./marketTableLayout";

export type MarketTableFilters = {
  category: string;
  query: string;
};

export type MarketTableProps = {
  filters: MarketTableFilters;
  className?: string;
};

function matchesFilters(market: Market, filters: MarketTableFilters): boolean {
  if (market.isResolved) {
    return false;
  }
  if (filters.category !== "All" && market.category !== filters.category) {
    return false;
  }
  const query = filters.query.trim().toLowerCase();
  if (query && !market.question.toLowerCase().includes(query)) {
    return false;
  }
  return true;
}

const SKELETON_ROW_COUNT = 6;

export function MarketTable({ filters, className }: MarketTableProps) {
  const { data: markets, isPending } = useMarketsQuery();

  if (isPending) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} shape="row" />
        ))}
      </div>
    );
  }

  const filteredIds = (markets ?? [])
    .filter((market) => matchesFilters(market, filters))
    .map((market) => market.id);

  if (filteredIds.length === 0) {
    return (
      <EmptyState
        title="No markets found"
        description="Try a different search or category."
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "hidden gap-4 px-4 min-[761px]:grid",
          MARKET_ROW_GRID_COLS_CLASS
        )}
      >
        <Text as="span" variant="colhead">
          NAME
        </Text>
        <Text as="span" variant="colhead">
          PRICE
        </Text>
        <Text as="span" variant="colhead">
          VOLUME
        </Text>
        <Text as="span" variant="colhead">
          LIQUIDITY
        </Text>
        <Text as="span" variant="colhead">
          RESOLVES
        </Text>
        <span aria-hidden="true" />
      </div>

      {filteredIds.map((id) => (
        <MarketRow key={id} id={id} />
      ))}
    </div>
  );
}
