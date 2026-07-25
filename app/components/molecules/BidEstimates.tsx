import { Text, cn } from "../atoms";

export type BidEstimatesProps = {
  price: number | null;
  amount: number;
  className?: string;
};

const EM_DASH = "—";

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function BidEstimates({ price, amount, className }: BidEstimatesProps) {
  const hasEstimate = price !== null && price !== 0 && amount !== 0;
  const shares = hasEstimate ? amount / (price as number) : 0;
  const payout = hasEstimate ? Math.round(shares) : 0;

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Price per share",
      value: hasEstimate ? formatMoney(price as number) : EM_DASH,
    },
    {
      label: "Est. shares",
      value: hasEstimate ? shares.toFixed(1) : EM_DASH,
    },
    {
      label: "Payout if correct",
      value: hasEstimate ? `$${payout}` : EM_DASH,
    },
  ];

  return (
    <dl className={cn("flex flex-col gap-1.5 border-t border-dashed border-line pt-3", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <Text as="dt" variant="caption">
            {row.label}
          </Text>
          <Text as="dd" variant="num">
            {row.value}
          </Text>
        </div>
      ))}
    </dl>
  );
}
