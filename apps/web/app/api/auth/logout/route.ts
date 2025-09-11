import { NextResponse } from 'next/server'
import { serialize } from 'cookie'

export async function POST() {
  const cookie = serialize('session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })

  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', cookie)
  return response
}
