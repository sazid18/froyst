"use client";

import { Chip, Icon, IconButton, cn } from "../atoms";
import type { Market } from "../../types/state";

export type MarketMetaProps = {
  category: Market["category"];
  isFavorite: boolean;
  isFeatured: boolean;
  onToggleFavorite: () => void;
  className?: string;
};

export function MarketMeta({
  category,
  isFavorite,
  isFeatured,
  onToggleFavorite,
  className,
}: MarketMetaProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <IconButton
        icon={<Icon name="star" filled={isFavorite} />}
        label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        pressed={isFavorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
      />
      {isFeatured && <Icon name="bolt" filled className="text-gold" />}
      <Chip category={category} />
    </div>
  );
}
