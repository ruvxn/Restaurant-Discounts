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
import { accounts } from '@/src/lib/store'

export async function POST(req: NextRequest) {
  const { email, password, role, name, restaurantId } = await req.json()

  // Check if email already exists
  const exists = accounts.find((a) => a.email === email)
  if (exists) {
    return NextResponse.json({ error: 'Email already taken' }, { status: 409 })
  }

  // Hash the password before storing
  const passwordHash = await bcrypt.hash(password, 10)

  // Save account into in-memory array
  const account = {
    id: accounts.length + 1,
    email,
    passwordHash,
    role: role ?? 'CUSTOMER',
    name: name ?? 'User',
    restaurantId: restaurantId ?? null,
  }
  accounts.push(account)

  return NextResponse.json({ success: true, account })
}
