import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

const ROLE_HOME: Record<string, string> = {
  mesero: '/mesero',
  cajero: '/caja',
  administracion: '/admin',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get('better-auth.session_token');

  if (!sessionCookie?.value) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:4000';

  const session = await fetch(`${backendUrl}/api/auth/get-session`, {
    headers: { cookie: `better-auth.session_token=${sessionCookie.value}` },
  }).then((res) => (res.ok ? res.json() : null)).catch(() => null);

  if (!session?.user) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('better-auth.session_token');
    return response;
  }

  const role = session.user.role as string;

  if (pathname === '/login') {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url));
  }

  const allowedPrefix = ROLE_HOME[role];
  if (allowedPrefix && pathname !== '/' && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(allowedPrefix, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
