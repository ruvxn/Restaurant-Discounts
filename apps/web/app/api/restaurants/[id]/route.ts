import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: "Invalid restaurant ID" }, { status: 400 });
    }

    // Fetch restaurant with related data
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        tables: {
          select: {
            id: true,
            label: true,
            seatingCap: true,
          },
          orderBy: {
            label: 'asc',
          },
        },
        menuItems: {
          where: { isActive: true },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Transform to match frontend expectations
    const response = {
      id: restaurant.id.toString(),
      slug: restaurant.slug,
      name: restaurant.name,
      open: restaurant.openHour,
      close: restaurant.closeHour,
      totalSeats: restaurant.totalSeats,
      googleRating: restaurant.googleRating,
      averageBill: restaurant.averageBill,
      distanceKm: restaurant.distanceKm,
      category: restaurant.category,
      timezone: "Australia/Melbourne",
      tables: restaurant.tables,
      menuItems: restaurant.menuItems,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
