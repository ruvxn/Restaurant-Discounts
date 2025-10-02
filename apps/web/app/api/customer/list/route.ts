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

    const customers = await prisma.customer.findMany({
      include: {
        account: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const customersWithEmail = customers.map(customer => ({
      id: customer.id,
      name: customer.name || 'Unknown',
      email: customer.account.email,
    }));

    return NextResponse.json({
      customers: customersWithEmail,
    });
  } catch (error: any) {
    console.error('Customer list fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error.message },
      { status: 500 }
    );
  }
}
