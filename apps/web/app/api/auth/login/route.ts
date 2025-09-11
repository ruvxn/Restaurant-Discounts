import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import bcrypt from 'bcryptjs'
import { serialize } from 'cookie'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = await prisma.account.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = JSON.stringify({
    email: user.email,
    role: user.role,
    accountId: user.id,
  })

  const cookie = serialize('session', session, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  })

  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', cookie)

  return response
}
