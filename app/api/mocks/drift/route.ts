import { NextResponse } from "next/server";
import { driftRandomOpenMarkets } from "../../../mocks/db";

// Mock-only. The client-side mock socket driver (app/mocks/mockSocketDriver.ts,
// used only when NEXT_PUBLIC_WS_URL is unset) is a real browser-side module —
// it cannot reach into this server process's db.ts directly (client and
// server are separate runtimes even in local dev). This endpoint is the
// only way the driver's periodic price drift can land in the SAME db
// instance that GET /api/markets reads from, so REST refetches and the
// mock socket's emitted values actually agree. Returns an array — each
// tick drifts several markets at once, not just one.
export async function POST() {
  const markets = driftRandomOpenMarkets();
  if (markets.length === 0) {
    return NextResponse.json({ error: "No open markets to drift" }, { status: 404 });
  }
  return NextResponse.json(markets);
}
