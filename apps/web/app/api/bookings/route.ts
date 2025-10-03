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
  validateBookingPreTransaction,
  checkMenuCompatibility,
  generateMenuLockKey,
} from '@/lib/booking-utils';
import { createBookingSchema } from '@/lib/booking-validation';
import { requireAuth } from '@/lib/auth';
import { BookingError, BookingValidationError } from '@/lib/booking-errors';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  let restaurantIdInt: number | undefined;
  let partySize: number | undefined;
  let startsAt: Date | undefined;

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
      partySize: partySizeData,
      menuItems,
      tableId: requestedTableId, // Optional user-selected table
    } = parsed.data;

    restaurantIdInt = restaurantId;
    partySize = partySizeData;
    const hour = bookingTime;

    const date = new Date(bookingDate);
    startsAt = createStartsAt(date, hour);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    // Check if booking is for future date/time
    if (!isFutureBooking(startsAt)) {
      return NextResponse.json(
        {
          error: 'Booking must be for a future date and time',
          code: BookingError.PAST_BOOKING,
        },
        { status: 400 }
      );
    }

    // PRE-TRANSACTION VALIDATION
    // Perform cheap checks before entering transaction to fail fast
    const preCheck = await validateBookingPreTransaction(
      restaurantIdInt,
      startsAt,
      partySize,
      menuItems.length > 0 ? menuItems[0].menuItemId : undefined
    );

    if (!preCheck.valid) {
      console.log('[Booking] Pre-transaction validation failed:', {
        error: preCheck.error,
        message: preCheck.message,
        restaurantId: restaurantIdInt,
        partySize,
        startsAt: startsAt.toISOString(),
      });

      return NextResponse.json(
        {
          error: preCheck.message,
          code: preCheck.error,
        },
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
          {
            error: 'One or more menu items are invalid for this restaurant',
            code: BookingError.INVALID_MENU_ITEMS,
          },
          { status: 400 }
        );
      }
    }

    // Use transaction with row-level locking to ensure data consistency
    const booking = await prisma.$transaction(async (tx) => {
      let tableId: number;
      const primaryMenuItemId = menuItems.length > 0 ? menuItems[0].menuItemId : null;

      if (requestedTableId) {
        // User selected a specific table - verify it's available
        const requestedTable = await tx.diningTable.findUnique({
          where: { id: requestedTableId },
        });

        if (!requestedTable || requestedTable.restaurantId !== restaurantIdInt) {
          throw new BookingValidationError(
            BookingError.INVALID_TABLE,
            'The selected table is invalid for this restaurant.'
          );
        }

        if (requestedTable.seatingCap < partySize) {
          throw new BookingValidationError(
            BookingError.PARTY_TOO_LARGE,
            `The selected table (capacity: ${requestedTable.seatingCap}) cannot accommodate your party of ${partySize}.`
          );
        }

        // Check if table has enough available seats for this time slot
        const existingBookings = await tx.booking.findMany({
          where: {
            tableId: requestedTableId,
            status: 'BOOKED',
            startsAt: {
              lt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
            },
            endsAt: {
              gt: startsAt,
            },
          },
        });

        const bookedSeats = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
        const availableSeats = requestedTable.seatingCap - bookedSeats;

        if (availableSeats < partySize) {
          throw new BookingValidationError(
            BookingError.CAPACITY_EXCEEDED,
            `The selected table only has ${availableSeats} available seats for this time slot.`
          );
        }

        tableId = requestedTableId;
      } else {
        // Auto-assign table using existing logic
        const foundTableId = await findAvailableTable(
          tx,
          restaurantIdInt,
          startsAt,
          partySize,
          primaryMenuItemId
        );

        if (!foundTableId) {
          throw new BookingValidationError(
            BookingError.NO_TABLES,
            `No available tables for party of ${partySize}. Please try a different time or reduce party size.`
          );
        }

        tableId = foundTableId;
      }

      // Check menu lock compatibility (STRICT MODE: menu required if lock exists)
      const compatibility = await checkMenuCompatibility(
        tx,
        restaurantIdInt,
        tableId,
        startsAt,
        menuItems
      );

      if (!compatibility.compatible) {
        const message =
          compatibility.reason === 'MENU_REQUIRED'
            ? `This table already has guests who selected ${compatibility.existingLockKey}. Please choose that set menu before booking.`
            : `This table is reserved for ${compatibility.existingLockKey}. Please choose a different table or select the same menu.`;

        throw new BookingValidationError(BookingError.MENU_LOCKED, message);
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

      // Generate menu lock key if menu items are present
      const menuLockKey = primaryMenuItemId ? generateMenuLockKey(primaryMenuItemId) : null;

      console.log('[Menu Lock] Generated lock key:', menuLockKey);

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
          menuLockKey,
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
    console.error('Booking creation error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      restaurantId: restaurantIdInt,
      partySize,
      startsAt: startsAt?.toISOString(),
    });

    // Handle BookingValidationError with error codes
    if (error instanceof BookingValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 400 }
      );
    }

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
        {
          error: 'You already have a booking for this table at this time. Please check your existing bookings or choose a different time slot.',
          code: BookingError.DUPLICATE_BOOKING,
        },
        { status: 409 }
      );
    }

    // Handle capacity errors (legacy error messages)
    if (error.message?.includes('No available tables') || error.message?.includes('Insufficient capacity')) {
      return NextResponse.json(
        {
          error: error.message,
          code: BookingError.NO_TABLES,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    );
  }
}
