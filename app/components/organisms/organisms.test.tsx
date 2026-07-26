import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { Bid, Market } from "../../types/state";
import { queryKeys } from "../../lib/query/queryKeys";
import { useBidModalStore } from "../../store/useBidModalStore";
import { useBidsPanelStore } from "../../store/useBidsPanelStore";
import { useConnectionStore } from "../../store/useConnectionStore";

const { fetchMarketsMock, fetchMarketMock, fetchBidsMock, postBidMock, cancelRestingBidMock } =
  vi.hoisted(() => ({
    fetchMarketsMock: vi.fn(),
    fetchMarketMock: vi.fn(),
    fetchBidsMock: vi.fn(),
    postBidMock: vi.fn(),
    cancelRestingBidMock: vi.fn(),
  }));
vi.mock("../../lib/query/api", () => ({
  fetchMarkets: fetchMarketsMock,
  fetchMarket: fetchMarketMock,
  fetchBids: fetchBidsMock,
  postBid: postBidMock,
  cancelRestingBid: cancelRestingBidMock,
}));

const { enqueueOfflineBidMock } = vi.hoisted(() => ({ enqueueOfflineBidMock: vi.fn() }));
vi.mock("../../lib/offline/offlineQueueDb", () => ({
  enqueueOfflineBid: enqueueOfflineBidMock,
}));
vi.mock("../../lib/offline/backgroundSync", () => ({
  registerBidQueueSync: vi.fn().mockResolvedValue(false),
}));

