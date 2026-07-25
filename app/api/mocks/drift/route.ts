import { NextResponse } from "next/server";
import { driftRandomOpenMarket } from "../../../mocks/db";

// Mock-only. The client-side mock socket driver (app/mocks/mockSocketDriver.ts,
// used only when NEXT_PUBLIC_WS_URL is unset) is a real browser-side module —
// it cannot reach into this server process's db.ts directly (client and
// server are separate runtimes even in local dev). This endpoint is the
// only way the driver's periodic price drift can land in the SAME db
// instance that GET /api/markets reads from, so REST refetches and the
// mock socket's emitted values actually agree.
export async function POST() {
  const market = driftRandomOpenMarket();
  if (!market) {
    return NextResponse.json({ error: "No open markets to drift" }, { status: 404 });
  }
  return NextResponse.json(market);
}
