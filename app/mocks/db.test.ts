import { beforeEach, describe, expect, it, vi } from "vitest";

// db.ts holds module-level mutable state — reset the module registry per
// test so each test starts from the pristine seed data instead of
// inheriting mutations from a previous test.
async function freshDb() {
  vi.resetModules();
  return import("./db");
}

describe("db.listMarkets / db.getMarket", () => {
  it("lists all 30 seeded markets", async () => {
    const db = await freshDb();
    expect(db.listMarkets()).toHaveLength(30);
  });

  it("finds a market by id", async () => {
    const db = await freshDb();
    expect(db.getMarket("crypto-1")?.question).toContain("Bitcoin");
  });

  it("returns undefined for an unknown id", async () => {
    const db = await freshDb();
    expect(db.getMarket("does-not-exist")).toBeUndefined();
  });
});

describe("db.listBids", () => {
  it("returns an empty seed for demo-user", async () => {
    const db = await freshDb();
    expect(db.listBids("demo-user")).toEqual([]);
  });

  it("returns an empty array for an unknown user rather than throwing", async () => {
    const db = await freshDb();
    expect(db.listBids("nobody")).toEqual([]);
  });
});

describe("db.createBid", () => {
  it("assigns its own id (payload carries none) and confirms immediately", async () => {
    const db = await freshDb();
    const bid = db.createBid({
      userId: "demo-user",
      marketId: "crypto-2",
      outcome: "yes",
      amount: 100,
    });

    expect(bid.id).toMatch(/^srv-/);
    expect(bid.status).toBe("confirmed");
    expect(bid.marketId).toBe("crypto-2");
  });

  it("prices the bid at the market's current price for that outcome", async () => {
    const db = await freshDb();
    // getMarket returns a live reference into the mutable store, so
    // snapshot it — otherwise `before` reflects createBid's own mutation
    // by the time the assertion reads it.
    const before = { ...db.getMarket("crypto-2")! };
    const bid = db.createBid({
      userId: "demo-user",
      marketId: "crypto-2",
      outcome: "no",
      amount: 50,
    });

    expect(bid.price).toBe(before.noPrice);
  });

  it("prepends the new bid to that user's list", async () => {
    const db = await freshDb();
    const first = db.createBid({
      userId: "demo-user",
      marketId: "crypto-2",
      outcome: "yes",
      amount: 10,
    });
    const second = db.createBid({
      userId: "demo-user",
      marketId: "crypto-2",
      outcome: "yes",
      amount: 20,
    });

    expect(db.listBids("demo-user").map((b) => b.id)).toEqual([second.id, first.id]);
  });

  it("moves volume by the full amount and liquidity by ~40%", async () => {
    const db = await freshDb();
    const before = { ...db.getMarket("crypto-2")! };
    db.createBid({ userId: "demo-user", marketId: "crypto-2", outcome: "yes", amount: 100 });
    const after = db.getMarket("crypto-2")!;

    expect(after.volume).toBe(before.volume + 100);
    expect(after.liquidity).toBe(before.liquidity + 40);
  });

  it("nudges price toward yes on a yes bid, and away on a no bid, on an open market", async () => {
    const db = await freshDb();
    const before = { ...db.getMarket("crypto-2")! };
    db.createBid({ userId: "demo-user", marketId: "crypto-2", outcome: "yes", amount: 100 });
    const after = db.getMarket("crypto-2")!;

    expect(after.yesPrice).toBeCloseTo(before.yesPrice + 0.01, 5);
    expect(after.noPrice).toBeCloseTo(before.noPrice - 0.01, 5);
  });

  it("does not move price on a resolved market", async () => {
    const db = await freshDb();
    const before = db.getMarket("crypto-4")!; // seeded isResolved: true
    expect(before.isResolved).toBe(true);

    db.createBid({ userId: "demo-user", marketId: "crypto-4", outcome: "yes", amount: 100 });
    const after = db.getMarket("crypto-4")!;

    expect(after.yesPrice).toBe(before.yesPrice);
    expect(after.noPrice).toBe(before.noPrice);
  });

  it("throws for an unknown market", async () => {
    const db = await freshDb();
    expect(() =>
      db.createBid({ userId: "demo-user", marketId: "nope", outcome: "yes", amount: 10 })
    ).toThrow();
  });

  it("returns the same bid for a repeated idempotency key instead of creating a second one", async () => {
    // Regression: a queued offline bid can reach POST /api/bids twice (the
    // page's reconnect flush and the service worker's Background Sync
    // flush can both fire for the same queued item) — the server must
    // dedupe by the client-generated key rather than minting a new bid
    // per call.
    const db = await freshDb();
    const payload = { userId: "demo-user", marketId: "crypto-2", outcome: "yes" as const, amount: 100 };

    const first = db.createBid(payload, "client-key-1");
    const second = db.createBid(payload, "client-key-1");

    expect(second).toBe(first);
    expect(db.listBids("demo-user")).toHaveLength(1);
  });

  it("does not double-apply market volume/liquidity/price effects on a repeated idempotency key", async () => {
    const db = await freshDb();
    const before = { ...db.getMarket("crypto-2")! };
    const payload = { userId: "demo-user", marketId: "crypto-2", outcome: "yes" as const, amount: 100 };

    db.createBid(payload, "client-key-2");
    db.createBid(payload, "client-key-2");
    const after = db.getMarket("crypto-2")!;

    expect(after.volume).toBe(before.volume + 100);
    expect(after.yesPrice).toBeCloseTo(before.yesPrice + 0.01, 5);
  });

  it("still creates distinct bids for different idempotency keys", async () => {
    const db = await freshDb();
    const payload = { userId: "demo-user", marketId: "crypto-2", outcome: "yes" as const, amount: 10 };

    const first = db.createBid(payload, "client-key-a");
    const second = db.createBid(payload, "client-key-b");

    expect(second.id).not.toBe(first.id);
    expect(db.listBids("demo-user")).toHaveLength(2);
  });

  it("creates a new bid every call when no idempotency key is given", async () => {
    const db = await freshDb();
    const payload = { userId: "demo-user", marketId: "crypto-2", outcome: "yes" as const, amount: 10 };

    const first = db.createBid(payload);
    const second = db.createBid(payload);

    expect(second.id).not.toBe(first.id);
  });

  it("fully fills a bid at or under the market's liquidity, with no resting remainder", async () => {
    const db = await freshDb();
    const market = db.getMarket("sports-5")!; // seeded liquidity: 17,300
    const bid = db.createBid({
      userId: "demo-user",
      marketId: "sports-5",
      outcome: "yes",
      amount: market.liquidity,
    });

    expect(bid.status).toBe("confirmed");
    expect(bid.restingAmount).toBeUndefined();
  });

  it("rests the excess when a bid exceeds the market's liquidity", async () => {
    const db = await freshDb();
    const before = { ...db.getMarket("sports-5")! }; // seeded liquidity: 17,300
    const bid = db.createBid({
      userId: "demo-user",
      marketId: "sports-5",
      outcome: "yes",
      amount: before.liquidity + 5_000,
    });
    const after = db.getMarket("sports-5")!;

    expect(bid.status).toBe("resting");
    expect(bid.amount).toBe(before.liquidity + 5_000);
    expect(bid.restingAmount).toBe(5_000);
    // Only the filled portion (the liquidity that existed at placement
    // time) hits the market — the resting remainder hasn't executed.
    expect(after.volume).toBe(before.volume + before.liquidity);
    expect(after.yesPrice).toBeCloseTo(before.yesPrice + 0.01, 5);
  });

  it("cancelRestingBid cancels the resting remainder, keeping the filled portion untouched", async () => {
    const db = await freshDb();
    // Snapshot: getMarket returns a live reference, and createBid mutates
    // liquidity — read it before, not after, placing the bid.
    const before = { ...db.getMarket("sports-5")! };
    const requestedAmount = before.liquidity + 5_000;
    const bid = db.createBid({
      userId: "demo-user",
      marketId: "sports-5",
      outcome: "yes",
      amount: requestedAmount,
    });

    const cancelled = db.cancelRestingBid(bid.id, "demo-user");

    expect(cancelled.status).toBe("cancelled");
    // NOT reset to 0 — preserved so amount - restingAmount still
    // correctly identifies the filled portion after cancellation.
    expect(cancelled.restingAmount).toBe(5_000);
    expect(cancelled.amount).toBe(requestedAmount); // original ask preserved
    expect(db.listBids("demo-user")[0].status).toBe("cancelled"); // persisted, not just returned
  });

  it("cancelRestingBid throws for a bid that isn't resting", async () => {
    const db = await freshDb();
    const bid = db.createBid({ userId: "demo-user", marketId: "crypto-2", outcome: "yes", amount: 10 });

    expect(() => db.cancelRestingBid(bid.id, "demo-user")).toThrow();
  });

  it("cancelRestingBid throws for an unknown bid id", async () => {
    const db = await freshDb();
    expect(() => db.cancelRestingBid("nope", "demo-user")).toThrow();
  });

  it("cancelRestingBid throws when the bid belongs to a different user", async () => {
    const db = await freshDb();
    const market = db.getMarket("sports-5")!;
    const bid = db.createBid({
      userId: "owner",
      marketId: "sports-5",
      outcome: "yes",
      amount: market.liquidity + 5_000,
    });

    expect(() => db.cancelRestingBid(bid.id, "someone-else")).toThrow();
  });
});

