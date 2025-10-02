import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  calculateMenuTotal,
  getDiscountForDateTime,
  applyDiscount,
  hourToTimeString,
  createStartsAt,
  findAvailableTable,
} from '@/lib/booking-utils';
import { updateBookingSchema } from '@/lib/booking-validation';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;

    if (!idStr) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
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
                description: true,
                priceCents: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking has already been cancelled' },
        { status: 400 }
      );
    }

    // Check if booking is at least 2 hours in the future
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (existingBooking.startsAt < twoHoursFromNow) {
      return NextResponse.json(
        { error: 'Cannot modify booking less than 2 hours before start time' },
        { status: 400 }
      );
    }

    // Parse request body
    const json = await req.json();
    const parsed = updateBookingSchema.safeParse(json);

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          error: 'Invalid booking update payload',
          details: flat,
        },
        { status: 400 }
      );
    }

    const { partySize, menuItems, bookingDate, bookingTime } = parsed.data;

    // Ensure payload actually changes something
    if (
      partySize === undefined &&
      bookingTime === undefined &&
      bookingDate === undefined &&
      menuItems === undefined
    ) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      );
    }

    // Use transaction for updates
    const updatedBooking = await prisma.$transaction(async (tx) => {
      let newStartsAt = existingBooking.startsAt;
      let newEndsAt = existingBooking.endsAt;
      let newTableId = existingBooking.tableId;
      let newDiscountPercent = existingBooking.discountPercent;
      let newOriginalTotal = existingBooking.originalTotal;
      let newDiscountedTotal = existingBooking.discountedTotal;

      // Handle date/time change
      let targetDate = new Date(existingBooking.startsAt);
      let targetHour = targetDate.getHours();

      if (bookingDate !== undefined) {
        targetDate = new Date(bookingDate + 'T12:00:00Z');
      }

      if (bookingTime !== undefined) {
        targetHour = bookingTime;
      }

      // If either date or time changed, recalculate startsAt and discount
      if (bookingDate !== undefined || bookingTime !== undefined) {
        newStartsAt = createStartsAt(targetDate, targetHour);
        newEndsAt = new Date(newStartsAt.getTime() + 2 * 60 * 60 * 1000);

        if (newStartsAt < twoHoursFromNow) {
          throw new Error('Cannot move booking to within 2 hours of the current time');
        }

        // Get new discount for the new date/time
        const timeString = hourToTimeString(targetHour);
        newDiscountPercent = await getDiscountForDateTime(
          existingBooking.restaurantId,
          targetDate,
          timeString
        );
      }

      // Handle party size change
      const newPartySize = partySize !== undefined ? partySize : existingBooking.partySize;

      if (newPartySize !== existingBooking.partySize || newStartsAt.getTime() !== existingBooking.startsAt.getTime()) {
        // Find new table with available capacity
        const foundTableId = await findAvailableTable(
          tx,
          existingBooking.restaurantId,
          newStartsAt,
          newPartySize
        );

        if (!foundTableId) {
          throw new Error(
            `No available tables for party of ${newPartySize} at the selected time`
          );
        }

        newTableId = foundTableId;
      }

      // Handle menu items change
      if (menuItems !== undefined) {
        // Delete existing items
        await tx.bookingItem.deleteMany({
          where: { bookingId: id },
        });

        // Add new items
        const filteredItems = menuItems.filter((item) => item.quantity > 0);

        if (filteredItems.length > 0) {
          // Ensure the new menu items belong to the restaurant
          const menuItemIds = filteredItems.map((item) => item.menuItemId);
          const restaurantMenuItems = await tx.menuItem.findMany({
            where: {
              id: { in: menuItemIds },
              restaurantId: existingBooking.restaurantId,
              isActive: true,
            },
            select: { id: true },
          });

          if (restaurantMenuItems.length !== menuItemIds.length) {
            throw new Error('Invalid menu item in update payload');
          }

          // Calculate new pricing
          const originalTotalCents = await calculateMenuTotal(
            filteredItems.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
            }))
          );
          const pricing = applyDiscount(originalTotalCents, newDiscountPercent);

          newOriginalTotal = pricing.originalTotal;
          newDiscountedTotal = pricing.discountedTotal;

          // Create new booking items
          await tx.bookingItem.createMany({
            data: filteredItems.map((item) => ({
              bookingId: id,
              menuItemId: item.menuItemId,
              qty: item.quantity,
              notes: item.notes,
            })),
          });
        } else {
          newOriginalTotal = 0;
          newDiscountedTotal = 0;
        }
      } else if (
        newDiscountPercent !== existingBooking.discountPercent &&
        existingBooking.originalTotal > 0
      ) {
        // Discount changed but menu items remain the same → recalc totals
        const originalTotalCents = Math.round(existingBooking.originalTotal * 100);
        const pricing = applyDiscount(originalTotalCents, newDiscountPercent);
        newOriginalTotal = pricing.originalTotal;
        newDiscountedTotal = pricing.discountedTotal;
      }

      // Update booking
      const updated = await tx.booking.update({
        where: { id },
        data: {
          partySize: newPartySize,
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          tableId: newTableId,
          discountPercent: newDiscountPercent,
          originalTotal: newOriginalTotal,
          discountedTotal: newDiscountedTotal,
          updatedAt: new Date(),
        },
        include: {
          restaurant: true,
          table: true,
          customer: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error('Booking update error:', error);

    if (error.message?.includes('No available tables')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (
      error.message?.includes('Invalid menu item') ||
      error.message?.includes('Cannot move booking')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update booking', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking already cancelled' },
        { status: 400 }
      );
    }

    // Check if booking is at least 24 hours in the future
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (existingBooking.startsAt < twentyFourHoursFromNow) {
      return NextResponse.json(
        { error: 'Cannot cancel booking less than 24 hours before start time. Please contact the restaurant.' },
        { status: 400 }
      );
    }

    // Optional cancellation reason (best-effort)
    let cancellationReason: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.reason === 'string') {
        cancellationReason = body.reason.slice(0, 500);
      }
    } catch (err) {
      // ignore body parse errors (common for DELETE without body)
    }

    // Soft delete by updating status
    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: cancelledBooking,
    });
  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking', details: error.message },
      { status: 500 }
    );
  }
}
