import { NextRequest, NextResponse } from 'next/server';
import { calculateAvailableSeats, createStartsAt } from '@/lib/booking-utils';

/**
 * GET /api/restaurants/[id]/availability
 * Returns real-time seat availability for a restaurant at a specific time
 * This calculates availability for a 2-hour booking window starting at the given time
 * Query params:
 *   - date: ISO date string
 *   - hour: hour number 0-23
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantIdStr } = await params;
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
    const hour = parseInt(hourStr);

    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400 }
      );
    }

    if (isNaN(hour) || hour < 0 || hour > 23) {
      return NextResponse.json(
        { error: 'Invalid hour (must be 0-23)' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const startsAt = createStartsAt(date, hour);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    const { availableSeats, totalCapacity, bookedSeats } = await calculateAvailableSeats(
      restaurantId,
      startsAt
    );

    const occupancyRate = totalCapacity > 0
      ? Math.round((bookedSeats / totalCapacity) * 100)
      : 0;

    return NextResponse.json({
      availableSeats,
      totalCapacity,
      bookedSeats,
      occupancyRate,
      timeWindow: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        duration: '2 hours',
      },
    });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability', details: error.message },
      { status: 500 }
    );
  }
}