describe("db.driftRandomOpenMarkets", () => {
  it("only ever drifts non-resolved markets", async () => {
    const db = await freshDb();
    for (let i = 0; i < 25; i += 1) {
      const drifted = db.driftRandomOpenMarkets();
      for (const market of drifted) {
        expect(market.isResolved).toBe(false);
      }
    }
  });

  it("keeps prices within the valid 0.01–0.99 range", async () => {
    const db = await freshDb();
    for (let i = 0; i < 50; i += 1) {
      const drifted = db.driftRandomOpenMarkets();
      for (const market of drifted) {
        expect(market.yesPrice).toBeGreaterThanOrEqual(0.01);
        expect(market.yesPrice).toBeLessThanOrEqual(0.99);
        expect(market.noPrice).toBeGreaterThanOrEqual(0.01);
        expect(market.noPrice).toBeLessThanOrEqual(0.99);
      }
    }
  });

  it("defaults to drifting 3 distinct markets when no count is given", async () => {
    const db = await freshDb();
    const drifted = db.driftRandomOpenMarkets();

    expect(drifted).toHaveLength(3);
    expect(new Set(drifted.map((market) => market.id)).size).toBe(3);
  });

  it("drifts the requested count of distinct markets", async () => {
    const db = await freshDb();
    const drifted = db.driftRandomOpenMarkets(7);

    expect(drifted).toHaveLength(7);
    expect(new Set(drifted.map((market) => market.id)).size).toBe(7);
  });

  it("caps at however many open markets exist if count exceeds that", async () => {
    const db = await freshDb();
    const openCount = db.listMarkets().filter((market) => !market.isResolved).length;

    const drifted = db.driftRandomOpenMarkets(1000);

    expect(drifted).toHaveLength(openCount);
  });
});
