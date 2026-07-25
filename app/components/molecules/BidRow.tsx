import { Tag, Text, cn } from "../atoms";
import type { Bid } from "../../types/state";

export type BidRowSettlement = "won" | "lost" | null;

export type BidRowProps = {
  bid: Bid;
  question: string;
  currentPrice: number;
  settlement: BidRowSettlement;
  className?: string;
};

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatSignedMoney(value: number): string {
  const sign = value < 0 ? "-" : "+";
  return `${sign}${formatMoney(Math.abs(value))}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BidRow({
  bid,
  question,
  currentPrice,
  settlement,
  className,
}: BidRowProps) {
  const shares = bid.amount / bid.price;

  let value: number;
  if (settlement === "won") {
    value = shares;
  } else if (settlement === "lost") {
    value = 0;
  } else {
    value = shares * currentPrice;
  }

  const pnl = value - bid.amount;
  const pnlToneClass = pnl >= 0 ? "text-gain" : "text-no";
  const statusTagTone = settlement ?? bid.status;

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="flex flex-col items-start gap-1.5">
        <Text as="p" variant="body" className="break-words">
          {question}
        </Text>
        <div className="flex items-center gap-1.5">
          <Text as="span" variant="numSmall">
            {bid.id}
          </Text>
          <Text as="span" variant="numSmall" aria-hidden="true">
            ·
          </Text>
          <Text as="span" variant="numSmall">
            {formatTime(bid.createdAt)}
          </Text>
        </div>
        <Tag tone={bid.outcome} />
      </div>
      <div className="flex flex-col items-end gap-1.5 text-right">
        <div className="flex flex-col items-end">
          <Text as="span" variant="num">
            ${Math.round(bid.amount)}
          </Text>
          <Text as="span" variant="numSmall">
            {shares.toFixed(1)} SH @ {formatMoney(bid.price)}
          </Text>
        </div>
        <div className="flex items-center gap-1.5">
          <Text as="span" variant="num">
            {formatMoney(value)}
          </Text>
          <Text as="span" variant="num" className={pnlToneClass}>
            {formatSignedMoney(pnl)}
          </Text>
        </div>
        <Tag tone={statusTagTone} />
      </div>
    </div>
  );
}
