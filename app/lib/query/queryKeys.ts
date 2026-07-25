/**
 * Centralized query-key factory. Keeps the existing key shapes exactly —
 * ['market', id], ['bids', userId] — just avoids re-typing the literal
 * arrays at every call site.
 */
export const queryKeys = {
  markets: () => ["markets"] as const,
  market: (id: string) => ["market", id] as const,
  bids: (userId: string) => ["bids", userId] as const,
};
