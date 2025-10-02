import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  calculateMenuTotal,
  getDiscountForDateTime,
  applyDiscount,
  isFutureBooking,
  hourToTimeString,
  createStartsAt,
  findAvailableTable,
} from '@/lib/booking-utils';
import { createBookingSchema } from '@/lib/booking-validation';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Require CUSTOMER auth and get session
    const session = await requireAuth('CUSTOMER');

    const json = await req.json();
    const parsed = createBookingSchema.safeParse(json);

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          error: 'Invalid booking data',
          details: flat,
        },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      bookingDate,
      bookingTime, // hour (0-23)
      partySize,
      menuItems,
    } = parsed.data;

    const restaurantIdInt = restaurantId;
    const hour = bookingTime;

    const date = new Date(bookingDate);
    const startsAt = createStartsAt(date, hour);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    // Check if booking is for future date/time
    if (!isFutureBooking(startsAt)) {
      return NextResponse.json(
        { error: 'Booking must be for a future date and time' },
        { status: 400 }
      );
    }

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantIdInt },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get customer from session
    const customer = await prisma.customer.findUnique({
      where: { accountId: session.accountId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const customerIdInt = customer.id;

    // Ensure menu items (if any) belong to this restaurant
    if (menuItems.length > 0) {
      const menuItemIds = menuItems.map((item) => item.menuItemId);
      const restaurantMenuItems = await prisma.menuItem.findMany({
        where: {
          id: { in: menuItemIds },
          restaurantId: restaurantIdInt,
          isActive: true,
        },
        select: { id: true },
      });

      if (restaurantMenuItems.length !== menuItemIds.length) {
        return NextResponse.json(
          { error: 'One or more menu items are invalid for this restaurant' },
          { status: 400 }
        );
      }
    }

    // Use transaction with row-level locking to ensure data consistency
    const booking = await prisma.$transaction(async (tx) => {
      // Find available table with row-level locking (FOR UPDATE)
      const tableId = await findAvailableTable(tx, restaurantIdInt, startsAt, partySize);

      if (!tableId) {
        throw new Error(
          `No available tables for party of ${partySize}. Please try a different time or reduce party size.`
        );
      }

      // Get discount for this date and time
      const timeString = hourToTimeString(hour);
      const discountPercent = await getDiscountForDateTime(restaurantIdInt, date, timeString);

      console.log('=== BOOKING CREATION DEBUG ===');
      console.log('Restaurant ID:', restaurantIdInt);
      console.log('Date:', date);
      console.log('Time string:', timeString);
      console.log('Discount percent fetched:', discountPercent);

      // Calculate pricing
      const menuItemsInt = menuItems.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      }));

      const originalTotalCents = await calculateMenuTotal(menuItemsInt);
      console.log('Original total (cents):', originalTotalCents);

      const pricing = applyDiscount(originalTotalCents, discountPercent);
      console.log('Pricing after discount:', pricing);
      console.log('=== END DEBUG ===');

      // Create booking with original and discounted totals
      const newBooking = await tx.booking.create({
        data: {
          restaurantId: restaurantIdInt,
          tableId,
          customerId: customerIdInt,
          partySize,
          startsAt,
          endsAt,
          originalTotal: pricing.originalTotal,
          discountedTotal: pricing.discountedTotal,
          discountPercent,
          status: 'BOOKED',
        },
      });

      // Create booking items if menu items provided
      if (menuItems.length > 0) {
        await tx.bookingItem.createMany({
          data: menuItems.map((item) => ({
            bookingId: newBooking.id,
            menuItemId: item.menuItemId,
            qty: item.quantity,
            notes: item.notes,
          })),
        });
      }

      // Fetch complete booking with relations
      const completeBooking = await tx.booking.findUnique({
        where: { id: newBooking.id },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          table: {
            select: {
              id: true,
              label: true,
              seatingCap: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
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
      });

      return completeBooking;
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking,
        savings: booking.originalTotal - booking.discountedTotal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Booking creation error:', error);

    // Handle auth errors
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle duplicate booking (Prisma unique constraint violation)
    if (error.code === 'P2002' && error.meta?.target?.includes('customerId')) {
      return NextResponse.json(
        { error: 'You already have a booking for this table at this time. Please check your existing bookings or choose a different time slot.' },
        { status: 409 }
      );
    }

    // Handle capacity errors
    if (error.message?.includes('No available tables') || error.message?.includes('Insufficient capacity')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    );
  }
}
