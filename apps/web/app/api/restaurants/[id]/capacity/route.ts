import { NextRequest, NextResponse } from 'next/server';
import {
  getRestaurantTablesAvailability,
  calculateAvailableSeats,
  createStartsAt,
  getMenuLockForTimeWindow,
} from '@/lib/booking-utils';

/**
 * GET /api/restaurants/[id]/capacity
 * Returns real-time capacity information for a restaurant and all its tables
 * Query params:
 *   - date: ISO date string (e.g., "2025-10-02")
 *   - hour: hour number 0-23 (e.g., 17 for 5pm)
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

    // Get overall restaurant capacity
    const restaurantCapacity = await calculateAvailableSeats(restaurantId, startsAt);

    // Get detailed table-by-table breakdown
    const tablesAvailability = await getRestaurantTablesAvailability(restaurantId, startsAt);

    // Get menu lock for this time window
    const menuLockKey = await getMenuLockForTimeWindow(restaurantId, startsAt);

    return NextResponse.json({
      restaurant: {
        totalCapacity: restaurantCapacity.totalCapacity,
        availableSeats: restaurantCapacity.availableSeats,
        bookedSeats: restaurantCapacity.bookedSeats,
        occupancyRate: restaurantCapacity.totalCapacity > 0
          ? Math.round((restaurantCapacity.bookedSeats / restaurantCapacity.totalCapacity) * 100)
          : 0,
      },
      tables: tablesAvailability.map(table => ({
        id: table.tableId,
        label: table.tableLabel,
        totalCapacity: table.totalCapacity,
        availableSeats: table.availableSeats,
        bookedSeats: table.bookedSeats,
        isAvailable: table.availableSeats > 0,
        occupancyRate: table.totalCapacity > 0
          ? Math.round((table.bookedSeats / table.totalCapacity) * 100)
          : 0,
        // Menu lock info (applies to all tables in this time window)
        menuLocked: !!menuLockKey,
        lockKey: menuLockKey,
      })),
      timeWindow: {
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        duration: '2 hours',
      },
      // Top-level menu lock information for the entire time window
      menuLock: {
        isLocked: !!menuLockKey,
        lockKey: menuLockKey,
      },
    });
  } catch (error: any) {
    console.error('Error fetching capacity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity', details: error.message },
      { status: 500 }
    );
  }
}
