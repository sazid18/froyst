import { createStore, del, get, keys, set, type UseStore } from "idb-keyval";
import type { BidPayload, OfflineBidQueueItem } from "../../types/state";

// Framework-free — this module is shared between the page (manual
// retry-on-reconnect) and the service worker (Background Sync), so it
// must not import React/Next or anything window-only. IndexedDB itself is
// available in both contexts.

const offlineQueueStore: UseStore = createStore("froyst-offline-queue-db", "bids");

export async function enqueueOfflineBid(
  payload: BidPayload,
  queueId: string
): Promise<OfflineBidQueueItem> {
  const item: OfflineBidQueueItem = {
    queueId,
    payload,
    status: "pending-offline",
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await set(queueId, item, offlineQueueStore);
  return item;
}

export async function getQueuedBids(): Promise<OfflineBidQueueItem[]> {
  const allKeys = await keys<string>(offlineQueueStore);
  const items = await Promise.all(
    allKeys.map((key) => get<OfflineBidQueueItem>(key, offlineQueueStore))
  );
  return items.filter((item): item is OfflineBidQueueItem => item !== undefined);
}

export async function updateQueuedBid(
  queueId: string,
  patch: Partial<OfflineBidQueueItem>
): Promise<void> {
  const existing = await get<OfflineBidQueueItem>(queueId, offlineQueueStore);
  if (!existing) {
    return;
  }
  await set(queueId, { ...existing, ...patch }, offlineQueueStore);
}

export async function removeQueuedBid(queueId: string): Promise<void> {
  await del(queueId, offlineQueueStore);
}
