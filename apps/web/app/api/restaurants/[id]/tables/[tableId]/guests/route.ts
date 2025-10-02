import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createStartsAt } from '@/lib/booking-utils';

const prisma = new PrismaClient();

/**
 * Convert string to Title Case
 * Example: "jazz music" -> "Jazz Music"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * GET /api/restaurants/[id]/tables/[tableId]/guests
 * Returns aggregated guest information for a specific table and time window
 *
 * Query params:
 *   - date: ISO date string (e.g., "2025-10-21")
 *   - hour: hour number 0-23 (e.g., 19 for 7pm)
 *
 * Returns:
 *   - totalGuests: sum of all party sizes
 *   - interests: de-duplicated array of customer interests (Title Case)
 *   - hasGenericFallback: true if no interests exist and fallback is used
 *   - bookingsCount: number of overlapping bookings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id: restaurantIdStr, tableId: tableIdStr } = await params;
    const { searchParams } = new URL(req.url);

    const dateStr = searchParams.get('date');
    const hourStr = searchParams.get('hour');

    if (!dateStr || !hourStr) {
      return NextResponse.json(
        { error: 'Date and hour are required' },
        { status: 400 }
      );
    }

    const restaurantId = parseInt(restaurantIdStr);
    const tableId = parseInt(tableIdStr);
    const hour = parseInt(hourStr);

    if (isNaN(restaurantId) || isNaN(tableId) || isNaN(hour)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    if (hour < 0 || hour > 23) {
      return NextResponse.json(
        { error: 'Invalid hour (must be 0-23)' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const startsAt = createStartsAt(date, hour);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    // Verify table exists and belongs to this restaurant
    const table = await prisma.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or does not belong to this restaurant' },
        { status: 404 }
      );
    }

    // Get all overlapping bookings for this table
    const bookings = await prisma.booking.findMany({
      where: {
        tableId,
        restaurantId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        partySize: true,
        customer: {
          select: {
            interests: true,
          },
        },
      },
    });

    // Aggregate party sizes
    const totalGuests = bookings.reduce((sum, booking) => sum + booking.partySize, 0);

    // Aggregate and de-duplicate interests (convert to Title Case)
    const interestsSet = new Set<string>();
    bookings.forEach((booking) => {
      booking.customer.interests.forEach((interest) => {
        const trimmed = interest.trim();
        if (trimmed.length > 0) {
          interestsSet.add(toTitleCase(trimmed));
        }
      });
    });

    const interests = Array.from(interestsSet);
    const hasGenericFallback = interests.length === 0;

    // If no interests, use generic fallback
    const finalInterests = hasGenericFallback ? ['Restaurant Enthusiasts'] : interests;

    return NextResponse.json({
      tableId,
      tableLabel: table.label,
      totalGuests,
      interests: finalInterests,
      hasGenericFallback,
      bookingsCount: bookings.length,
    });
  } catch (error: any) {
    console.error('Error fetching guest interests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest interests', details: error.message },
      { status: 500 }
    );
  }
}
