export type BidOutcome = "yes" | "no";

export type BidStatus = "pending" | "confirmed" | "failed";

export type ConnectionStatus =
  | "connecting"
  | "open"
  | "closed"
  | "reconnecting";

/** Matches the Chip atom's category union exactly (structural, not imported). */
export type MarketCategory =
  | "Crypto"
  | "Business"
  | "Sports"
  | "Politics"
  | "Pop Culture"
  | "Science";

export type Market = {
  id: string;
  question: string;
  category: MarketCategory;
  resolutionDate: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  isResolved: boolean;
};

export type Bid = {
  id: string;
  userId: string;
  marketId: string;
  outcome: BidOutcome;
  amount: number;
  price: number;
  status: BidStatus;
  createdAt: string;
};

export type BidPayload = {
  userId: string;
  marketId: string;
  outcome: BidOutcome;
  amount: number;
};

// ── WebSocket message envelope ──────────────────────────────────────────
// The socket is a transport only: messages get routed into the Query
// cache via setQueryData, never held as a second source of truth.

export type MarketUpdateMessage = {
  type: "MARKET_UPDATE";
  payload: { id: string } & Partial<
    Pick<Market, "yesPrice" | "noPrice" | "volume" | "liquidity">
  >;
};

export type BidUpdateMessage = {
  type: "BID_UPDATE";
  payload: Bid;
};

export type SocketMessage = MarketUpdateMessage | BidUpdateMessage;

// ── Offline bid queue ───────────────────────────────────────────────────
// Lives in IndexedDB (see app/lib/offline/offlineQueueDb.ts), not Zustand
// memory, so a queued bid survives a reload. `queueId` doubles as the
// client-generated Bid.id used for the optimistic entry in the
// `['bids', userId]` Query cache, so the flush step can find-and-replace
// it by id regardless of which browser session performs the flush.

export type OfflineBidQueueStatus = "pending-offline" | "syncing" | "failed";

export type OfflineBidQueueItem = {
  queueId: string;
  payload: BidPayload;
  status: OfflineBidQueueStatus;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

// ── Connection state ─────────────────────────────────────────────────────
// One store tracks all three signals — navigator.onLine, the online/
// offline window events (folded into browserOnline), and the WebSocket's
// readyState — and derives a single `status` from them. Never infer
// connection status from just one signal.

export type SocketReadyStateLabel = "connecting" | "open" | "closing" | "closed";

export type ConnectionState = {
  browserOnline: boolean;
  socketReadyState: SocketReadyStateLabel;
  status: ConnectionStatus;
};

// ── Install prompt ──────────────────────────────────────────────────────
// `beforeinstallprompt` is a non-standard Chromium event, not part of the
// TS DOM lib — declared minimally here rather than pulling in a types
// package for one event shape.

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type InstallPromptState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
};
