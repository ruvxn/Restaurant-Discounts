import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/src/lib/prisma';

// GET current customer profile
export async function GET() {
  try {
    const session = await requireAuth('CUSTOMER');

    const customer = await prisma.customer.findUnique({
      where: { accountId: session.accountId },
      select: {
        id: true,
        name: true,
        birthday: true,
        phone: true,
        interests: true,
        account: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: customer.name,
      email: customer.account.email,
      birthday: customer.birthday,
      phone: customer.phone,
      interests: customer.interests,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update customer profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth('CUSTOMER');
    const { name, email, birthday, phone, interests } = await req.json();

    // Validate input
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Prepare birthday as Date object if provided
    const birthdayDate = birthday ? new Date(birthday) : null;

    // Update customer profile
    await prisma.customer.update({
      where: { accountId: session.accountId },
      data: {
        name,
        birthday: birthdayDate,
        phone: phone || null,
        interests: interests || [],
      },
    });

    // Update account email if changed
    await prisma.account.update({
      where: { id: session.accountId },
      data: { email },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      name,
      email,
      birthday: birthdayDate,
      phone,
      interests,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
