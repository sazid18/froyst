"use client";

import { Badge, Button, LiveDot, cn } from "../atoms";
import { CategorySelect, SearchField } from "../molecules";
import { useBidsQuery } from "../../lib/query/bidsQueries";
import { useBidModalStore } from "../../store/useBidModalStore";
import { useBidsPanelStore } from "../../store/useBidsPanelStore";
import { useConnectionStore } from "../../store/useConnectionStore";

export const DEMO_USER_ID = "demo-user";

const CATEGORY_OPTIONS = [
  "All",
  "Crypto",
  "Business",
  "Sports",
  "Politics",
  "Pop Culture",
  "Science",
];

export type FilterBarProps = {
  category: string;
  query: string;
  onCategoryChange: (category: string) => void;
  onQueryChange: (query: string) => void;
  className?: string;
};

export function FilterBar({
  category,
  query,
  onCategoryChange,
  onQueryChange,
  className,
}: FilterBarProps) {
  const connectionStatus = useConnectionStore((state) => state.status);
  const isPanelOpen = useBidsPanelStore((state) => state.isOpen);
  const { data: bids } = useBidsQuery(DEMO_USER_ID);
  const bidCount = (bids ?? []).filter((bid) => bid.status !== "failed").length;

  function handleToggleMyBids() {
    if (isPanelOpen) {
      useBidsPanelStore.getState().close();
      return;
    }
    // Opening either panel closes the other.
    useBidModalStore.getState().close();
    useBidsPanelStore.getState().open();
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <CategorySelect
        categories={CATEGORY_OPTIONS}
        value={category}
        onChange={onCategoryChange}
      />
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder="Search markets"
        className="min-w-[200px] flex-1"
      />
      <Button
        variant="outline"
        active={isPanelOpen}
        onClick={handleToggleMyBids}
        className="relative"
      >
        My bids
        <Badge count={bidCount} className="absolute -right-2 -top-2" />
      </Button>
      <LiveDot state={connectionStatus} />
    </div>
  );
}
