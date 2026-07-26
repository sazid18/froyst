"use client";

import { useState } from "react";
import { BidModal, FilterBar, MarketTable, MyBidsSidebar } from "./organisms";
import { useMarketsQuery } from "../lib/query/marketQueries";
import type { Market } from "../types/state";

export type MarketsPageProps = {
  initialMarkets: Market[];
};

export function MarketsPage({ initialMarkets }: MarketsPageProps) {
  // Seeds the cache through useMarketsQuery's existing normalization path
  // — MarketTable's own useMarketsQuery() call (no args) subscribes to the
  // same ['markets'] cache entry this primes, so there's no parallel
  // seeding hook and no risk of socket patches and seed data disagreeing
  // on shape.
  useMarketsQuery(initialMarkets);

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-6 p-6">
      <FilterBar
        category={category}
        query={query}
        onCategoryChange={setCategory}
        onQueryChange={setQuery}
        className="sticky top-0 z-10 -mx-6 bg-canvas px-6 py-3"
      />
      <MarketTable filters={{ category, query }} />
      <BidModal />
      <MyBidsSidebar />
    </div>
  );
}
