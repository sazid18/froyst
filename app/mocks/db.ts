import type { Bid, BidPayload, Market } from "../types/state";
import { MOCK_BIDS_SEED, MOCK_MARKETS } from "./data";

// In-memory mock backend. Framework-free (no React/Next imports) so it
// stays safe to import from route handlers (server) only — this module is
// NOT imported by any client code; the client reaches it exclusively
// through REST (see app/lib/query/api.ts) or, for the mock socket
// transport, through the /api/mocks/drift endpoint. One db instance feeds
// both, so REST reads and the mock socket never disagree.

type MockDbState = {
  markets: Market[];
  bidsByUserId: Map<string, Bid[]>;
  bidsByIdempotencyKey: Map<string, Bid>;
  bidCounter: number;
};

function createInitialState(): MockDbState {
  return {
    markets: MOCK_MARKETS.map((market) => ({ ...market })),
    bidsByUserId: new Map(
      Object.entries(MOCK_BIDS_SEED).map(([userId, bids]) => [userId, [...bids]])
    ),
    bidsByIdempotencyKey: new Map(),
    bidCounter: 0,
  };
}

// Next.js dev mode can recompile/hot-reload a route handler's module graph
// independently of other routes (its on-demand-entries page cache evicts
// routes idle for ~a minute), re-executing this file's top-level code and
// silently resetting module-scope state mid-session — observed directly: a
// bid created via POST /api/bids became "Unknown bid" to POST
// /api/bids/[id]/cancel after ~60s of other routes being hit, no server
// restart involved. Pin the store to `globalThis` in dev only — the same
// fix Next's own docs recommend for a Prisma Client singleton — so every
// route handler shares one instance regardless of which compiled bundle
// re-executes this module. Tests and production keep plain per-module
// state: production has exactly one process/module instance anyway, and
// tests rely on vi.resetModules() giving each test a fresh store, which a
// globalThis singleton would defeat.
const globalForMockDb = globalThis as unknown as { __froystMockDb?: MockDbState };

const state: MockDbState =
  process.env.NODE_ENV === "development"
    ? (globalForMockDb.__froystMockDb ??= createInitialState())
    : createInitialState();

const { markets, bidsByUserId, bidsByIdempotencyKey } = state;

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

export function createBid(payload: BidPayload, idempotencyKey?:string): Bid {
  if(idempotencyKey) {
    const existing = bidsByIdempotencyKey.get(idempotencyKey);
    if(existing) {
      return existing;
    }
  }
  const market = getMarket(payload.marketId);
  if (!market) {
    throw new Error(`Unknown market: ${payload.marketId}`);
  }

  // A bid larger than the market's current liquidity only fills up to that
  // depth immediately; the remainder rests (open, cancellable) rather than
  // executing. Boundary case (amount === liquidity) fully fills — only
  // *greater than* liquidity rests.
  const filledAmount = Math.min(payload.amount, market.liquidity);
  const restingAmount = payload.amount - filledAmount;

  state.bidCounter += 1;
  const bid: Bid = {
    // Server assigns its own id — BidPayload has none. Client-side
    // reconciliation (optimistic id === offline queueId) is how the
    // client later matches this up; the server doesn't need to know
    // about that id at all.
    id: `srv-${Date.now()}-${state.bidCounter}`,
    userId: payload.userId,
    marketId: payload.marketId,
    outcome: payload.outcome,
    amount: payload.amount,
    price: payload.outcome === "yes" ? market.yesPrice : market.noPrice,
    status: restingAmount > 0 ? "resting" : "confirmed",
    ...(restingAmount > 0 ? { restingAmount } : {}),
    createdAt: new Date().toISOString(),
  };

  if(idempotencyKey) bidsByIdempotencyKey.set(idempotencyKey, bid);

  const existing = bidsByUserId.get(payload.userId) ?? [];
  bidsByUserId.set(payload.userId, [bid, ...existing]);

  // Market effects only apply to the filled portion — the resting
  // remainder hasn't actually executed against the market yet.
  if (filledAmount > 0) {
    market.volume += filledAmount;
    market.liquidity += Math.round(filledAmount * MOCK_LIQUIDITY_SHARE);

    if (!market.isResolved) {
      const nudge = payload.outcome === "yes" ? MOCK_BID_PRICE_NUDGE : -MOCK_BID_PRICE_NUDGE;
      market.yesPrice = clampPrice(market.yesPrice + nudge);
      market.noPrice = clampPrice(market.noPrice - nudge);
    }
  }

  return bid;
}

/**
 * Cancels the still-open remainder of a resting bid (see createBid above).
 * Only `status` moves to "cancelled" — `restingAmount` is deliberately
 * NOT reset to 0. It's left as a historical record of how much never
 * filled, so `amount - restingAmount` keeps correctly reflecting the
 * actually-filled position after cancellation (both for P&L math and so
 * the UI can distinguish "this bid partially filled, then the leftover
 * order was cancelled" from "nothing here ever filled" — see BidRow.tsx).
 * Scoped to the bid's own `userId` so one user can't cancel another's
 * bid; an unknown id or wrong owner and a bid with nothing resting are
 * both just "can't cancel this," so both throw rather than silently no-op.
 */
export function cancelRestingBid(bidId: string, userId: string): Bid {
  const bid = (bidsByUserId.get(userId) ?? []).find((candidate) => candidate.id === bidId);
  if (!bid) {
    throw new Error(`Unknown bid: ${bidId}`);
  }
  if (bid.status !== "resting" || !bid.restingAmount) {
    throw new Error(`Bid ${bidId} has no resting amount to cancel`);
  }

  bid.status = "cancelled";
  return bid;
}

// MOCK-ONLY, for the mock socket transport's ambient ~2s price drift (see
// app/mocks/mockSocketDriver.ts + app/api/mocks/drift/route.ts). Runs
// server-side so the drift lands in the SAME db instance REST reads from
// — the driver then emits one MARKET_UPDATE per drifted market, built from
// this function's return values, never independently-invented ones.
const DRIFT_STEP = 0.01;
const DRIFT_VOLUME_MIN = 500;
const DRIFT_VOLUME_RANGE = 4_000;
const DRIFT_LIQUIDITY_MIN = 100;
const DRIFT_LIQUIDITY_RANGE = 900;
const DEFAULT_DRIFT_BATCH_SIZE = 3;

function driftMarket(market: Market): void {
  const direction = Math.random() < 0.5 ? 1 : -1;
  market.yesPrice = clampPrice(market.yesPrice + direction * DRIFT_STEP);
  market.noPrice = clampPrice(market.noPrice - direction * DRIFT_STEP);
  market.volume += Math.round(DRIFT_VOLUME_MIN + Math.random() * DRIFT_VOLUME_RANGE);
  market.liquidity += Math.round(DRIFT_LIQUIDITY_MIN + Math.random() * DRIFT_LIQUIDITY_RANGE);
}

/**
 * Drifts up to `count` distinct, randomly chosen non-resolved markets in
 * one call — fewer if there aren't that many open — so a single mock-
 * socket drift tick can move several rows on the page at once instead of
 * just one.
 */
export function driftRandomOpenMarkets(count: number = DEFAULT_DRIFT_BATCH_SIZE): Market[] {
  const openMarkets = markets.filter((market) => !market.isResolved);
  if (openMarkets.length === 0) {
    return [];
  }

  // Partial Fisher-Yates shuffle, then take the front — picks `count`
  // distinct markets (no repeats within one tick) without the awkwardness
  // of repeated random draws-with-rejection.
  const shuffled = [...openMarkets];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  for (const market of selected) {
    driftMarket(market);
  }
  return selected;
}
