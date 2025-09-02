import { NextRequest, NextResponse } from "next/server";
import {
  getAccepted,
  saveAccepted,
  defaultHours,
  mergeWithDefaults,
} from "@/src/lib/store";
import { todayYMD } from "@/src/lib/time";

// GET /api/restaurants/:id/discounts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const date = new URL(req.url).searchParams.get("date") ?? todayYMD();
  const saved = getAccepted(id, date);
  const rows = mergeWithDefaults(saved, defaultHours); // full grid with overrides
  return NextResponse.json({ discounts: rows }, { status: 200 });
}

// POST /api/restaurants/:id/discounts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const date = new URL(req.url).searchParams.get("date") ?? todayYMD();

  const body = await req.json(); // expect [{ time:"HH:MM", discount:number }, ...]
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
  }

  const normalized = body.map((r: any) => ({
    time: String(r.time ?? ""),
    discount: Number(r.discount ?? r.percent ?? 0),
  }));

  saveAccepted(id, date, normalized);
  return NextResponse.json({ ok: true, saved: normalized.length }, { status: 200 });
}
