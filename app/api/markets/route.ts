import { NextResponse } from "next/server";
import { listMarkets } from "../../mocks/db";

export async function GET() {
  return NextResponse.json(listMarkets());
}
