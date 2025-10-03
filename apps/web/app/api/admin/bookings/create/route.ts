import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import {
  calculateMenuTotal,
  getDiscountForDateTime,
  applyDiscount,
  hourToTimeString,
  createStartsAt,
  findAvailableTable,
  checkMenuCompatibility,
  generateMenuLockKey,
} from '@/lib/booking-utils';
import { z } from 'zod';

const prisma = new PrismaClient();

const createBookingSchema = z.object({
  customerId: z.number().int().positive(),
  bookingDate: z.string(),
  bookingTime: z.number().int().min(0).max(23),
  partySize: z.number().int().min(1).max(20),
  menuItems: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(20),
  })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId } = session;

    const json = await req.json();
    const parsed = createBookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, bookingDate, bookingTime, partySize, menuItems } = parsed.data;

    const date = new Date(bookingDate);
    const hour = bookingTime;
    const startsAt = createStartsAt(date, hour);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Validate menu items belong to this restaurant
    const menuItemIds = menuItems.map(item => item.menuItemId);
    const validMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
      },
    });

    if (validMenuItems.length !== menuItems.length) {
      return NextResponse.json(
        { error: 'Some menu items do not belong to your restaurant' },
        { status: 400 }
      );
    }

    // Create booking in transaction
    const booking = await prisma.$transaction(async (tx) => {
      const primaryMenuItemId = menuItems.length > 0 ? menuItems[0].menuItemId : null;

      // Find available table
      const tableId = await findAvailableTable(
        tx,
        restaurantId,
        startsAt,
        partySize,
        primaryMenuItemId
      );

      if (!tableId) {
        throw new Error('No available tables for the selected time and party size');
      }

      const compatibility = await checkMenuCompatibility(
        tx,
        restaurantId,
        tableId,
        startsAt,
        menuItems
      );

      if (!compatibility.compatible) {
        throw new Error(
          compatibility.reason === 'MENU_REQUIRED'
            ? `Table is locked to ${compatibility.existingLockKey}; please select that menu.`
            : `Table is reserved for ${compatibility.existingLockKey}.`
        );
      }

      // Get discount
      const timeString = hourToTimeString(hour);
      const discountPercent = await getDiscountForDateTime(restaurantId, date, timeString);

      // Calculate pricing
      const menuItemsForCalc = menuItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      }));

      const originalTotalCents = await calculateMenuTotal(menuItemsForCalc);
      const pricing = applyDiscount(originalTotalCents, discountPercent);

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          restaurantId,
          tableId,
          customerId,
          partySize,
          startsAt,
          endsAt,
          originalTotal: pricing.originalTotal,
          discountedTotal: pricing.discountedTotal,
          discountPercent,
          menuLockKey: primaryMenuItemId ? generateMenuLockKey(primaryMenuItemId) : null,
          status: 'BOOKED',
        },
      });

      // Create booking items
      await tx.bookingItem.createMany({
        data: menuItems.map(item => ({
          bookingId: newBooking.id,
          menuItemId: item.menuItemId,
          qty: item.quantity,
        })),
      });

      // Fetch complete booking
      const completeBooking = await tx.booking.findUnique({
        where: { id: newBooking.id },
        include: {
          customer: { select: { id: true, name: true } },
          table: { select: { id: true, label: true, seatingCap: true } },
          items: {
            include: {
              menuItem: {
                select: { id: true, name: true, priceCents: true },
              },
            },
          },
        },
      });

      return completeBooking;
    });

    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Admin booking creation error:', error);

    if (error.message?.includes('No available tables')) {
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
