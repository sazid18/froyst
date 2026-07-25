import { listMarkets } from "../../mocks/db";
import type { Market } from "../../types/state";

// Server Components can't fetch relative URLs (no browser origin), so
// page.tsx doesn't call /api/markets over HTTP for its initial render —
// this wraps the mock db directly. Kept async so swapping the mock db for
// a real one later doesn't change call sites, and to keep raw mock-data
// imports out of page.tsx itself.
export async function getInitialMarkets(): Promise<Market[]> {
  return listMarkets();
}
