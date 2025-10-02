/*
// apps/web/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import bcrypt from 'bcryptjs'

// Define Role type manually (string literal union)
type Role = 'CUSTOMER' | 'ADMIN'

export async function POST(req: NextRequest) {
  // Capture raw request body (for debugging PowerShell curl issues)
  const raw = await req.text()
  console.log('RAW BODY:', raw)

  let body: {
    email?: string
    password?: string
    role?: Role
    name?: string
    restaurantId?: number
  }

  try {
    body = JSON.parse(raw)
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON body received', raw },
      { status: 400 }
    )
  }

  const { email, password, role, name, restaurantId } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Check if account already exists
  const exists = await prisma.account.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json(
      { error: 'Email already taken' },
      { status: 409 }
    )
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create account
  const account = await prisma.account.create({
    data: {
      email,
      passwordHash,
      role: (role as Role) ?? 'CUSTOMER', // default to CUSTOMER
    },
  })

  // Create related profile based on role
  if ((role as Role) === 'ADMIN') {
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId required for ADMIN' },
        { status: 400 }
      )
    }

    await prisma.admin.create({
      data: {
        accountId: account.id,
        restaurantId,
        name: name || 'Admin',
      },
    })
  } else {
    await prisma.customer.create({
      data: {
        accountId: account.id,
        name: name || 'Customer',
      },
    })
  }

  return NextResponse.json({ success: true, accountId: account.id })
}
*/

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from '@/src/lib/prisma'

type Role = 'CUSTOMER' | 'ADMIN'

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, name, restaurantId, interests } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if account already exists
    const exists = await prisma.account.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json(
        { error: 'Email already taken' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create account
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash,
        role: (role as Role) ?? 'CUSTOMER',
      },
    })

    let customer = null
    let admin = null

    // Create related profile based on role
    if ((role as Role) === 'ADMIN') {
      if (!restaurantId) {
        return NextResponse.json(
          { error: 'restaurantId required for ADMIN' },
          { status: 400 }
        )
      }

      admin = await prisma.admin.create({
        data: {
          accountId: account.id,
          restaurantId,
          name: name || 'Admin',
        },
      })
    } else {
      customer = await prisma.customer.create({
        data: {
          accountId: account.id,
          name: name || 'Customer',
          interests: interests || [],
        },
      })
    }

    // Auto-login: set session cookie
    const session: Record<string, unknown> = {
      accountId: account.id,
      email: account.email,
      role: account.role,
    }

    // Add role-specific fields to session
    if (admin) {
      session.adminId = admin.id
      session.restaurantId = admin.restaurantId
      session.name = admin.name
    } else if (customer) {
      session.customerId = customer.id
      session.name = customer.name
    }

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

    // Return AuthUser shape
    return NextResponse.json({
      accountId: account.id,
      email: account.email,
      role: account.role,
      customer: customer ? { id: customer.id, name: customer.name } : null,
      admin: admin ? { id: admin.id, name: admin.name, restaurantId: admin.restaurantId } : null,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
