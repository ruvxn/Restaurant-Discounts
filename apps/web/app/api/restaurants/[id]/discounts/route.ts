import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { todayYMD } from "@/src/lib/time";

// Default hours fallback
const defaultHours = [
  { time: "08:00", discount: 15 },
  { time: "09:00", discount: 20 },
  { time: "10:00", discount: 10 },
  { time: "11:00", discount: 10 },
  { time: "12:00", discount: 30 },
  { time: "13:00", discount: 20 },
  { time: "14:00", discount: 10 },
  { time: "15:00", discount: 10 },
  { time: "16:00", discount: 5 },
  { time: "17:00", discount: 15 },
  { time: "18:00", discount: 20 },
  { time: "19:00", discount: 25 },
  { time: "20:00", discount: 10 },
  { time: "21:00", discount: 5 },
  { time: "22:00", discount: 10 },
];

// GET /api/restaurants/:id/discounts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: "Invalid restaurant ID" }, { status: 400 });
    }

    const date = new URL(req.url).searchParams.get("date") ?? todayYMD();

    // Create date range for the entire day to handle timezone issues
    const dateStart = new Date(date + "T00:00:00Z");
    const dateEnd = new Date(date + "T23:59:59Z");

    // Fetch accepted discounts from database for this date
    const acceptedDiscounts = await prisma.acceptedDiscount.findMany({
      where: {
        restaurantId,
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
      select: {
        time: true,
        discount: true,
      },
      orderBy: {
        time: 'asc',
      },
    });

    // Create a map of saved discounts
    const savedMap = new Map(acceptedDiscounts.map(d => [d.time, d.discount]));

    // If we have saved discounts, use them; otherwise fall back to defaults
    let rows;
    if (acceptedDiscounts.length > 0) {
      // Convert saved discounts to the format expected by frontend
      rows = acceptedDiscounts.map(d => {
        const hour = parseInt(d.time.split(':')[0]);
        return {
          hour,
          discountPercentage: d.discount,
        };
      });
    } else {
      // Fall back to defaults
      rows = defaultHours.map(def => {
        const hour = parseInt(def.time.split(':')[0]);
        return {
          hour,
          discountPercentage: def.discount,
        };
      });
    }

    return NextResponse.json({ discounts: rows }, { status: 200 });
  } catch (error) {
    console.error('Get discounts error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/restaurants/:id/discounts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: "Invalid restaurant ID" }, { status: 400 });
    }

    const date = new URL(req.url).searchParams.get("date") ?? todayYMD();
    const dateObj = new Date(date + "T12:00:00Z");

    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
    }

    // Normalize the data
    const normalized = body.map((r: any) => ({
      time: String(r.time ?? ""),
      discount: Number(r.discount ?? r.percent ?? 0),
    }));

    // Delete existing discounts for this restaurant and date
    await prisma.acceptedDiscount.deleteMany({
      where: {
        restaurantId,
        date: dateObj,
      },
    });

    // Insert new discounts
    const createData = normalized.map(item => ({
      restaurantId,
      date: dateObj,
      time: item.time,
      discount: item.discount,
    }));

    await prisma.acceptedDiscount.createMany({
      data: createData,
    });

    return NextResponse.json({ ok: true, saved: normalized.length }, { status: 200 });
  } catch (error) {
    console.error('Save discounts error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
