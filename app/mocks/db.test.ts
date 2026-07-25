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
});

describe("db.driftRandomOpenMarket", () => {
  it("only ever drifts a non-resolved market", async () => {
    const db = await freshDb();
    for (let i = 0; i < 25; i += 1) {
      const drifted = db.driftRandomOpenMarket();
      expect(drifted?.isResolved).toBe(false);
    }
  });

  it("keeps prices within the valid 0.01–0.99 range", async () => {
    const db = await freshDb();
    for (let i = 0; i < 50; i += 1) {
      const drifted = db.driftRandomOpenMarket()!;
      expect(drifted.yesPrice).toBeGreaterThanOrEqual(0.01);
      expect(drifted.yesPrice).toBeLessThanOrEqual(0.99);
      expect(drifted.noPrice).toBeGreaterThanOrEqual(0.01);
      expect(drifted.noPrice).toBeLessThanOrEqual(0.99);
    }
  });
});
