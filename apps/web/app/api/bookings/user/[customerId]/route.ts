import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BookingSummaryResponse {
  id: number;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED';
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  discountPercent: number;
  originalTotal: number;
  discountedTotal: number;
  restaurant: {
    id: number;
    name: string;
    category: string | null;
  } | null;
  cancelledAt?: Date | null;
  items: Array<{
    id: number;
    quantity: number;
    notes?: string | null;
    menuItem: {
      id: number;
      name: string;
      price: number;
    };
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId: customerIdStr } = await params;

    if (!customerIdStr) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customerId = parseInt(customerIdStr);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customerId,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            category: true,
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
      orderBy: [{ startsAt: 'desc' }],
    });

    const now = new Date();
    const upcoming: BookingSummaryResponse[] = [];
    const past: BookingSummaryResponse[] = [];

    bookings.forEach((booking) => {
      const bookingDto: BookingSummaryResponse = {
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        partySize: booking.partySize,
        discountPercent: booking.discountPercent,
        originalTotal: booking.originalTotal,
        discountedTotal: booking.discountedTotal,
        restaurant: booking.restaurant,
        cancelledAt: booking.cancelledAt,
        items: booking.items.map((item) => ({
          id: item.id,
          quantity: item.qty,
          notes: item.notes,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            price: item.menuItem.priceCents / 100,
          },
        })),
      };

      const isFuture = booking.startsAt > now;
      const isCancelled = booking.status === 'CANCELLED';
      if (isFuture && !isCancelled) {
        upcoming.push(bookingDto);
      } else {
        past.push(bookingDto);
      }
    });

    upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const totalSavings = bookings.reduce((sum, booking) => {
      const savings = booking.originalTotal - booking.discountedTotal;
      return sum + (Number.isFinite(savings) ? savings : 0);
    }, 0);

    return NextResponse.json({
      upcoming,
      past,
      totalBookings: bookings.length,
      totalSavings: Number(totalSavings.toFixed(2)),
    });
  } catch (error: any) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
