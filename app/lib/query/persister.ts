import { createStore, del, get, set } from "idb-keyval";
import type { Persister } from "@tanstack/query-persist-client-core";

const PERSIST_KEY = "froyst-query-cache";
const persistStore = createStore("froyst-query-cache-db", "cache");

/** idb-keyval-backed Persister for @tanstack/query-persist-client-core. */
export function createIdbPersister(): Persister {
  return {
    persistClient: async (persistedClient) => {
      await set(PERSIST_KEY, persistedClient, persistStore);
    },
    restoreClient: async () => {
      return get(PERSIST_KEY, persistStore);
    },
    removeClient: async () => {
      await del(PERSIST_KEY, persistStore);
    },
  };
}
