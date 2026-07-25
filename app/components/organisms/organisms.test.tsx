import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { Market } from "../../types/state";
import { queryKeys } from "../../lib/query/queryKeys";
import { useBidModalStore } from "../../store/useBidModalStore";
import { useBidsPanelStore } from "../../store/useBidsPanelStore";
import { useConnectionStore } from "../../store/useConnectionStore";

const { fetchMarketsMock, fetchMarketMock, fetchBidsMock, postBidMock } = vi.hoisted(() => ({
  fetchMarketsMock: vi.fn(),
  fetchMarketMock: vi.fn(),
  fetchBidsMock: vi.fn(),
  postBidMock: vi.fn(),
}));
vi.mock("../../lib/query/api", () => ({
  fetchMarkets: fetchMarketsMock,
  fetchMarket: fetchMarketMock,
  fetchBids: fetchBidsMock,
  postBid: postBidMock,
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

function renderWithClient(ui: ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { queryClient: client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

beforeEach(() => {
  fetchMarketsMock.mockReset();
  fetchMarketMock.mockReset();
  fetchBidsMock.mockReset();
  postBidMock.mockReset();
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
