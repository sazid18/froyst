"use client";

import { Button, Text, cn } from "../atoms";
import type { BidOutcome } from "../../types/state";

export type SidePickerProps = {
  outcome: BidOutcome | null;
  yesPrice: number;
  noPrice: number;
  onPick: (outcome: BidOutcome) => void;
  className?: string;
};

const sides = ["yes", "no"] as const;

const sideLabel: Record<BidOutcome, string> = {
  yes: "Yes",
  no: "No",
};

const selectedClassMap: Record<BidOutcome, string> = {
  yes: "border-yes bg-yes-soft text-yes",
  no: "border-no bg-no-soft text-no",
};

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function SidePicker({
  outcome,
  yesPrice,
  noPrice,
  onPick,
  className,
}: SidePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Pick a side"
      className={cn("grid grid-cols-2 gap-2", className)}
    >
      {sides.map((side) => {
        const selected = outcome === side;
        const price = side === "yes" ? yesPrice : noPrice;

        return (
          <Button
            key={side}
            type="button"
            variant="outline"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(side)}
            className={cn(
              "h-auto flex-col gap-1 py-3",
              selected && selectedClassMap[side]
            )}
          >
            <Text
              as="span"
              variant="caption"
              className={selected ? "text-current" : undefined}
            >
              {sideLabel[side]}
            </Text>
            <Text
              as="span"
              variant="num"
              className={selected ? "text-current" : undefined}
            >
              {formatPrice(price)}
            </Text>
          </Button>
        );
      })}
    </div>
  );
}
