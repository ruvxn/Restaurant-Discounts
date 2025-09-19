// apps/web/app/api/admin/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
<<<<<<< Updated upstream
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
=======
import { PrismaClient } from "@prisma/client";
import { saveAccepted } from "@/src/lib/discountsRepo";

export const runtime = "nodejs"; // Prisma requires Node runtime

const prisma = new PrismaClient();
const MODEL_URL = process.env.MODEL_SERVER_URL ?? "http://localhost:8000";
const CRON_SECRET = process.env.CRON_SECRET ?? "dev-secret";

// POST /api/admin/refresh?date=YYYY-MM-DD
export async function POST(req: NextRequest) {
  // 1) simple auth
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) date param
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  // 3) load restaurants
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, slug: true, openHour: true, closeHour: true },
    orderBy: { id: "asc" },
  });

  // 4) per-restaurant: call model server, upsert rows
  const settled = await Promise.allSettled(
    restaurants.map(async (r) => {
      // build opening hours [openHour .. closeHour-1]
      const opening_hours = Array.from({ length: Math.max(0, r.closeHour - r.openHour) }, (_, i) => ({
        hour: r.openHour + i,
      }));

      const resp = await fetch(`${MODEL_URL}/v1/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: r.slug,
          date,
          opening_hours,
        }),
      });
      if (!resp.ok) {
        throw new Error(`model server ${resp.status} ${resp.statusText}`);
      }
      const data = await resp.json() as {
        discounts?: { hour: number; discountPct: number }[];
        model_version?: string;
      };

      // normalize for DB
      const rows =
        (data.discounts ?? []).map((d) => ({
          time: String(d.hour).padStart(2, "0") + ":00",
          discount: Math.round(Number(d.discountPct ?? 0)),
        })) ?? [];

      const saved = await saveAccepted(r.id, date, rows);
      return {
        ok: true,
        restaurant: r.slug,
        saved,
        model_version: data.model_version ?? null,
      };
    })
  );

  // 5) shape response (include failures per-restaurant)
  const results = settled.map((res, i) =>
    res.status === "fulfilled"
      ? res.value
      : { ok: false, restaurant: restaurants[i].slug, error: String(res.reason) }
  );
>>>>>>> Stashed changes

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
