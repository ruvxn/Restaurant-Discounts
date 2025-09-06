// apps/web/app/api/admin/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { saveAccepted, type AcceptedRow } from "@/src/lib/discountsRepo";
import { todayYMD } from "@/src/lib/time";

const MODEL_URL = process.env.MODEL_SERVER_URL;
const CRON_SECRET = process.env.CRON_SECRET;

function assertEnv() {
  if (!MODEL_URL) throw new Error("MODEL_SERVER_URL is not set");
  if (!CRON_SECRET) throw new Error("CRON_SECRET is not set");
}

function getDate(req: NextRequest): string {
  const d = req.nextUrl.searchParams.get("date");
  return d ?? (typeof todayYMD === "function" ? todayYMD() : new Date().toISOString().slice(0, 10));
}

function hoursList(openHour: number, closeHour: number) {
  const hours: { hour: number }[] = [];
  for (let h = openHour; h < closeHour; h++) hours.push({ hour: h });
  return hours;
}

function hhmm(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export async function POST(req: NextRequest) {
  try {
    assertEnv();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }

  // Auth: x-cron-secret header must match
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = getDate(req);
  const idParam = req.nextUrl.searchParams.get("id");
  const idNum = idParam ? Number(idParam) : null;
  if (idParam && !Number.isInteger(idNum)) {
    return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
  }

  // Pick target restaurants
  const restaurants = await prisma.restaurant.findMany({
    where: idNum ? { id: idNum } : undefined,
    orderBy: { id: "asc" },
  });
  if (restaurants.length === 0) {
    return NextResponse.json({ error: "Restaurant(s) not found" }, { status: 404 });
  }

  const results: any[] = [];

  for (const r of restaurants) {
    const opening_hours = hoursList(r.openHour, r.closeHour);

    const payload = {
      restaurant_slug: r.slug,
      date, // "YYYY-MM-DD"
      opening_hours, // [{hour:10}, ...]
      // context: {...} // optional enrichment later
    };

    const res = await fetch(`${MODEL_URL}/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      results.push({ restaurantId: r.id, slug: r.slug, ok: false, status: res.status, error: text });
      continue;
    }

    const data = await res.json();

    // Map model discounts -> rows [{time, discount}]
    const rows: AcceptedRow[] = Array.isArray(data?.discounts)
      ? data.discounts.map((d: any) => ({
          time: hhmm(Number(d.hour)),
          discount: Number(d.discountPct),
        }))
      : [];

    if (rows.length) {
      await saveAccepted(r.id, date, rows);
    }

    results.push({
      restaurantId: r.id,
      slug: r.slug,
      ok: true,
      saved: rows.length,
      model_version: data?.model_version ?? null,
      total_walkins: data?.total_walkins ?? null,
    });
  }

  return NextResponse.json({ date, results });
}
