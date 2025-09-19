
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
import { accounts } from '@/src/lib/store'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // Find account by email
  const account = accounts.find((a) => a.email === email)
  if (!account) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Compare password with stored hash
  const valid = await bcrypt.compare(password, account.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Use await with cookies() to set session
  const cookieStore = await cookies()
  cookieStore.set(
    'session',
    JSON.stringify({ id: account.id, role: account.role }),
    {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 5, 
    }
  )

  return NextResponse.json({ success: true })
}
