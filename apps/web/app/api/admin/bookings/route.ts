import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

const prisma = new PrismaClient();

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

    // Get query parameters
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status'); // 'upcoming' | 'past' | 'all' (time-based)
    const bookingStatusParam = searchParams.get('bookingStatus'); // 'BOOKED' | 'CANCELLED' | 'COMPLETED'
    const limitParam = searchParams.get('limit');

    // Build where clause
    const where: any = {
      restaurantId,
    };

    // Filter by date if provided
    if (dateParam) {
      const date = new Date(dateParam);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startsAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Filter by time status (upcoming/past)
    if (statusParam) {
      const now = new Date();

      if (statusParam === 'upcoming') {
        where.startsAt = {
          ...where.startsAt,
          gte: now,
        };
      } else if (statusParam === 'past') {
        where.startsAt = {
          ...where.startsAt,
          lt: now,
        };
      }
    }

    // Filter by booking status (BOOKED/CANCELLED/COMPLETED)
    if (bookingStatusParam && bookingStatusParam !== 'all') {
      where.status = bookingStatusParam;
    }

    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            label: true,
            seatingCap: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                priceCents: true,
              },
            },
          },
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      take: limitParam ? parseInt(limitParam) : undefined,
    });

    // Calculate summary statistics
    const totalRevenue = bookings.reduce((sum, b) => sum + b.discountedTotal, 0);
    const totalSavings = bookings.reduce(
      (sum, b) => sum + (b.originalTotal - b.discountedTotal),
      0
    );
    const totalGuests = bookings.reduce((sum, b) => sum + b.partySize, 0);

    return NextResponse.json({
      bookings,
      summary: {
        totalBookings: bookings.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalSavings: parseFloat(totalSavings.toFixed(2)),
        totalGuests,
      },
    });
  } catch (error: any) {
    console.error('Admin bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
