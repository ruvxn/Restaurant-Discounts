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
import { accounts } from '@/src/lib/store'

export async function GET(req: NextRequest) {
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

  const account = accounts.find((a) => a.id === sessionData.id)
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ account })
}
