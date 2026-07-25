import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { flushOfflineQueue } from "../app/lib/offline/offlineQueueFlush";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }

  // Background Sync isn't part of the standard TS webworker lib.
  interface SyncEvent extends ExtendableEvent {
    readonly lastChance: boolean;
    readonly tag: string;
  }

  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }

  interface ServiceWorkerRegistration {
    readonly sync: {
      register(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
  }
}

declare const self: ServiceWorkerGlobalScope;

// POST /api/bids must never be served from — or silently "succeed" via —
// the cache. Listed first so it matches before any broader rule below.
// GET /api/markets uses stale-while-revalidate: serve the cached price
// instantly, then patch it in the background. (Live updates normally
// arrive over the WebSocket; this is the fallback for the initial load
// and for gaps in socket coverage.)
const appRuntimeCaching: RuntimeCaching[] = [
  {
    method: "POST",
    matcher: ({ url }) => url.pathname.startsWith("/api/bids"),
    handler: new NetworkOnly(),
  },
  {
    method: "GET",
    matcher: ({ url }) => url.pathname.startsWith("/api/markets"),
    handler: new StaleWhileRevalidate({ cacheName: "market-data" }),
  },
];

const serwist = new Serwist({
  // Precaches the built app shell (JS/CSS chunks) via the manifest below —
  // no separate shell list needed.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...appRuntimeCaching, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Background Sync: flush the offline bid queue as soon as the browser
// regains connectivity, even if no tab is open. Where Background Sync
// isn't supported (e.g. Safari), the page falls back to flushing manually
// on reconnect instead — see app/providers/AppStateProvider.tsx. Both
// paths call the same framework-free flushOfflineQueue().
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-bid-queue") {
    event.waitUntil(flushOfflineQueue());
  }
});
