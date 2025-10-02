import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AdminSession {
  accountId: number;
  email: string;
  role: 'ADMIN';
  adminId: number;
  restaurantId: number;
  name: string;
}

/**
 * Get admin session from cookies
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value);

    if (session.role !== 'ADMIN') {
      return null;
    }

    // Validate required fields
    if (!session.adminId || !session.restaurantId) {
      return null;
    }

    return session as AdminSession;
  } catch (error) {
    console.error('Error parsing admin session:', error);
    return null;
  }
}

/**
 * Get admin session from request headers (for API routes)
 */
export async function getAdminSessionFromRequest(req: NextRequest): Promise<AdminSession | null> {
  try {
    const sessionCookie = req.cookies.get('session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value);

    if (session.role !== 'ADMIN') {
      return null;
    }

    if (!session.adminId || !session.restaurantId) {
      return null;
    }

    return session as AdminSession;
  } catch (error) {
    console.error('Error parsing admin session from request:', error);
    return null;
  }
}

/**
 * Require admin session or throw error
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    throw new Error('Unauthorized: Admin session required');
  }

  return session;
}

/**
 * Verify admin has access to a specific restaurant
 */
export async function verifyAdminRestaurantAccess(
  adminId: number,
  restaurantId: number
): Promise<boolean> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { restaurantId: true },
  });

  return admin?.restaurantId === restaurantId;
}

/**
 * Get admin with full details
 */
export async function getAdminDetails(adminId: number) {
  return await prisma.admin.findUnique({
    where: { id: adminId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          openHour: true,
          closeHour: true,
          totalSeats: true,
          category: true,
        },
      },
      account: {
        select: {
          email: true,
        },
      },
    },
  });
}
