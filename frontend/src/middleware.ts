import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'auth_token';
const rawAuthSecret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!rawAuthSecret || rawAuthSecret.length < 32)) {
  console.error('[CRITICAL SECURITY WARNING] AUTH_SECRET is missing or under 32 characters in production!');
}
const JWT_SECRET = new TextEncoder().encode(
  rawAuthSecret || 'fallback_development_auth_secret_minimum_32_chars_long_key!'
);

const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, Next internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  let session: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      // Invalid or expired token
      session = null;
    }
  }

  // Redirect root path
  if (pathname === '/') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.role)) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not logged in and tries to access protected page or API
  if (!session && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and visits login / public auth page
  if (session && isPublicRoute && !pathname.startsWith('/api/')) {
    if (session.mustChangePassword && pathname !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', req.url));
    }
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.role)) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Enforce mandatory password change before accessing other pages
  if (
    session &&
    session.mustChangePassword &&
    pathname !== '/change-password' &&
    !pathname.startsWith('/api/auth/')
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Password change required before proceeding.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  // Protect Admin/Manager pages and APIs from standard employees
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/manager') || pathname.startsWith('/api/admin')) &&
    !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session?.role)
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
