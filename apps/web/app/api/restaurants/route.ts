import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { todayYMD } from "@/src/lib/time";

export async function GET() {
  try {
    // Fetch restaurants from database with basic info
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        openHour: true,
        closeHour: true,
        totalSeats: true,
        googleRating: true,
        averageBill: true,
        distanceKm: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get today's date range for discount lookup
    // OLD: const today = new Date().toISOString().split('T')[0];
    // NEW: Use todayYMD() to get local date without timezone conversion issues
    const today = todayYMD();
    const dateStart = new Date(today + 'T00:00:00Z');
    const dateEnd = new Date(today + 'T23:59:59Z');

    // Transform to match frontend expectations with max discount
    const rows = await Promise.all(
      restaurants.map(async (r) => {
        // Get max discount for today
        const maxDiscountResult = await prisma.acceptedDiscount.findFirst({
          where: {
            restaurantId: r.id,
            date: {
              gte: dateStart,
              lte: dateEnd,
            },
          },
          orderBy: {
            discount: 'desc',
          },
          select: {
            discount: true,
          },
        });

        return {
          id: r.id.toString(),
          slug: r.slug,
          name: r.name,
          open: r.openHour,
          close: r.closeHour,
          totalSeats: r.totalSeats,
          googleRating: r.googleRating,
          averageBill: r.averageBill,
          distanceKm: r.distanceKm,
          category: r.category,
          timezone: "Australia/Melbourne",
          maxDiscount: maxDiscountResult?.discount || null,
        };
      })
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Get restaurants error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
