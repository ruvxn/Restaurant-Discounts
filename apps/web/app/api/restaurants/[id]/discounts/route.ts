// apps/web/app/api/restaurants/[id]/discounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { defaultHours, mergeWithDefaults } from "@/src/lib/store";
<<<<<<< Updated upstream
import {
  getAccepted,
  saveAccepted,
  getRestaurantById,
  type AcceptedRow,
} from "@/src/lib/discountsRepo";
import { todayYMD } from "@/src/lib/time"; // if you have it; otherwise hardcode a fallback

function getDate(req: NextRequest): string {
  const d = req.nextUrl.searchParams.get("date");
  return d ?? (typeof todayYMD === "function" ? todayYMD() : new Date().toISOString().slice(0, 10));
}

=======
import { todayYMD } from "@/src/lib/time";
import { getAccepted, saveAccepted } from "@/src/lib/discountsRepo";

export const runtime = "nodejs"; // ensure Node (Prisma won't run on Edge)

// GET /api/restaurants/:id/discounts?date=YYYY-MM-DD
>>>>>>> Stashed changes
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
<<<<<<< Updated upstream
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ error: "Invalid restaurant id" }, { status: 400 });
=======
  const { id } = await ctx.params; // ✅ Next 15 App Router: await params
  const date = new URL(req.url).searchParams.get("date") ?? todayYMD();

  const saved = await getAccepted(Number(id), date); // ✅ DB-backed
  const rows = mergeWithDefaults(saved, defaultHours);
  return NextResponse.json({ discounts: rows }, { status: 200 });
}

// POST /api/restaurants/:id/discounts?date=YYYY-MM-DD
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // ✅ await
  const date = new URL(req.url).searchParams.get("date") ?? todayYMD();

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
>>>>>>> Stashed changes
  }

  const restaurant = await getRestaurantById(idNum);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

<<<<<<< Updated upstream
  const date = getDate(req);
  const saved = await getAccepted(idNum, date);
  const grid = mergeWithDefaults(saved, defaultHours); // unchanged contract

  return NextResponse.json(grid);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ error: "Invalid restaurant id" }, { status: 400 });
  }

  const restaurant = await getRestaurantById(idNum);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const date = getDate(req);

  let rows: AcceptedRow[];
  try {
    rows = await req.json();
    if (!Array.isArray(rows)) throw new Error("Body must be an array");
    for (const r of rows) {
      if (typeof r?.time !== "string" || typeof r?.discount !== "number") {
        throw new Error("Each row must be {time:string, discount:number}");
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Invalid JSON body" }, { status: 400 });
  }

  await saveAccepted(idNum, date, rows);

  // Return the merged grid (same shape as GET)
  const saved = await getAccepted(idNum, date);
  const grid = mergeWithDefaults(saved, defaultHours);
  return NextResponse.json(grid);
=======
  const saved = await saveAccepted(Number(id), date, normalized); // ✅ DB-backed
  return NextResponse.json({ ok: true, saved }, { status: 200 });
>>>>>>> Stashed changes
}
