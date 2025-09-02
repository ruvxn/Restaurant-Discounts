import { NextRequest, NextResponse } from "next/server";
import { saveAccepted, defaultHours } from "@/src/lib/store";
import { todayYMD } from "@/src/lib/time";
import { callModelServer, type GenerateReq } from "@/src/lib/modelServer";
import { RESTAURANTS, openingHoursToList } from "@/src/lib/restaurants";

//const RESTAURANTS = [
  //{ id: "1", slug: "sunset-grill", open: 10, close: 22 },
  //{ id: "2", slug: "pasta-place",  open: 11, close: 23 },
  //{ id: "3", slug: "sushi-house",  open: 12, close: 21 },
//];



//function hours(open: number, close: number) {
  //const len = Math.max(0, close - open);
  //return Array.from({ length: len }, (_, i) => ({ hour: open + i }));
//}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  //const date = todayYMD();

  //test for different dates - DEBUGGING

  const url = new URL(req.url);
  const qDate = url.searchParams.get("date");
  const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : todayYMD();

  // -----


  const results: Array<Record<string, any>> = [];

  for (const r of RESTAURANTS) {
    const payload: GenerateReq = {
        restaurant_slug: r.slug,
        date,
        opening_hours: openingHoursToList(r),
        // optional enrichment (safe to omit)
        // @ts-ignore
        context: {
          total_seats: r.totalSeats,
          closing_time: r.close,
          categories: (r as any).category,
          average_bill_price: (r as any).averageBill,
          distance_to_cbd_km: (r as any).distanceKm,
          google_rating: (r as any).googleRating,
        },
      };

    try {
      const gen = await callModelServer(payload);
      const rows = gen.discounts
        .sort((a, b) => a.hour - b.hour)
        .map(d => ({ time: String(d.hour).padStart(2, "0") + ":00", discount: d.discountPct }));

      saveAccepted(r.id, date, rows);
      results.push({
        restaurant: r.slug,
        saved: rows.length,
        model_version: gen.model_version ?? null,
      });
    } catch (err: any) {
      // fallback: still save defaults so UI has something
      saveAccepted(r.id, date, defaultHours);
      results.push({
        restaurant: r.slug,
        saved: defaultHours.length,
        fallback: true,
        error: err?.message || "model server unreachable",
      });
    }
  }

  return NextResponse.json({ date, results }, { status: 200 });
}
