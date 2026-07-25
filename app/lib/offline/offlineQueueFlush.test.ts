import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bid, OfflineBidQueueItem } from "../../types/state";
import { queryKeys } from "../query/queryKeys";

const { postBidMock } = vi.hoisted(() => ({ postBidMock: vi.fn() }));
vi.mock("../query/api", () => ({ postBid: postBidMock }));

const {
  getQueuedBidsMock,
  removeQueuedBidMock,
  updateQueuedBidMock,
} = vi.hoisted(() => ({
  getQueuedBidsMock: vi.fn(),
  removeQueuedBidMock: vi.fn(),
  updateQueuedBidMock: vi.fn(),
}));
vi.mock("./offlineQueueDb", () => ({
  getQueuedBids: getQueuedBidsMock,
  removeQueuedBid: removeQueuedBidMock,
  updateQueuedBid: updateQueuedBidMock,
}));

const { flushOfflineQueue, reconcileBidsCache } = await import("./offlineQueueFlush");

function makeQueueItem(overrides: Partial<OfflineBidQueueItem> = {}): OfflineBidQueueItem {
  return {
    queueId: "q1",
    payload: { userId: "u1", marketId: "m1", outcome: "yes", amount: 100 },
    status: "pending-offline",
    queuedAt: "2026-01-01T00:00:00.000Z",
    attempts: 0,
    ...overrides,
  };
}

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: "q1",
    userId: "u1",
    marketId: "m1",
    outcome: "yes",
    amount: 100,
    price: 0.5,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  postBidMock.mockReset();
  getQueuedBidsMock.mockReset();
  removeQueuedBidMock.mockReset();
  updateQueuedBidMock.mockReset();
});

describe("flushOfflineQueue", () => {
  it("removes a queue item and reports it confirmed on a successful POST", async () => {
    const item = makeQueueItem();
    getQueuedBidsMock.mockResolvedValue([item]);
    const confirmedBid = makeBid();
    postBidMock.mockResolvedValue(confirmedBid);

    const outcomes = await flushOfflineQueue();

    expect(postBidMock).toHaveBeenCalledWith(item.payload, item.queueId);
    expect(removeQueuedBidMock).toHaveBeenCalledWith(item.queueId);
    expect(outcomes).toEqual([
      { queueId: item.queueId, payload: item.payload, kind: "confirmed", bid: confirmedBid },
    ]);
  });

  it("leaves the item queued (still-offline) on a network-level failure", async () => {
    const item = makeQueueItem();
    getQueuedBidsMock.mockResolvedValue([item]);
    postBidMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const outcomes = await flushOfflineQueue();

    expect(removeQueuedBidMock).not.toHaveBeenCalled();
    expect(updateQueuedBidMock).not.toHaveBeenCalled();
    expect(outcomes).toEqual([
      { queueId: item.queueId, payload: item.payload, kind: "still-offline" },
    ]);
  });

  it("marks the item failed on a non-network error (e.g. a 4xx response)", async () => {
    const item = makeQueueItem();
    getQueuedBidsMock.mockResolvedValue([item]);
    postBidMock.mockRejectedValue(new Error("Failed to place bid (422)"));

    const outcomes = await flushOfflineQueue();

    expect(updateQueuedBidMock).toHaveBeenCalledWith(
      item.queueId,
      expect.objectContaining({ status: "failed", attempts: 1 })
    );
    expect(outcomes).toEqual([
      {
        queueId: item.queueId,
        payload: item.payload,
        kind: "failed",
        error: "Failed to place bid (422)",
      },
    ]);
  });
});

describe("reconcileBidsCache", () => {
  it("replaces the optimistic entry with the confirmed bid, matched by id", () => {
    const queryClient = new QueryClient();
    const optimistic = makeBid({ status: "pending" });
    queryClient.setQueryData(queryKeys.bids("u1"), [optimistic]);

    const confirmedBid = makeBid({ id: "q1", status: "confirmed" });
    reconcileBidsCache(queryClient, [
      { queueId: "q1", payload: optimistic, kind: "confirmed", bid: confirmedBid },
    ]);

    expect(queryClient.getQueryData(queryKeys.bids("u1"))).toEqual([confirmedBid]);
  });

  it("marks the entry failed without touching unrelated bids", () => {
    const queryClient = new QueryClient();
    const target = makeBid({ id: "q1" });
    const other = makeBid({ id: "other", userId: "u1" });
    queryClient.setQueryData(queryKeys.bids("u1"), [target, other]);

    reconcileBidsCache(queryClient, [
      { queueId: "q1", payload: target, kind: "failed", error: "boom" },
    ]);

    expect(queryClient.getQueryData(queryKeys.bids("u1"))).toEqual([
      { ...target, status: "failed" },
      other,
    ]);
  });

  it("leaves the optimistic entry untouched when still offline", () => {
    const queryClient = new QueryClient();
    const target = makeBid({ id: "q1" });
    queryClient.setQueryData(queryKeys.bids("u1"), [target]);

    reconcileBidsCache(queryClient, [
      { queueId: "q1", payload: target, kind: "still-offline" },
    ]);

    expect(queryClient.getQueryData(queryKeys.bids("u1"))).toEqual([target]);
  });

  it("groups outcomes by userId so it can reconcile multiple users' caches", () => {
    const queryClient = new QueryClient();
    const bidA = makeBid({ id: "qa", userId: "userA" });
    const bidB = makeBid({ id: "qb", userId: "userB" });
    queryClient.setQueryData(queryKeys.bids("userA"), [bidA]);
    queryClient.setQueryData(queryKeys.bids("userB"), [bidB]);

    reconcileBidsCache(queryClient, [
      { queueId: "qa", payload: bidA, kind: "confirmed", bid: { ...bidA, status: "confirmed" } },
      { queueId: "qb", payload: bidB, kind: "failed", error: "boom" },
    ]);

    expect(queryClient.getQueryData<Bid[]>(queryKeys.bids("userA"))?.[0].status).toBe(
      "confirmed"
    );
    expect(queryClient.getQueryData<Bid[]>(queryKeys.bids("userB"))?.[0].status).toBe(
      "failed"
    );
  });
});
