import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

const prisma = new PrismaClient();

/**
 * DELETE /api/admin/bookings/[id]/cancel
 * Admin-only booking cancellation endpoint
 *
 * IMPORTANT: Admins can cancel bookings at ANY time, including:
 * - Bookings less than 24 hours away
 * - Bookings that are about to start
 * - Past bookings (mark as cancelled retroactively)
 *
 * This bypasses the customer 24-hour cancellation window restriction.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

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
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify admin has access to this restaurant's bookings
    if (existingBooking.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only cancel bookings for your restaurant' },
        { status: 403 }
      );
    }

    if (existingBooking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking already cancelled' },
        { status: 400 }
      );
    }

    // Parse cancellation reason from request body
    let cancellationReason = 'Cancelled by restaurant admin';
    try {
      const body = await req.json();
      if (body && typeof body.reason === 'string' && body.reason.trim()) {
        cancellationReason = body.reason.trim().slice(0, 500);
      }
    } catch (err) {
      // Use default reason if body parsing fails
    }

    // Admin can cancel at ANY time - no time restrictions
    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
        updatedAt: new Date(),
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
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
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Booking cancelled successfully by admin',
      booking: cancelledBooking,
      note: 'Admin cancellation - no time restrictions applied',
    });
  } catch (error: any) {
    console.error('Admin booking cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking', details: error.message },
      { status: 500 }
    );
  }
}
