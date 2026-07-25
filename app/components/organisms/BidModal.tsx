"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Icon, IconButton, Scrim, Text, cn } from "../atoms";
import { AmountField, BidEstimates, SidePicker } from "../molecules";
import { useMarketQuery } from "../../lib/query/marketQueries";
import { usePlaceBidMutation } from "../../lib/query/bidsQueries";
import { useBidModalStore } from "../../store/useBidModalStore";
import type { BidOutcome } from "../../types/state";
import { DEMO_USER_ID } from "./FilterBar";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function BidModal() {
  const isOpen = useBidModalStore((state) => state.isOpen);
  const marketId = useBidModalStore((state) => state.marketId);

  return (
    <>
      <Scrim open={isOpen} onDismiss={() => useBidModalStore.getState().close()} />
      {isOpen && marketId ? <BidModalDialog marketId={marketId} /> : null}
    </>
  );
}

/**
 * Split out so useMarketQuery/usePlaceBidMutation are only ever called
 * with a real marketId — this component only exists (mounts) while the
 * modal is open for a specific market, so there's no "id might be null"
 * case to route around inside the hooks themselves. This also means local
 * state (amount) is fresh on every open for free, via remounting.
 */
function BidModalDialog({ marketId }: { marketId: string }) {
  const outcome = useBidModalStore((state) => state.outcome);
  const { data: market } = useMarketQuery(marketId);
  const mutation = usePlaceBidMutation(DEMO_USER_ID);
  const [amount, setAmount] = useState<number | "">("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const titleId = useId();

  // Focus trap + restore.
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  // Esc to close, Tab/Shift+Tab cycles within the dialog.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        useBidModalStore.getState().close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedPrice =
    market && outcome ? (outcome === "yes" ? market.yesPrice : market.noPrice) : null;

  function handlePick(pickedOutcome: BidOutcome) {
    useBidModalStore.getState().setOutcome(pickedOutcome);
  }

  function handleSubmit() {
    if (!outcome || amount === "" || amount <= 0) {
      return;
    }
    mutation.mutate({
      payload: { userId: DEMO_USER_ID, marketId, outcome, amount },
      clientId: crypto.randomUUID(),
    });
  }

  const isPending = mutation.isPending;
  const isConfirmed = mutation.isSuccess && mutation.data.kind === "confirmed";
  const isQueued = mutation.isSuccess && mutation.data.kind === "queued";
  const isFailed = mutation.isError;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-20 flex items-center justify-center p-4 outline-none"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[10px] bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <Text as="h2" id={titleId} variant="heading" className="line-clamp-2">
            {market?.question ?? "Loading market…"}
          </Text>
          <IconButton
            icon={<Icon name="close" />}
            label="Close"
            onClick={() => useBidModalStore.getState().close()}
          />
        </div>

        {market && (
          <>
            <SidePicker
              outcome={outcome}
              yesPrice={market.yesPrice}
              noPrice={market.noPrice}
              onPick={handlePick}
            />
            <AmountField value={amount} onChange={setAmount} />
            <BidEstimates price={selectedPrice} amount={amount === "" ? 0 : amount} />

            {isQueued && (
              <Text as="p" variant="caption" className="text-ink-soft">
                Queued — sends when back online
              </Text>
            )}
            {isConfirmed && (
              <Text as="p" variant="caption" className="text-gain">
                Bid placed!
              </Text>
            )}
            {isFailed && (
              <Text as="p" variant="caption" className="text-no">
                {mutation.error?.message ?? "Something went wrong. Try again."}
              </Text>
            )}

            <Button
              onClick={handleSubmit}
              loading={isPending}
              disabled={!outcome || amount === "" || Number(amount) <= 0 || isPending}
              className={cn(isFailed && "bg-no")}
            >
              {isConfirmed ? "Place another bid" : isFailed ? "Retry" : "Place bid"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
