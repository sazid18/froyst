import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bid } from "../../types/state";
import {
  AmountField,
  BidEstimates,
  BidRow,
  BidsSummary,
  CategorySelect,
  EmptyState,
  LiveCell,
  MarketMeta,
  PriceBar,
  SearchField,
  SidePicker,
} from ".";

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: "bid_1",
    userId: "u1",
    marketId: "m1",
    outcome: "yes",
    amount: 100,
    price: 0.5,
    status: "confirmed",
    createdAt: "2026-01-01T12:30:00.000Z",
    ...overrides,
  };
}

describe("SearchField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("echoes input locally right away but debounces onChange by ~200ms", () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "bitcoin" } });

    expect(input).toHaveValue("bitcoin");
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledExactlyOnceWith("bitcoin");
  });

  it("resets the debounce timer on each keystroke", () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "b" } });
    vi.advanceTimersByTime(150);
    fireEvent.change(input, { target: { value: "bi" } });
    vi.advanceTimersByTime(150);

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onChange).toHaveBeenCalledExactlyOnceWith("bi");
  });

  it("does not fire onChange after unmount", () => {
    const onChange = vi.fn();
    const { unmount } = render(<SearchField value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "eth" } });
    unmount();
    vi.advanceTimersByTime(500);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CategorySelect", () => {
  it("wires the Categories label to the select via htmlFor/id", () => {
    render(
      <CategorySelect
        categories={["Crypto", "Sports"]}
        value="Crypto"
        onChange={() => {}}
      />
    );

    expect(
      screen.getByRole("combobox", { name: "Categories" })
    ).toBeInTheDocument();
  });

  it("calls onChange with the picked category", () => {
    const onChange = vi.fn();
    render(
      <CategorySelect
        categories={["Crypto", "Sports"]}
        value="Crypto"
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Sports" },
    });

    expect(onChange).toHaveBeenCalledWith("Sports");
  });
});

