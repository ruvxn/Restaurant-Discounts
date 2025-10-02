/*
// apps/web/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

// Helper to parse session from cookie
function getSession(req: NextRequest) {
  const cookie = req.cookies.get('session')
  if (!cookie?.value) return null
  try {
    return JSON.parse(cookie.value)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check account role
  if (session.role === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { accountId: session.accountId },
      include: { restaurant: true },
    })
    return NextResponse.json({
      accountId: session.accountId,
      email: session.email,
      role: session.role,
      restaurant: admin?.restaurant ?? null,
    })
  }

  if (session.role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({
      where: { accountId: session.accountId },
    })
    return NextResponse.json({
      accountId: session.accountId,
      email: session.email,
      role: session.role,
      customer,
    })
  }

  return NextResponse.json(session)
}
*/

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  try {
    // Get session cookie
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse session JSON
    let sessionData
    try {
      sessionData = JSON.parse(session.value)
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get account with related data
    const account = await prisma.account.findUnique({
      where: { id: sessionData.accountId },
      include: {
        customer: true,
        admin: {
          include: {
            restaurant: true,
          },
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 401 })
    }

    // Return account info with role-specific data
    const responseData = {
      accountId: account.id,
      email: account.email,
      role: account.role,
      customer: account.customer,
      admin: account.admin,
      restaurant: account.admin?.restaurant || null,
      restaurantName: account.admin?.restaurant?.name || null,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
