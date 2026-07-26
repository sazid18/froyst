import { Text, cn } from "../atoms";
import type { Bid } from "../../types/state";

export type BidsSummaryProps = {
  bids: Bid[];
  valueOf: (bid: Bid) => number;
  className?: string;
};

function formatWhole(value: number): string {
  return `$${Math.round(value)}`;
}

export function BidsSummary({ bids, valueOf, className }: BidsSummaryProps) {
  const activeBids = bids.filter((bid) => bid.status !== "failed");
  const count = activeBids.length;
  // Resting money hasn't executed against the market yet — only count the
  // filled portion as "in" (at-risk) capital.
  const inAmount = activeBids.reduce(
    (sum, bid) => sum + (bid.amount - (bid.restingAmount ?? 0)),
    0
  );
  const nowAmount = activeBids.reduce((sum, bid) => sum + valueOf(bid), 0);
  const pnl = nowAmount - inAmount;
  const pnlSign = pnl < 0 ? "-" : "+";

  return (
    <Text as="p" variant="numSmall" className={cn(className)}>
      {count} {count === 1 ? "bid" : "bids"} · in {formatWhole(inAmount)} ·
      now {formatWhole(nowAmount)} · {pnlSign}
      {formatWhole(Math.abs(pnl))} P&L
    </Text>
  );
}
