import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

const prisma = new PrismaClient();

// Model server URL from environment or default
const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    console.log('[refresh-discounts] Starting request');

    // Get admin session
    const session = await getAdminSessionFromRequest(req);
    console.log('[refresh-discounts] Session:', session ? 'found' : 'not found');

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId } = session;
    console.log('[refresh-discounts] RestaurantId:', restaurantId);

    // Parse request body for optional date parameter
    const body = await req.json().catch(() => ({}));
    const { startDate, days = 7 } = body;

    console.log('[refresh-discounts] Request body:', { startDate, days });

    // Default to today if no start date provided
    // Parse date string directly to avoid timezone issues
    let start: Date;
    if (startDate) {
      // Use UTC noon for date to ensure it stays on correct calendar day
      start = new Date(startDate + 'T12:00:00Z');
    } else {
      const today = new Date().toISOString().split('T')[0];
      start = new Date(today + 'T12:00:00Z');
    }

    console.log('[refresh-discounts] Start date object:', start);

    console.log('[refresh-discounts] Fetching restaurant details...');

    // Get restaurant details
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        slug: true,
        name: true,
        openHour: true,
        closeHour: true,
      },
    });

    console.log('[refresh-discounts] Restaurant:', restaurant?.name);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Generate discounts for each day
    let totalSlotsUpdated = 0;
    const results = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      console.log('[refresh-discounts] Processing date:', dateStr);

      try {
        // Generate opening hours array from restaurant hours
        const openHour = restaurant.openHour || 11;
        const closeHour = restaurant.closeHour || 22;
        const opening_hours = [];
        for (let hour = openHour; hour < closeHour; hour++) {
          opening_hours.push({ hour });
        }

        // Call ML service to generate discounts
        const mlResponse = await fetch(`${MODEL_SERVER_URL}/v1/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_slug: restaurant.slug,
            date: dateStr,
            opening_hours,
          }),
        });

        if (!mlResponse.ok) {
          console.error(`ML service error for ${dateStr}:`, await mlResponse.text());
          results.push({
            date: dateStr,
            success: false,
            error: 'ML service unavailable',
          });
          continue;
        }

        const mlData = await mlResponse.json();

        // mlData should have format: { discounts: [{ hour: 18, discountPct: 25 }, ...] }
        if (!mlData.discounts || !Array.isArray(mlData.discounts)) {
          results.push({
            date: dateStr,
            success: false,
            error: 'Invalid ML response format',
          });
          continue;
        }

        // Create date at noon UTC to avoid timezone issues
        // This ensures the date stays correct regardless of timezone conversion
        const dateOnly = new Date(dateStr + 'T12:00:00Z');

        console.log('[refresh-discounts] dateStr:', dateStr, 'dateOnly:', dateOnly.toISOString());

        // Delete existing discounts for this date
        await prisma.acceptedDiscount.deleteMany({
          where: {
            restaurantId,
            date: dateOnly,
          },
        });

        // Insert new discounts - convert hour to time format (HH:00)
        const discountsToCreate = mlData.discounts.map((item: any) => ({
          restaurantId,
          date: dateOnly,
          time: `${String(item.hour).padStart(2, '0')}:00`,
          discount: item.discountPct,
        }));

        await prisma.acceptedDiscount.createMany({
          data: discountsToCreate,
        });

        totalSlotsUpdated += discountsToCreate.length;

        results.push({
          date: dateStr,
          success: true,
          slotsUpdated: discountsToCreate.length,
        });
      } catch (error: any) {
        console.error(`Error processing discounts for ${dateStr}:`, error);
        results.push({
          date: dateStr,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Discounts refreshed for ${days} days`,
      totalSlotsUpdated,
      results,
      restaurantName: restaurant.name,
    });
  } catch (error: any) {
    console.error('Refresh discounts error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh discounts', details: error.message },
      { status: 500 }
    );
  }
}