describe("PriceBar", () => {
  it("computes the yes-fill width from yesPrice / (yesPrice + noPrice)", () => {
    const { container } = render(
      <PriceBar market={{ yesPrice: 0.6, noPrice: 0.4 }} />
    );
    const fill = container.querySelector(".bg-yes") as HTMLElement;

    expect(fill.style.width).toBe("60%");
  });

  it("recomputes width when prices update live", () => {
    const { container, rerender } = render(
      <PriceBar market={{ yesPrice: 0.3, noPrice: 0.7 }} />
    );
    rerender(<PriceBar market={{ yesPrice: 0.75, noPrice: 0.25 }} />);

    const fill = container.querySelector(".bg-yes") as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("marks the bar decorative", () => {
    const { container } = render(
      <PriceBar market={{ yesPrice: 0.5, noPrice: 0.5 }} />
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("MarketMeta", () => {
  it("renders the category chip and reflects favorite state", () => {
    render(
      <MarketMeta
        category="Crypto"
        isFavorite
        isFeatured={false}
        onToggleFavorite={() => {}}
      />
    );

    expect(screen.getByText("Crypto")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove from favorites" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the featured bolt only when isFeatured", () => {
    const { rerender, container } = render(
      <MarketMeta
        category="Crypto"
        isFavorite={false}
        isFeatured={false}
        onToggleFavorite={() => {}}
      />
    );
    expect(container.querySelector("svg.text-gold")).toBeNull();

    rerender(
      <MarketMeta
        category="Crypto"
        isFavorite={false}
        isFeatured
        onToggleFavorite={() => {}}
      />
    );
    expect(container.querySelector("svg.text-gold")).not.toBeNull();
  });

  it("stops the click from bubbling to a parent row button", () => {
    const onToggleFavorite = vi.fn();
    const onRowClick = vi.fn();

    render(
      <button onClick={onRowClick}>
        <MarketMeta
          category="Crypto"
          isFavorite={false}
          isFeatured={false}
          onToggleFavorite={onToggleFavorite}
        />
      </button>
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));

    expect(onToggleFavorite).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("LiveCell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not flash on first mount", () => {
    const { container } = render(<LiveCell value={100} tone="volume" />);
    expect(container.querySelector(".bg-gain-soft")).toBeNull();
  });

  it("flashes gain-soft for volume when the value changes, then clears after ~1s", () => {
    const { container, rerender } = render(
      <LiveCell value={100} tone="volume" />
    );
    rerender(<LiveCell value={150} tone="volume" />);

    expect(container.querySelector(".bg-gain-soft")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector(".bg-gain-soft")).toBeNull();
  });

  it("flashes yes-soft for liquidity", () => {
    const { container, rerender } = render(
      <LiveCell value={100} tone="liquidity" />
    );
    rerender(<LiveCell value={90} tone="liquidity" />);

    expect(container.querySelector(".bg-yes-soft")).not.toBeNull();
  });

  it("re-triggers the flash window on rapid consecutive updates", () => {
    const { container, rerender } = render(
      <LiveCell value={100} tone="volume" />
    );
    rerender(<LiveCell value={110} tone="volume" />);

    vi.advanceTimersByTime(300);
    rerender(<LiveCell value={120} tone="volume" />);

    // Original flash would have ended at t=1000 from the first change;
    // the second change at t=300 should have pushed it out to t=1300.
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(container.querySelector(".bg-gain-soft")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.querySelector(".bg-gain-soft")).toBeNull();
  });

  it("does not flash under prefers-reduced-motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);

    const { container, rerender } = render(
      <LiveCell value={100} tone="volume" />
    );
    rerender(<LiveCell value={200} tone="volume" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(container.querySelector(".bg-gain-soft")).toBeNull();
  });

  it("uses the default $ + thousands formatter", () => {
    render(<LiveCell value={12345} tone="volume" />);
    expect(screen.getByText("$12,345")).toBeInTheDocument();
  });
});

describe("SidePicker", () => {
  it("exposes a radiogroup with a radio per side", () => {
    render(
      <SidePicker
        outcome={null}
        yesPrice={0.35}
        noPrice={0.65}
        onPick={() => {}}
      />
    );

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("marks only the selected outcome as aria-checked", () => {
    render(
      <SidePicker
        outcome="yes"
        yesPrice={0.35}
        noPrice={0.65}
        onPick={() => {}}
      />
    );
    const [yesRadio, noRadio] = screen.getAllByRole("radio");

    expect(yesRadio).toHaveAttribute("aria-checked", "true");
    expect(noRadio).toHaveAttribute("aria-checked", "false");
  });

  it("calls onPick with the clicked side", () => {
    const onPick = vi.fn();
    render(
      <SidePicker
        outcome={null}
        yesPrice={0.35}
        noPrice={0.65}
        onPick={onPick}
      />
    );

    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onPick).toHaveBeenCalledWith("no");
  });
});

describe("AmountField", () => {
  it("wires the Amount label to the input", () => {
    render(<AmountField value={50} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveValue(
      50
    );
  });

  it("reports a parsed number on change", () => {
    const onChange = vi.fn();
    render(<AmountField value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "75" },
    });

    expect(onChange).toHaveBeenCalledWith(75);
  });

  it("reports an empty string when cleared", () => {
    const onChange = vi.fn();
    render(<AmountField value={75} onChange={onChange} />);

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "" },
    });

    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("BidEstimates", () => {
  it("shows an em-dash when price is null", () => {
    render(<BidEstimates price={null} amount={100} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("shows an em-dash when amount is 0", () => {
    render(<BidEstimates price={0.5} amount={0} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("computes shares (1dp) and whole-dollar payout", () => {
    render(<BidEstimates price={0.35} amount={100} />);

    expect(screen.getByText("285.7")).toBeInTheDocument();
    expect(screen.getByText("$286")).toBeInTheDocument();
  });
});

describe("BidRow", () => {
  it("computes value and P&L for a won settlement", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement="won"
      />
    );

    // shares = 100 / 0.5 = 200 -> value = 200, pnl = +100
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("+$100.00")).toBeInTheDocument();
    expect(screen.getByText("won")).toBeInTheDocument();
  });

  it("computes value and P&L for a lost settlement", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5 })}
        question="Will it happen?"
        currentPrice={0.9}
        settlement="lost"
      />
    );

    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("-$100.00")).toBeInTheDocument();
    expect(screen.getByText("lost")).toBeInTheDocument();
  });

  it("marks value-to-market for an open (unsettled) bid using currentPrice", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5 })}
        question="Will it happen?"
        currentPrice={0.6}
        settlement={null}
      />
    );

    // shares = 200 -> value = 200 * 0.6 = 120, pnl = +20
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("+$20.00")).toBeInTheDocument();
  });

  it("shows the bid status as the tag tone when unsettled", () => {
    render(
      <BidRow
        bid={makeBid({ status: "pending" })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("prefers settlement tone over bid status once resolved", () => {
    render(
      <BidRow
        bid={makeBid({ status: "confirmed" })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement="won"
      />
    );
    expect(screen.queryByText("confirmed")).toBeNull();
    expect(screen.getByText("won")).toBeInTheDocument();
  });

  it("renders the question and outcome tag", () => {
    render(
      <BidRow
        bid={makeBid({ outcome: "no" })}
        question="Will BTC hit 100k?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    expect(screen.getByText("Will BTC hit 100k?")).toBeInTheDocument();
    expect(screen.getByText("no")).toBeInTheDocument();
  });

  it("shows the resting amount and a cancel action for a resting bid", () => {
    const onCancelResting = vi.fn();
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "resting", restingAmount: 40 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
        onCancelResting={onCancelResting}
      />
    );

    expect(screen.getByText("$40.00 resting")).toBeInTheDocument();
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);
    expect(onCancelResting).toHaveBeenCalledOnce();
  });

  it("hides the cancel action when no onCancelResting handler is given", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "resting", restingAmount: 40 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    expect(screen.getByText("$40.00 resting")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("shows no resting line for a fully filled (non-resting) bid", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "confirmed" })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    expect(screen.queryByText(/resting/)).toBeNull();
  });

  it("computes shares/value/P&L off the filled amount only, not the full requested amount", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "resting", restingAmount: 40 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    // filled = 60 -> shares = 120 -> value at currentPrice 0.5 = $60, pnl = $0
    expect(screen.getByText("120.0 SH @ $0.50")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument();
    expect(screen.getByText("+$0.00")).toBeInTheDocument();
  });

  it("shows a confirmed tag (not cancelled) and a past-tense note once a partially-filled bid's resting remainder is cancelled", () => {
    // Regression: a bare "cancelled" tag on a bid that DID partially fill
    // reads as the whole bid being voided — it should read as a real,
    // confirmed position with a note about what got cancelled.
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "cancelled", restingAmount: 40 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    expect(screen.getByText("confirmed")).toBeInTheDocument();
    expect(screen.queryByText("cancelled")).toBeNull();
    expect(screen.getByText("$40.00 resting cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("still computes P&L off the filled amount after cancellation, not the full requested amount", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "cancelled", restingAmount: 40 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    // filled = 60 (unchanged by cancellation) -> shares = 120 -> value = $60
    expect(screen.getByText("120.0 SH @ $0.50")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument();
  });

  it("shows a cancelled tag when a bid never filled at all (nothing to call confirmed)", () => {
    render(
      <BidRow
        bid={makeBid({ amount: 100, price: 0.5, status: "cancelled", restingAmount: 100 })}
        question="Will it happen?"
        currentPrice={0.5}
        settlement={null}
      />
    );

    expect(screen.getByText("cancelled")).toBeInTheDocument();
    expect(screen.queryByText("confirmed")).toBeNull();
  });
});

describe("BidsSummary", () => {
  it("excludes failed bids from the count and totals", () => {
    const bids = [
      makeBid({ id: "1", amount: 100, status: "confirmed" }),
      makeBid({ id: "2", amount: 200, status: "pending" }),
      makeBid({ id: "3", amount: 150, status: "failed" }),
    ];

    render(<BidsSummary bids={bids} valueOf={(b) => b.amount * 1.2} />);

    // active total in = 300, now = 120 + 240 = 360, pnl = +60
    expect(
      screen.getByText("2 bids · in $300 · now $360 · +$60 P&L")
    ).toBeInTheDocument();
  });

  it("uses singular phrasing for exactly one bid", () => {
    const bids = [makeBid({ id: "1", amount: 50, status: "confirmed" })];
    render(<BidsSummary bids={bids} valueOf={(b) => b.amount} />);

    expect(
      screen.getByText("1 bid · in $50 · now $50 · +$0 P&L")
    ).toBeInTheDocument();
  });

  it("counts only the filled portion of a resting bid as 'in' capital", () => {
    const bids = [
      makeBid({ id: "1", amount: 100, status: "resting", restingAmount: 40 }),
    ];
    render(<BidsSummary bids={bids} valueOf={() => 60} />);

    // filled = 100 - 40 = 60 -> in $60, now $60, pnl $0
    expect(
      screen.getByText("1 bid · in $60 · now $60 · +$0 P&L")
    ).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders the title, description, and optional children", () => {
    render(
      <EmptyState title="No markets yet" description="Check back soon.">
        <button>Refresh</button>
      </EmptyState>
    );

    expect(
      screen.getByRole("heading", { name: "No markets yet" })
    ).toBeInTheDocument();
    expect(screen.getByText("Check back soon.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});
