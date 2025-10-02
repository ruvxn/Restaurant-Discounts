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
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  // Clear the session cookie
  const cookieStore = await cookies()
  cookieStore.delete('session')

  return NextResponse.json({ success: true })
}
