import { NextResponse, type NextRequest } from "next/server";
import type { BidOutcome, BidPayload } from "../../types/state";
import { createBid, listBids } from "../../mocks/db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  return NextResponse.json(listBids(userId));
}

function isValidPayload(value: unknown): value is BidPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as Record<string, unknown>;
  const validOutcomes: BidOutcome[] = ["yes", "no"];
  return (
    typeof payload.userId === "string" &&
    payload.userId.length > 0 &&
    typeof payload.marketId === "string" &&
    payload.marketId.length > 0 &&
    validOutcomes.includes(payload.outcome as BidOutcome) &&
    typeof payload.amount === "number" &&
    payload.amount > 0
  );
}

// StaleWhileRevalidate/NetworkOnly (see public/sw.ts) only affect how the
// service worker routes requests — this handler stays pure JSON with no
// cookies/session assumptions either way.
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid bid payload" }, { status: 400 });
  }

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
    const bid = createBid(payload, idempotencyKey);
    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to place bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
