import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import { formatDateLocal } from '@/src/lib/time';

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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get 7 days from now for upcoming bookings
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 1. Today's bookings count and total revenue
    const todaysBookings = await prisma.booking.findMany({
      where: {
        restaurantId,
        startsAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'BOOKED',
      },
      select: {
        id: true,
        discountedTotal: true,
        partySize: true,
      },
    });

    const todaysBookingsCount = todaysBookings.length;
    const todaysRevenue = todaysBookings.reduce(
      (sum, booking) => sum + booking.discountedTotal,
      0
    );

    // 2. Current seat occupancy percentage for today
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { totalSeats: true },
    });

    const totalSeats = restaurant?.totalSeats || 0;
    const occupiedSeats = todaysBookings.reduce(
      (sum, booking) => sum + booking.partySize,
      0
    );
    const occupancyPercentage = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

    // 3. Upcoming bookings for next 7 days
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        restaurantId,
        startsAt: {
          gte: today,
          lte: sevenDaysFromNow,
        },
        status: 'BOOKED',
      },
      select: {
        id: true,
        startsAt: true,
        partySize: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });

    // Group by date
    const bookingsByDate = upcomingBookings.reduce((acc: any, booking) => {
      // OLD: const dateKey = booking.startsAt.toISOString().split('T')[0];
      // NEW: Use formatDateLocal to avoid timezone conversion issues
      const dateKey = formatDateLocal(new Date(booking.startsAt));
      if (!acc[dateKey]) {
        acc[dateKey] = { count: 0, guests: 0 };
      }
      acc[dateKey].count++;
      acc[dateKey].guests += booking.partySize;
      return acc;
    }, {});

    // 4. Average discount being offered today
    const todaysDiscounts = await prisma.acceptedDiscount.findMany({
      where: {
        restaurantId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        discount: true,
      },
    });

    const averageDiscount =
      todaysDiscounts.length > 0
        ? todaysDiscounts.reduce((sum, d) => sum + d.discount, 0) / todaysDiscounts.length
        : 0;

    // 5. Most popular time slots (hours with most bookings)
    const timeSlotBookings = upcomingBookings.reduce((acc: any, booking) => {
      const hour = booking.startsAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const popularTimeSlots = Object.entries(timeSlotBookings)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }));

    // 6. Average party size
    const averagePartySize =
      todaysBookings.length > 0
        ? todaysBookings.reduce((sum, b) => sum + b.partySize, 0) / todaysBookings.length
        : 0;

    // 7. Total bookings vs completed
    const totalBookingsCount = await prisma.booking.count({
      where: { restaurantId, status: 'BOOKED' },
    });

    const completedBookingsCount = await prisma.booking.count({
      where: { restaurantId, status: 'COMPLETED' },
    });

    return NextResponse.json({
      today: {
        bookingsCount: todaysBookingsCount,
        revenue: parseFloat(todaysRevenue.toFixed(2)),
        occupancyPercentage: parseFloat(occupancyPercentage.toFixed(1)),
        averageDiscount: parseFloat(averageDiscount.toFixed(1)),
        averagePartySize: parseFloat(averagePartySize.toFixed(1)),
      },
      upcoming: {
        totalCount: upcomingBookings.length,
        byDate: bookingsByDate,
      },
      popularTimeSlots,
      stats: {
        totalSeats,
        occupiedSeats,
        totalBookings: totalBookingsCount,
        completedBookings: completedBookingsCount,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}