const { MarketRow } = await import("./MarketRow");
const { MarketTable } = await import("./MarketTable");
const { BidModal } = await import("./BidModal");
const { FilterBar } = await import("./FilterBar");
const { MyBidsSidebar } = await import("./MyBidsSidebar");

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "m1",
    question: "Will it happen?",
    category: "Crypto",
    resolutionDate: "2026-12-31T00:00:00.000Z",
    yesPrice: 0.6,
    noPrice: 0.4,
    volume: 100_000,
    liquidity: 20_000,
    isResolved: false,
    ...overrides,
  };
}

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: "bid-1",
    userId: "demo-user",
    marketId: "m1",
    outcome: "yes",
    amount: 100,
    price: 0.5,
    status: "confirmed",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderWithClient(ui: ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { queryClient: client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

beforeEach(() => {
  fetchMarketsMock.mockReset();
  fetchMarketMock.mockReset();
  fetchBidsMock.mockReset();
  postBidMock.mockReset();
  cancelRestingBidMock.mockReset();
  enqueueOfflineBidMock.mockReset();
  fetchBidsMock.mockResolvedValue([]);
  enqueueOfflineBidMock.mockResolvedValue({
    queueId: "q1",
    payload: { userId: "demo-user", marketId: "m1", outcome: "yes", amount: 50 },
    status: "pending-offline",
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });

  useBidModalStore.setState({ isOpen: false, marketId: null, outcome: null });
  useBidsPanelStore.setState({ isOpen: false });
  useConnectionStore.setState({ browserOnline: true, socketReadyState: "open", status: "open" });
});

describe("MarketRow", () => {
  it("renders market details once the query resolves", async () => {
    const market = makeMarket({ id: "row-1", question: "Row question" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("row-1"), market);

    renderWithClient(<MarketRow id="row-1" />, queryClient);

    expect(await screen.findByText("Row question")).toBeInTheDocument();
  });

  it("shows a resolved tag instead of PriceBar and isn't a clickable row when resolved", async () => {
    const market = makeMarket({ id: "row-2", isResolved: true });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("row-2"), market);

    const { container } = renderWithClient(<MarketRow id="row-2" />, queryClient);

    await screen.findByText(market.question);
    expect(screen.getByText("resolved")).toBeInTheDocument();
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("opens the bid modal with outcome defaulted to 'yes' on click, and closes the bids panel", async () => {
    const market = makeMarket({ id: "row-3" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("row-3"), market);
    useBidsPanelStore.setState({ isOpen: true });

    const { container } = renderWithClient(<MarketRow id="row-3" />, queryClient);
    await screen.findByText(market.question);

    fireEvent.click(container.querySelector('[role="button"]')!);

    expect(useBidModalStore.getState()).toMatchObject({
      isOpen: true,
      marketId: "row-3",
      outcome: "yes",
    });
    expect(useBidsPanelStore.getState().isOpen).toBe(false);
  });
});

describe("MarketTable", () => {
  it("shows skeletons while pending", () => {
    fetchMarketsMock.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithClient(
      <MarketTable filters={{ category: "All", query: "" }} />
    );

    expect(container.querySelectorAll('[role="presentation"]').length).toBeGreaterThan(0);
  });

  it("shows EmptyState when no markets match the filters", async () => {
    fetchMarketsMock.mockResolvedValue([
      makeMarket({ id: "a", category: "Crypto", question: "Crypto thing" }),
    ]);

    renderWithClient(<MarketTable filters={{ category: "Sports", query: "" }} />);

    expect(await screen.findByText("No markets found")).toBeInTheDocument();
  });

  it("filters by category, where 'All' passes everything", async () => {
    fetchMarketsMock.mockResolvedValue([
      makeMarket({ id: "a", category: "Crypto", question: "Crypto thing" }),
      makeMarket({ id: "b", category: "Sports", question: "Sports thing" }),
    ]);

    renderWithClient(<MarketTable filters={{ category: "Sports", query: "" }} />);

    await screen.findByText("Sports thing");
    expect(screen.queryByText("Crypto thing")).not.toBeInTheDocument();
  });

  it("filters case-insensitively by question text", async () => {
    fetchMarketsMock.mockResolvedValue([
      makeMarket({ id: "a", question: "Will BITCOIN moon?" }),
      makeMarket({ id: "b", question: "Will it rain?" }),
    ]);

    renderWithClient(<MarketTable filters={{ category: "All", query: "bitcoin" }} />);

    await screen.findByText("Will BITCOIN moon?");
    expect(screen.queryByText("Will it rain?")).not.toBeInTheDocument();
  });

  it("hides resolved markets", async () => {
    fetchMarketsMock.mockResolvedValue([
      makeMarket({ id: "a", question: "Open market", isResolved: false }),
      makeMarket({ id: "b", question: "Resolved market", isResolved: true }),
    ]);

    renderWithClient(<MarketTable filters={{ category: "All", query: "" }} />);

    await screen.findByText("Open market");
    expect(screen.queryByText("Resolved market")).not.toBeInTheDocument();
  });
});

describe("BidModal", () => {
  it("re-prices when the underlying market cache updates (a socket patch)", async () => {
    const market = makeMarket({ id: "bm-1", yesPrice: 0.4, noPrice: 0.6 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("bm-1"), market);
    useBidModalStore.setState({ isOpen: true, marketId: "bm-1", outcome: "yes" });

    renderWithClient(<BidModal />, queryClient);

    expect(await screen.findByText("$0.40")).toBeInTheDocument();

    act(() => {
      queryClient.setQueryData(queryKeys.market("bm-1"), {
        ...market,
        yesPrice: 0.55,
        noPrice: 0.45,
      });
    });

    expect(await screen.findByText("$0.55")).toBeInTheDocument();
  });

  it("shows the offline-queued state (not an error) when placed while offline", async () => {
    const market = makeMarket({ id: "bm-2" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("bm-2"), market);
    useBidModalStore.setState({ isOpen: true, marketId: "bm-2", outcome: "yes" });
    useConnectionStore.setState({ browserOnline: false, socketReadyState: "closed", status: "closed" });

    renderWithClient(<BidModal />, queryClient);

    fireEvent.change(await screen.findByRole("spinbutton"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Place bid" }));

    expect(await screen.findByText("Queued — sends when back online")).toBeInTheDocument();
    expect(enqueueOfflineBidMock).toHaveBeenCalledOnce();
    expect(postBidMock).not.toHaveBeenCalled();
  });

  it("shows the failed state, distinct from queued, on a real error response", async () => {
    const market = makeMarket({ id: "bm-3" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("bm-3"), market);
    useBidModalStore.setState({ isOpen: true, marketId: "bm-3", outcome: "yes" });
    postBidMock.mockRejectedValue(new Error("Failed to place bid (422)"));

    renderWithClient(<BidModal />, queryClient);

    fireEvent.change(await screen.findByRole("spinbutton"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Place bid" }));

    expect(await screen.findByText("Failed to place bid (422)")).toBeInTheDocument();
    expect(screen.queryByText("Queued — sends when back online")).not.toBeInTheDocument();
  });
});

describe("modal and bids-panel mutual exclusion", () => {
  it("opening the bid modal (row click) closes the bids panel", async () => {
    const market = makeMarket({ id: "excl-1" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.market("excl-1"), market);
    useBidsPanelStore.setState({ isOpen: true });

    const { container } = renderWithClient(<MarketRow id="excl-1" />, queryClient);
    await screen.findByText(market.question);

    fireEvent.click(container.querySelector('[role="button"]')!);

    expect(useBidsPanelStore.getState().isOpen).toBe(false);
    expect(useBidModalStore.getState().isOpen).toBe(true);
  });

  it("opening the bids panel (FilterBar) closes the bid modal", async () => {
    useBidModalStore.setState({ isOpen: true, marketId: "m1", outcome: "yes" });

    renderWithClient(
      <FilterBar category="All" query="" onCategoryChange={() => {}} onQueryChange={() => {}} />
    );

    fireEvent.click(await screen.findByRole("button", { name: /My bids/ }));

    expect(useBidModalStore.getState().isOpen).toBe(false);
    expect(useBidsPanelStore.getState().isOpen).toBe(true);
  });
});

describe("MyBidsSidebar", () => {
  it("shows a cancel action for a resting bid and calls the mutation with the bid id and userId", async () => {
    const restingBid = makeBid({ id: "bid-resting", status: "resting", amount: 100, restingAmount: 40 });
    fetchBidsMock.mockResolvedValue([restingBid]);
    fetchMarketMock.mockResolvedValue(makeMarket());
    // restingAmount is NOT reset to 0 on cancel — preserved as a
    // historical record (see cancelRestingBid's doc comment in db.ts).
    cancelRestingBidMock.mockResolvedValue({ ...restingBid, status: "cancelled" });
    useBidsPanelStore.setState({ isOpen: true });

    renderWithClient(<MyBidsSidebar />);

    expect(await screen.findByText("$40.00 resting")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Await the mutation's outcome before asserting the call — mutate()
    // invokes mutationFn asynchronously, so checking the mock synchronously
    // right after fireEvent.click would race ahead of it. A partially
    // filled bid shows "confirmed" (a real position exists), not
    // "cancelled" — see BidRow.tsx.
    expect(await screen.findByText("$40.00 resting cancelled")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
    expect(cancelRestingBidMock).toHaveBeenCalledWith("bid-resting", "demo-user");
  });

  it("does not show a cancel action for a fully filled bid", async () => {
    fetchBidsMock.mockResolvedValue([makeBid({ status: "confirmed" })]);
    fetchMarketMock.mockResolvedValue(makeMarket());
    useBidsPanelStore.setState({ isOpen: true });

    renderWithClient(<MyBidsSidebar />);

    await screen.findByText("bid-1");
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("rolls the optimistic cancel back if the request fails", async () => {
    const restingBid = makeBid({ id: "bid-resting", status: "resting", amount: 100, restingAmount: 40 });
    fetchBidsMock.mockResolvedValue([restingBid]);
    fetchMarketMock.mockResolvedValue(makeMarket());
    cancelRestingBidMock.mockRejectedValue(new Error("Failed to cancel bid (400)"));
    useBidsPanelStore.setState({ isOpen: true });

    renderWithClient(<MyBidsSidebar />);

    await screen.findByText("$40.00 resting");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Optimistic update flips it to cancelled immediately, then the
    // rejection rolls it back to resting.
    expect(await screen.findByText("$40.00 resting")).toBeInTheDocument();
  });
});
