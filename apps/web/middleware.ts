import { NextRequest, NextResponse } from 'next/server'

// Helper to parse session from cookie
function getSessionFromRequest(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) return null

  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = getSessionFromRequest(request)

  // Public routes (no auth required)
  const publicRoutes = ['/', '/login', '/signup', '/admin/login']
  const publicCustomerPrefixes = ['/customer/home', '/customer/restaurant']

  // Protected customer routes (order matters - more specific first)
  const protectedCustomerPrefixes = ['/customer/booking', '/customer/bookings', '/customer/profile', '/customer/menu']

  // Allow public routes and API auth routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow API routes (will be protected server-side)
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow public customer browsing pages
  if (publicCustomerPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Protect customer-specific routes
  if (protectedCustomerPrefixes.some(prefix => pathname.startsWith(prefix))) {
    if (!session || session.role !== 'CUSTOMER') {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Protect all admin routes
  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== 'ADMIN') {
      const url = new URL('/login', request.url)
      url.searchParams.set('admin', '1')
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
