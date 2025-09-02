import { NextRequest, NextResponse } from "next/server";
import { getRestaurantById } from "@/src/lib/restaurants";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const r = getRestaurantById(params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r, { status: 200 });
}
