import type { Bid, BidPayload, Market } from "../../types/state";

// Deliberately framework-free (no React/Next imports) — this module gets
// bundled into both the page and the service worker (via offlineQueueFlush,
// for Background Sync), and needs to stay safe in both environments.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchMarkets(): Promise<Market[]> {
  const res = await fetch(`${API_BASE}/api/markets`);
  if (!res.ok) {
    throw new Error(`Failed to load markets (${res.status})`);
  }
  return res.json();
}

export async function fetchMarket(id: string): Promise<Market> {
  const res = await fetch(`${API_BASE}/api/markets/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load market ${id} (${res.status})`);
  }
  return res.json();
}

export async function fetchBids(userId: string): Promise<Bid[]> {
  const res = await fetch(`${API_BASE}/api/bids?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    throw new Error(`Failed to load bids (${res.status})`);
  }
  return res.json();
}

/**
 * `idempotencyKey` (the offline queue's queueId when replaying a queued
 * bid) lets a backend dedupe a bid that was actually received but whose
 * response never made it back to a flaky connection.
 */
export async function postBid(payload: BidPayload, idempotencyKey?: string): Promise<Bid> {
  const res = await fetch(`${API_BASE}/api/bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to place bid (${res.status})`);
  }
  return res.json();
}
