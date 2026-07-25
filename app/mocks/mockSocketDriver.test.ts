import { act } from "react";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Market } from "../types/state";
import { useConnectionStore } from "../store/useConnectionStore";

const { applySocketMessageMock } = vi.hoisted(() => ({ applySocketMessageMock: vi.fn() }));
vi.mock("../lib/socket/socketManager", () => ({ applySocketMessage: applySocketMessageMock }));

const { createMockSocketDriver } = await import("./mockSocketDriver");

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "m1",
    question: "Q",
    category: "Crypto",
    resolutionDate: "2026-01-01T00:00:00.000Z",
    yesPrice: 0.5,
    noPrice: 0.5,
    volume: 1000,
    liquidity: 200,
    isResolved: false,
    ...overrides,
  };
}

describe("createMockSocketDriver", () => {
  let queryClient: QueryClient;
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    applySocketMessageMock.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    originalFetch = window.fetch;
    useConnectionStore.setState({
      browserOnline: true,
      socketReadyState: "closed",
      status: "closed",
    });
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("feeds socketReadyState (not status directly) on start", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    const driver = createMockSocketDriver(queryClient);

    driver.start();

    // status is DERIVED (deriveConnectionStatus), not set by the driver.
    expect(useConnectionStore.getState().socketReadyState).toBe("open");
    expect(useConnectionStore.getState().status).toBe("open");

    driver.stop();
    expect(useConnectionStore.getState().socketReadyState).toBe("closed");
  });

  it("still derives an offline status even while the mock reports open, if the browser goes offline", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    const driver = createMockSocketDriver(queryClient);
    driver.start();

    useConnectionStore.getState().setBrowserOnline(false);

    expect(useConnectionStore.getState().status).toBe("closed");
    driver.stop();
  });

  it("emits a MARKET_UPDATE roughly every 2s, built from the drift endpoint's response", async () => {
    const drifted = makeMarket({ id: "drift-1", yesPrice: 0.61 });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(drifted), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const driver = createMockSocketDriver(queryClient);
    driver.start();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/mocks/drift"),
      expect.objectContaining({ method: "POST" })
    );
    expect(applySocketMessageMock).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        type: "MARKET_UPDATE",
        payload: expect.objectContaining({ id: "drift-1", yesPrice: 0.61 }),
      })
    );

    driver.stop();
  });

  it("emits MARKET_UPDATE then BID_UPDATE ~300ms after a POST /api/bids resolves, without altering the response", async () => {
    const confirmedBid = {
      id: "srv-1",
      userId: "demo-user",
      marketId: "m1",
      outcome: "yes" as const,
      amount: 100,
      price: 0.5,
      status: "confirmed" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const freshMarket = makeMarket({ id: "m1", yesPrice: 0.51 });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (init?.method === "POST" && url.includes("/api/bids")) {
        return new Response(JSON.stringify(confirmedBid), { status: 200 });
      }
      if (url.includes("/api/markets/")) {
        return new Response(JSON.stringify(freshMarket), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const driver = createMockSocketDriver(queryClient);
    driver.start();

    let response: Response;
    await act(async () => {
      response = await window.fetch("/api/bids", { method: "POST", body: "{}" });
    });

    // The wrapped fetch must return the real response untouched.
    expect((await response!.clone().json()).id).toBe("srv-1");
    expect(applySocketMessageMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(applySocketMessageMock).toHaveBeenCalledTimes(2);
    expect(applySocketMessageMock.mock.calls[0][1]).toMatchObject({ type: "MARKET_UPDATE" });
    expect(applySocketMessageMock.mock.calls[1][1]).toMatchObject({
      type: "BID_UPDATE",
      payload: confirmedBid,
    });

    driver.stop();
  });

  it("restores the original fetch and clears the drift interval on stop", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const patchedFetch = window.fetch;

    const driver = createMockSocketDriver(queryClient);
    driver.start();
    expect(window.fetch).not.toBe(patchedFetch); // now wrapped

    driver.stop();

    // Driver stores fetch.bind(window), not the exact original reference,
    // so check restoration functionally: the restored fetch still
    // delegates straight through to the underlying mock.
    fetchMock.mockClear();
    await window.fetch("https://example.com/probe");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/probe");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).not.toHaveBeenCalled(); // no more drift ticks
  });
});
