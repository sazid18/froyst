import type { Bid, BidPayload, Market } from "../types/state";
import { MOCK_BIDS_SEED, MOCK_MARKETS } from "./data";

// In-memory mock backend. Framework-free (no React/Next imports) so it
// stays safe to import from route handlers (server) only — this module is
// NOT imported by any client code; the client reaches it exclusively
// through REST (see app/lib/query/api.ts) or, for the mock socket
// transport, through the /api/mocks/drift endpoint. One db instance feeds
// both, so REST reads and the mock socket never disagree.

const markets: Market[] = MOCK_MARKETS.map((market) => ({ ...market }));

const bidsByUserId = new Map<string, Bid[]>(
  Object.entries(MOCK_BIDS_SEED).map(([userId, bids]) => [userId, [...bids]])
);

let bidCounter = 0;

function clampPrice(price: number): number {
  return Math.min(0.99, Math.max(0.01, Number(price.toFixed(2))));
}

export function listMarkets(): Market[] {
  return markets;
}

export function getMarket(id: string): Market | undefined {
  return markets.find((market) => market.id === id);
}

export function listBids(userId: string): Bid[] {
  return bidsByUserId.get(userId) ?? [];
}

// MOCK-ONLY. Real bid-matching/pricing is explicitly out of scope for this
// codebase (see the state-management layer's design notes) — this is a
// minimal, isolated nudge so placing a bid visibly moves *something*, not
// a model of a real order book. Do not extend this into real pricing.
const MOCK_BID_PRICE_NUDGE = 0.01;
const MOCK_LIQUIDITY_SHARE = 0.4;

export function createBid(payload: BidPayload): Bid {
  const market = getMarket(payload.marketId);
  if (!market) {
    throw new Error(`Unknown market: ${payload.marketId}`);
  }

  bidCounter += 1;
  const bid: Bid = {
    // Server assigns its own id — BidPayload has none. Client-side
    // reconciliation (optimistic id === offline queueId) is how the
    // client later matches this up; the server doesn't need to know
    // about that id at all.
    id: `srv-${Date.now()}-${bidCounter}`,
    userId: payload.userId,
    marketId: payload.marketId,
    outcome: payload.outcome,
    amount: payload.amount,
    price: payload.outcome === "yes" ? market.yesPrice : market.noPrice,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  const existing = bidsByUserId.get(payload.userId) ?? [];
  bidsByUserId.set(payload.userId, [bid, ...existing]);

  market.volume += payload.amount;
  market.liquidity += Math.round(payload.amount * MOCK_LIQUIDITY_SHARE);

  if (!market.isResolved) {
    const nudge = payload.outcome === "yes" ? MOCK_BID_PRICE_NUDGE : -MOCK_BID_PRICE_NUDGE;
    market.yesPrice = clampPrice(market.yesPrice + nudge);
    market.noPrice = clampPrice(market.noPrice - nudge);
  }

  return bid;
}

// MOCK-ONLY, for the mock socket transport's ambient ~2s price drift (see
// app/mocks/mockSocketDriver.ts + app/api/mocks/drift/route.ts). Runs
// server-side so the drift lands in the SAME db instance REST reads from
// — the driver then emits a MARKET_UPDATE built from this function's
// return value, never an independently-invented one.
const DRIFT_STEP = 0.01;
const DRIFT_VOLUME_MIN = 500;
const DRIFT_VOLUME_RANGE = 4_000;
const DRIFT_LIQUIDITY_MIN = 100;
const DRIFT_LIQUIDITY_RANGE = 900;

export function driftRandomOpenMarket(): Market | undefined {
  const openMarkets = markets.filter((market) => !market.isResolved);
  if (openMarkets.length === 0) {
    return undefined;
  }

  const market = openMarkets[Math.floor(Math.random() * openMarkets.length)];
  const direction = Math.random() < 0.5 ? 1 : -1;

  market.yesPrice = clampPrice(market.yesPrice + direction * DRIFT_STEP);
  market.noPrice = clampPrice(market.noPrice - direction * DRIFT_STEP);
  market.volume += Math.round(DRIFT_VOLUME_MIN + Math.random() * DRIFT_VOLUME_RANGE);
  market.liquidity += Math.round(DRIFT_LIQUIDITY_MIN + Math.random() * DRIFT_LIQUIDITY_RANGE);

  return market;
}
