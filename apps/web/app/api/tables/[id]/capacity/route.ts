import { NextRequest, NextResponse } from 'next/server';
import { getTableAvailableCapacity, createStartsAt } from '@/lib/booking-utils';

/**
 * GET /api/tables/[id]/capacity
 * Returns real-time capacity information for a specific table at a given time
 * Query params:
 *   - date: ISO date string (e.g., "2025-10-02")
 *   - hour: hour number 0-23 (e.g., 17 for 5pm)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableIdStr } = await params;
    const { searchParams } = new URL(req.url);

    const dateStr = searchParams.get('date');
    const hourStr = searchParams.get('hour');

    if (!dateStr || !hourStr) {
      return NextResponse.json(
        { error: 'Date and hour are required' },
        { status: 400 }
      );
    }

    const tableId = parseInt(tableIdStr);
    const hour = parseInt(hourStr);

    if (isNaN(tableId)) {
      return NextResponse.json(
        { error: 'Invalid table ID' },
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

    const { availableSeats, totalCapacity, bookedSeats } = await getTableAvailableCapacity(
      tableId,
      startsAt
    );

    const occupancyRate = totalCapacity > 0
      ? Math.round((bookedSeats / totalCapacity) * 100)
      : 0;

    return NextResponse.json({
      tableId,
      availableSeats,
      totalCapacity,
      bookedSeats,
      isAvailable: availableSeats > 0,
      occupancyRate,
      timeWindow: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        duration: '2 hours',
      },
    });
  } catch (error: any) {
    console.error('Error fetching table capacity:', error);

    if (error.message === 'Table not found') {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch table capacity', details: error.message },
      { status: 500 }
    );
  }
}
