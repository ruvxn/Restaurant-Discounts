/*
// apps/web/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'

// Clear session cookie
export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('session', '', { path: '/', maxAge: 0 })
  return res
}
*/
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Clear the session cookie
  const cookieStore = await cookies()
  cookieStore.set('session', '', { maxAge: 0 })

  return NextResponse.json({ success: true })
}
