import { NextResponse } from "next/server";
import { defaultHours } from "@/src/lib/store";

// GET /api/discounts
// Returns: [{ time: "08:00", discount: 15 }, ...]
export async function GET() {
  return NextResponse.json(defaultHours, { status: 200 });
}
