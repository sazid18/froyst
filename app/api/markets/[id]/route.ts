import { NextResponse } from "next/server";
import { getMarket } from "../../../mocks/db";

// Next 16: context.params is a Promise — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const market = getMarket(id);

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  return NextResponse.json(market);
}
