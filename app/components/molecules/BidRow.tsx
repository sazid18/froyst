import { Button, Tag, Text, cn } from "../atoms";
import type { Bid } from "../../types/state";

export type BidRowSettlement = "won" | "lost" | null;

export type BidRowProps = {
  bid: Bid;
  question: string;
  currentPrice: number;
  settlement: BidRowSettlement;
  /** Present only when there's a resting remainder to cancel; omit to hide the action entirely. */
  onCancelResting?: () => void;
  isCancelling?: boolean;
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
  onCancelResting,
  isCancelling,
  className,
}: BidRowProps) {
  // Only the filled portion is an actual position — a resting remainder
  // hasn't executed against the market yet, so it carries no P&L.
  const filledAmount = bid.amount - (bid.restingAmount ?? 0);
  const shares = filledAmount / bid.price;

  let value: number;
  if (settlement === "won") {
    value = shares;
  } else if (settlement === "lost") {
    value = 0;
  } else {
    value = shares * currentPrice;
  }

  const pnl = value - filledAmount;
  const pnlToneClass = pnl >= 0 ? "text-gain" : "text-no";

  // A cancelled resting remainder still leaves a real, filled position
  // behind whenever anything executed — showing the raw "cancelled"
  // status as the row's one headline tag would incorrectly read as the
  // whole bid (not just the leftover unfilled order) having been voided.
  // Tag it "confirmed" instead whenever there's an actual filled amount,
  // and say what got cancelled separately, below.
  const statusTagTone =
    settlement ?? (bid.status === "cancelled" && filledAmount > 0 ? "confirmed" : bid.status);
  const isActivelyResting = bid.status === "resting" && !!bid.restingAmount;
  const isCancelledResting = bid.status === "cancelled" && !!bid.restingAmount;

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
        {isActivelyResting && (
          <div className="flex items-center gap-1.5">
            <Text as="span" variant="numSmall" className="text-ink-soft">
              {formatMoney(bid.restingAmount!)} resting
            </Text>
            {onCancelResting && (
              <Button
                variant="outline"
                onClick={onCancelResting}
                loading={isCancelling}
                className="h-7 rounded-[6px] px-2 text-[12px]"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
        {isCancelledResting && (
          <Text as="span" variant="numSmall" className="text-ink-soft">
            {formatMoney(bid.restingAmount!)} resting cancelled
          </Text>
        )}
      </div>
    </div>
  );
}
