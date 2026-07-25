const BACKGROUND_SYNC_TAG = "flush-bid-queue";

/**
 * Registers a Background Sync request so the service worker flushes the
 * offline queue as soon as connectivity returns, even if this tab closes
 * first (see the "sync" listener in public/sw.ts). Returns false where
 * Background Sync isn't supported (e.g. Safari) — callers should still
 * rely on the manual reconnect-triggered flush in AppStateProvider, which
 * this doesn't replace, only complements.
 */
export async function registerBidQueueSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.sync) {
      return false;
    }
    await registration.sync.register(BACKGROUND_SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}
