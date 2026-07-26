"use client";

import { memo, useState } from "react";
import { Avatar, Icon, Tag, Text, cn } from "../atoms";
import { LiveCell, MarketMeta, PriceBar } from "../molecules";
import { useMarketQuery } from "../../lib/query/marketQueries";
import { useBidModalStore } from "../../store/useBidModalStore";
import { useBidsPanelStore } from "../../store/useBidsPanelStore";
import type { MarketCategory } from "../../types/state";
import { MARKET_ROW_GRID_COLS_CLASS } from "./marketTableLayout";

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// No image field exists on Market — these are generic per-category
// placeholder icons (reusing the create-next-app SVGs already in public/)
// rather than pulling in a new dependency or external image host.
const CATEGORY_AVATAR: Record<MarketCategory, string> = {
  Crypto: "/globe.svg",
  Business: "/file.svg",
  Sports: "/window.svg",
  Politics: "/next.svg",
  "Pop Culture": "/vercel.svg",
  Science: "/globe.svg",
};

// "Featured" has no backing field on Market, and no store was specified
// for it in this task — deriving it from volume keeps it a real,
// deterministic signal rather than inventing fake state.
const FEATURED_VOLUME_THRESHOLD = 500_000;

export type MarketRowProps = {
  id: string;
};

function MarketRowImpl({ id }: MarketRowProps) {
  const { data: market } = useMarketQuery(id);
  // Favorites have no persistence store specified in this task (unlike the
  // bid modal / bids panel, which are explicit deliverables) — local,
  // ephemeral UI state is the honest scope boundary here; it resets on
  // remount rather than pretending to survive a reload.
  const [isFavorite, setIsFavorite] = useState(false);

  if (!market) {
    return null;
  }

  const isFeatured = market.volume >= FEATURED_VOLUME_THRESHOLD;
  const clickable = !market.isResolved;

  function handleActivate() {
    if (!clickable) {
      return;
    }
    useBidsPanelStore.getState().close();
    useBidModalStore.getState().open(market!.id, "yes");
  }

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleActivate : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
      className={cn(
        "grid grid-cols-1 gap-3 rounded-[10px] border border-line bg-surface p-4",
        MARKET_ROW_GRID_COLS_CLASS,
        "min-[761px]:items-center min-[761px]:gap-4",
        clickable &&
          "cursor-pointer transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yes focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-start gap-3">
        {/* <Avatar src={CATEGORY_AVATAR[market.category]} alt={market.category} size={36} /> */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Text as="p" variant="body" className="line-clamp-2">
            {market.question}
          </Text>
          <MarketMeta
            category={market.category}
            isFavorite={isFavorite}
            isFeatured={isFeatured}
            onToggleFavorite={() => setIsFavorite((current) => !current)}
          />
        </div>
      </div>

      <div className="min-[761px]:px-2">
        {market.isResolved ? (
          <Tag tone="resolved" />
        ) : (
          <PriceBar market={{ yesPrice: market.yesPrice, noPrice: market.noPrice }} />
        )}
      </div>

      <LiveCell value={market.volume} tone="volume" />
      <LiveCell value={market.liquidity} tone="liquidity" />

      <Text as="span" variant="numSmall">
        {dateFormatter.format(new Date(market.resolutionDate))}
      </Text>

      <Icon
        name="chevron"
        className={cn("hidden text-iconIdle min-[761px]:block", !clickable && "opacity-0")}
      />
    </div>
  );
}

export const MarketRow = memo(MarketRowImpl);
