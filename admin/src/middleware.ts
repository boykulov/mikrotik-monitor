import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  const session = request.cookies.get('nebulanet_session')

  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
