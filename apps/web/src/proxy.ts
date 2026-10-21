import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast gates for signed-in areas: no session cookie → the matching login page.
 * This is only a UX shortcut; every API call is still authorised by the API.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const next = encodeURIComponent(pathname + search);
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!req.cookies.get('nexus_session')) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${next}`;
      return NextResponse.redirect(url);
    }
  }
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!req.cookies.get('nexus_user')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${next}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/dashboard', '/dashboard/:path*'] };
