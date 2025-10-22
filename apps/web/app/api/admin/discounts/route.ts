import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import { todayYMD } from '@/src/lib/time';

const prisma = new PrismaClient();

interface DiscountUpdate {
  id: number;
  discount: number;
}

export async function GET(req: NextRequest) {
  try {
    // Get admin session
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId } = session;
    const { searchParams } = new URL(req.url);

    // Get date parameter (default to today)
    const dateParam = searchParams.get('date');

    // Create date at noon UTC to avoid timezone issues
    // Query using date range to match any time on that calendar date
    let targetDate: string;
    if (dateParam) {
      targetDate = dateParam;
    } else {
      // OLD: targetDate = new Date().toISOString().split('T')[0];
      // NEW: Use todayYMD() to get local date without timezone conversion issues
      targetDate = todayYMD();
    }

    // Create date range for the entire day (noon to noon covers full day in any timezone)
    const dateStart = new Date(targetDate + 'T00:00:00Z');
    const dateEnd = new Date(targetDate + 'T23:59:59Z');

    // Fetch discounts for the restaurant and date (using range to handle timezone issues)
    const discounts = await prisma.acceptedDiscount.findMany({
      where: {
        restaurantId,
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
      orderBy: {
        time: 'asc',
      },
    });

    // For each discount, get the number of bookings received
    const discountsWithBookings = await Promise.all(
      discounts.map(async (discount) => {
        // Parse time to hour
        const [hourStr] = discount.time.split(':');
        const hour = parseInt(hourStr);

        // Create startsAt for this specific hour using targetDate
        const startsAt = new Date(targetDate + 'T00:00:00Z');
        startsAt.setUTCHours(hour, 0, 0, 0);

        const endsAt = new Date(startsAt);
        endsAt.setUTCHours(hour + 1, 0, 0, 0);

        // Count bookings for this time slot
        const bookingsCount = await prisma.booking.count({
          where: {
            restaurantId,
            startsAt: {
              gte: startsAt,
              lt: endsAt,
            },
          },
        });

        return {
          id: discount.id,
          time: discount.time,
          hour,
          discount: discount.discount,
          bookingsReceived: bookingsCount,
          createdAt: discount.createdAt,
          updatedAt: discount.updatedAt,
        };
      })
    );

    return NextResponse.json({
      date: targetDate,
      discounts: discountsWithBookings,
    });
  } catch (error: any) {
    console.error('Admin discounts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discounts', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Get admin session
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId } = session;

    // Parse request body
    const body = await req.json();
    const { updates } = body as { updates: DiscountUpdate[] };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      );
    }

    // Update each discount
    const results = await Promise.all(
      updates.map(async (update) => {
        // Verify the discount belongs to this restaurant
        const discount = await prisma.acceptedDiscount.findUnique({
          where: { id: update.id },
          select: { restaurantId: true },
        });

        if (!discount || discount.restaurantId !== restaurantId) {
          throw new Error(`Discount ${update.id} not found or unauthorized`);
        }

        // Update the discount
        return await prisma.acceptedDiscount.update({
          where: { id: update.id },
          data: { discount: update.discount },
        });
      })
    );

    return NextResponse.json({
      message: `${results.length} discounts updated`,
      updated: results.length,
    });
  } catch (error: any) {
    console.error('Update discounts error:', error);
    return NextResponse.json(
      { error: 'Failed to update discounts', details: error.message },
      { status: 500 }
    );
  }
}
