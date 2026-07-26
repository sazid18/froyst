import { NextResponse, type NextRequest } from "next/server";
import { cancelRestingBid } from "../../../../mocks/db";

// Next 16: context.params is a Promise — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = (body as Record<string, unknown> | null)?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const bid = cancelRestingBid(id, userId);
    return NextResponse.json(bid, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
