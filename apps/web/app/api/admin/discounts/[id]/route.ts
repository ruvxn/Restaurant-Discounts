import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get admin session
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId, name } = session;
    const { id: idStr } = await params;
    const discountId = parseInt(idStr);

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { discount: newDiscount, overrideReason } = body;

    // Validate discount percentage
    if (typeof newDiscount !== 'number' || newDiscount < 5 || newDiscount > 50) {
      return NextResponse.json(
        { error: 'Discount must be between 5% and 50%' },
        { status: 400 }
      );
    }

    // Verify the discount exists and belongs to this restaurant
    const existingDiscount = await prisma.acceptedDiscount.findUnique({
      where: { id: discountId },
      select: { restaurantId: true, time: true, date: true },
    });

    if (!existingDiscount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      );
    }

    if (existingDiscount.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot modify another restaurant\'s discount' },
        { status: 403 }
      );
    }

    // Update the discount
    const updatedDiscount = await prisma.acceptedDiscount.update({
      where: { id: discountId },
      data: {
        discount: newDiscount,
        updatedAt: new Date(),
      },
    });

    // Log the override (you could create a separate DiscountOverride table for audit trail)
    // For now, we'll just include it in the response
    const auditLog = {
      discountId,
      time: existingDiscount.time,
      date: existingDiscount.date,
      oldValue: existingDiscount,
      newValue: newDiscount,
      overriddenBy: name,
      reason: overrideReason || 'No reason provided',
      timestamp: new Date(),
    };

    console.log('Discount override:', auditLog);

    return NextResponse.json({
      message: 'Discount updated successfully',
      discount: updatedDiscount,
      audit: auditLog,
    });
  } catch (error: any) {
    console.error('Discount update error:', error);
    return NextResponse.json(
      { error: 'Failed to update discount', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: idStr } = await params;
    const discountId = parseInt(idStr);

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      );
    }

    // Fetch the discount
    const discount = await prisma.acceptedDiscount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      );
    }

    if (discount.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access another restaurant\'s discount' },
        { status: 403 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error('Discount fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount', details: error.message },
      { status: 500 }
    );
  }
}
