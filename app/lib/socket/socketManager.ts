import type { QueryClient } from "@tanstack/react-query";
import type { Bid, Market, SocketMessage } from "../../types/state";
import { queryKeys } from "../query/queryKeys";
import { reconcileOnReconnect } from "../query/reconnectReconciliation";
import { useConnectionStore } from "../../store/useConnectionStore";

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

/** Exponential backoff, capped, no jitter (kept simple/testable). */
export function computeBackoffDelay(attempt: number): number {
  const delay = INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** attempt;
  return Math.min(delay, MAX_BACKOFF_MS);
}

/**
 * Exported so the mock socket driver (app/mocks/mockSocketDriver.ts, used
 * in place of a real WebSocket when NEXT_PUBLIC_WS_URL is unset) can reuse
 * this exact cache-writing path instead of calling setQueryData itself —
 * the driver only decides *when* to apply a message, never *how*.
 */
export function applySocketMessage(queryClient: QueryClient, message: SocketMessage): void {
  if (message.type === "MARKET_UPDATE") {
    const { id, ...patch } = message.payload;
    queryClient.setQueryData<Market>(queryKeys.market(id), (old) =>
      old ? { ...old, ...patch } : old
    );
    return;
  }

  // BID_UPDATE: prepend-or-replace, deduped by id.
  const bid = message.payload;
  queryClient.setQueryData<Bid[]>(queryKeys.bids(bid.userId), (old) => {
    if (!old) {
      return [bid];
    }
    const existingIndex = old.findIndex((existing) => existing.id === bid.id);
    if (existingIndex === -1) {
      return [bid, ...old];
    }
    const next = [...old];
    next[existingIndex] = bid;
    return next;
  });
}

export type SocketManager = {
  connect: () => void;
  disconnect: () => void;
  send: (data: unknown) => void;
};

/**
 * Singleton-per-instance WebSocket manager: manual reconnect with
 * exponential backoff, and routes incoming messages into the Query cache
 * via setQueryData — the socket is a transport, never a second store.
 */
export function createSocketManager(url: string, queryClient: QueryClient): SocketManager {
  let socket: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let hasConnectedBefore = false;
  let manuallyClosed = false;

  function scheduleReconnect(): void {
    if (manuallyClosed) {
      return;
    }
    const delay = computeBackoffDelay(reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect(): void {
    manuallyClosed = false;
    useConnectionStore.getState().setSocketReadyState("connecting");
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      useConnectionStore.getState().setSocketReadyState("open");
      if (hasConnectedBefore) {
        // A real reconnect after a gap, not the initial connect —
        // cached prices may have missed updates while we were gone.
        reconcileOnReconnect(queryClient);
      }
      hasConnectedBefore = true;
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        applySocketMessage(queryClient, message);
      } catch {
        // Malformed message — drop it rather than crash the socket loop.
      }
    });

    socket.addEventListener("close", () => {
      useConnectionStore.getState().setSocketReadyState("closed");
      if (!manuallyClosed) {
        scheduleReconnect();
      }
    });

    socket.addEventListener("error", () => {
      socket?.close();
    });
  }

  function disconnect(): void {
    manuallyClosed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    socket?.close();
    socket = null;
    useConnectionStore.getState().setSocketReadyState("closed");
  }

  function send(data: unknown): void {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  return { connect, disconnect, send };
}
