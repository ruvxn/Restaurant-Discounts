import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { restaurantId } = session;

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        priceCents: true,
        category: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      menuItems,
    });
  } catch (error: any) {
    console.error('Menu items fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items', details: error.message },
      { status: 500 }
    );
  }
}
