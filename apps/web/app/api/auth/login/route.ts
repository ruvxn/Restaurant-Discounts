
/*
// apps/web/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import bcrypt from 'bcryptjs'

// Handle POST request for login
export async function POST(req: NextRequest) {
  // Parse request body
  const { email, password } = await req.json()

  // Find account by email
  const account = await prisma.account.findUnique({ where: { email } })
  if (!account || !account.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Compare provided password with stored hash
  const isValid = await bcrypt.compare(password, account.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Create a simple session object
  const session = JSON.stringify({
    accountId: account.id,
    email: account.email,
    role: account.role,
  })

  // Build the response
  const res = NextResponse.json({ success: true })
  // Attach session cookie
  res.cookies.set('session', session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
    // secure: process.env.NODE_ENV === 'production', // enable in production
  })

  return res
}
  */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from '@/src/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find account by email
    const account = await prisma.account.findUnique({ where: { email } })
    if (!account || !account.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Compare password with stored hash
    const valid = await bcrypt.compare(password, account.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session object with role-specific data
    const session: Record<string, unknown> = {
      accountId: account.id,
      email: account.email,
      role: account.role,
    }

    // Add role-specific fields to session
    if (account.role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({
        where: { accountId: account.id },
        select: { id: true, restaurantId: true, name: true },
      })

      if (!admin) {
        return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
      }

      session.adminId = admin.id
      session.restaurantId = admin.restaurantId
      session.name = admin.name
    } else if (account.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { accountId: account.id },
        select: { id: true, name: true },
      })

      if (customer) {
        session.customerId = customer.id
        session.name = customer.name
      }
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(
      'session',
      JSON.stringify(session),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      }
    )

    // Return full user data (AuthContext expects this shape)
    const responseData = {
      accountId: account.id,
      email: account.email,
      role: account.role,
      customer: session.customerId ? { id: session.customerId as number, name: session.name as string | null } : null,
      admin: session.adminId ? { id: session.adminId as number, name: session.name as string | null, restaurantId: session.restaurantId as number } : null,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
