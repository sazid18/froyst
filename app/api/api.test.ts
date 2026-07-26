import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Route handlers import db.ts, which holds module-level mutable state —
// reset the module registry per test so each test starts from pristine
// seed data.
beforeEach(() => {
  vi.resetModules();
});

describe("GET /api/markets", () => {
  it("returns all 30 seeded markets as JSON", async () => {
    const { GET } = await import("./markets/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(30);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("yesPrice");
  });
});

describe("GET /api/markets/[id]", () => {
  it("returns the market for a known id", async () => {
    const { GET } = await import("./markets/[id]/route");
    const res = await GET(new Request("http://localhost/api/markets/crypto-1"), {
      params: Promise.resolve({ id: "crypto-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("crypto-1");
  });

  it("404s for an unknown id", async () => {
    const { GET } = await import("./markets/[id]/route");
    const res = await GET(new Request("http://localhost/api/markets/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/bids", () => {
  it("400s without a userId", async () => {
    const { GET } = await import("./bids/route");
    const res = await GET(new NextRequest("http://localhost/api/bids"));
    expect(res.status).toBe(400);
  });

  it("returns that user's bids as JSON", async () => {
    const { GET } = await import("./bids/route");
    const res = await GET(new NextRequest("http://localhost/api/bids?userId=demo-user"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/bids", () => {
  it("creates a confirmed bid and returns 201", async () => {
    const { POST } = await import("./bids/route");
    const res = await POST(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          marketId: "crypto-1",
          outcome: "yes",
          amount: 100,
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("confirmed");
    expect(body.marketId).toBe("crypto-1");
    expect(body.id).toMatch(/^srv-/);
  });

  it("400s on a missing field", async () => {
    const { POST } = await import("./bids/route");
    const res = await POST(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user", marketId: "crypto-1", outcome: "yes" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("400s on an invalid outcome", async () => {
    const { POST } = await import("./bids/route");
    const res = await POST(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          marketId: "crypto-1",
          outcome: "maybe",
          amount: 10,
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("400s on malformed JSON", async () => {
    const { POST } = await import("./bids/route");
    const res = await POST(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );

    expect(res.status).toBe(400);
  });

  it("returns the same bid for a repeated Idempotency-Key instead of creating a second one", async () => {
    // Regression: an offline-queued bid can be POSTed twice (the page's
    // reconnect flush and the service worker's Background Sync flush both
    // call flushOfflineQueue() independently, with no shared lock) — the
    // route must dedupe by this header rather than creating a bid per call.
    const { POST } = await import("./bids/route");
    const makeRequest = () =>
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "queue-item-1" },
        body: JSON.stringify({
          userId: "demo-user",
          marketId: "crypto-1",
          outcome: "yes",
          amount: 100,
        }),
      });

    const first = await POST(makeRequest());
    const second = await POST(makeRequest());
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(second.status).toBe(201);
    expect(secondBody.id).toBe(firstBody.id);

    const { GET } = await import("./bids/route");
    const listRes = await GET(new NextRequest("http://localhost/api/bids?userId=demo-user"));
    const bids = await listRes.json();
    expect(bids.filter((bid: { id: string }) => bid.id === firstBody.id)).toHaveLength(1);
  });
});

describe("POST /api/bids/[id]/cancel", () => {
  async function placeRestingBid() {
    const { GET: getMarket } = await import("./markets/[id]/route");
    const marketRes = await getMarket(new Request("http://localhost/api/markets/sports-5"), {
      params: Promise.resolve({ id: "sports-5" }),
    });
    const market = await marketRes.json();

    const { POST: postBid } = await import("./bids/route");
    const bidRes = await postBid(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          marketId: "sports-5",
          outcome: "yes",
          amount: market.liquidity + 5_000,
        }),
      })
    );
    return bidRes.json();
  }

  it("cancels the resting remainder and returns the updated bid", async () => {
    const bid = await placeRestingBid();
    expect(bid.status).toBe("resting");
    expect(bid.restingAmount).toBe(5_000);

    const { POST } = await import("./bids/[id]/cancel/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/bids/${bid.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user" }),
      }),
      { params: Promise.resolve({ id: bid.id }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("cancelled");
    // NOT reset to 0 — preserved so a client can still compute the
    // actually-filled amount (amount - restingAmount) after cancellation.
    expect(body.restingAmount).toBe(5_000);
  });

  it("400s when userId is missing", async () => {
    const bid = await placeRestingBid();
    const { POST } = await import("./bids/[id]/cancel/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/bids/${bid.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: bid.id }) }
    );

    expect(res.status).toBe(400);
  });

  it("400s for an unknown bid id", async () => {
    const { POST } = await import("./bids/[id]/cancel/route");
    const res = await POST(
      new NextRequest("http://localhost/api/bids/nope/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user" }),
      }),
      { params: Promise.resolve({ id: "nope" }) }
    );

    expect(res.status).toBe(400);
  });

  it("400s when the bid has nothing resting (already fully filled)", async () => {
    const { POST: postBid } = await import("./bids/route");
    const bidRes = await postBid(
      new NextRequest("http://localhost/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user", marketId: "crypto-1", outcome: "yes", amount: 10 }),
      })
    );
    const bid = await bidRes.json();
    expect(bid.status).toBe("confirmed");

    const { POST } = await import("./bids/[id]/cancel/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/bids/${bid.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user" }),
      }),
      { params: Promise.resolve({ id: bid.id }) }
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/mocks/drift", () => {
  it("drifts multiple markets and returns them as an array", async () => {
    const { POST } = await import("./mocks/drift/route");
    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(1);
    for (const market of body) {
      expect(market.isResolved).toBe(false);
    }
  });
});
