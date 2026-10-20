import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast gate for the admin UI: no session cookie → login page. This is only a
 * UX shortcut; every admin API call is still authorised by the API itself.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!req.cookies.get('nexus_session')) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
