import { Text, cn } from "../atoms";
import type { Market } from "../../types/state";

export type PriceBarProps = {
  market: Pick<Market, "yesPrice" | "noPrice">;
  className?: string;
};

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function PriceBar({ market, className }: PriceBarProps) {
  const { yesPrice, noPrice } = market;
  const total = yesPrice + noPrice;
  const yesWidthPercent = total > 0 ? (yesPrice / total) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <Text as="span" variant="caption">
            Yes
          </Text>
          <Text as="span" variant="num">
            {formatPrice(yesPrice)}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Text as="span" variant="caption">
            No
          </Text>
          <Text as="span" variant="num">
            {formatPrice(noPrice)}
          </Text>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-no-soft"
      >
        <div
          className="h-full rounded-full bg-yes transition-[width] duration-[400ms] ease-out"
          style={{ width: `${yesWidthPercent}%` }}
        />
      </div>
    </div>
  );
}
