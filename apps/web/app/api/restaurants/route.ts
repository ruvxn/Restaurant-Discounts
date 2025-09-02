import { NextResponse } from "next/server";
import { RESTAURANTS } from "@/src/lib/restaurants";

export async function GET() {
  // keep payload lean and frontend-friendly
  const rows = RESTAURANTS.map(({ id, slug, name, open, close, totalSeats, timezone }) => ({
    id, slug, name, open, close, totalSeats, timezone,
  }));
  return NextResponse.json(rows, { status: 200 });
}
