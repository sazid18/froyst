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
});

describe("POST /api/mocks/drift", () => {
  it("drifts a market and returns it as JSON", async () => {
    const { POST } = await import("./mocks/drift/route");
    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isResolved).toBe(false);
  });
});
