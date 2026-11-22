import { NextResponse, type NextRequest } from 'next/server';
import { CITY_COOKIE, HOME_CITY_COOKIE } from '@/lib/city-cookie';
import { placeIndexForIp, siteCityForPlace } from '@/lib/geo';

/**
 * Where the visitor's IP placed them: an index into the geo table, or "x" for unknown.
 * Renamed from `nexus_geo` when mobile-network IPs stopped counting as a city, so guesses
 * saved by the old table (e.g. a Jaipur phone placed in Mumbai) are made again.
 */
const GEO_COOKIE = 'nexus_place';
const OLD_GEO_COOKIE = 'nexus_geo';

const SLUG = /^[a-z0-9-]{1,60}$/;
const BOTS =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|embedly|lighthouse|pagespeed|headless|preview/i;

type SiteCity = { slug: string; name: string; state?: string };
let cityCache: { at: number; list: SiteCity[] } | null = null;

/** Active cities from admin → Locations, cached for five minutes. */
async function siteCities(): Promise<SiteCity[]> {
  if (cityCache && Date.now() - cityCache.at < 5 * 60_000) return cityCache.list;
  try {
    const api = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
    const res = await fetch(`${api}/api/v1/locations`, { signal: AbortSignal.timeout(1500) });
    const body = (await res.json()) as { data?: SiteCity[] };
    const list = (body.data ?? []).map(({ slug, name, state }) => ({ slug, name, state }));
    cityCache = { at: Date.now(), list };
    return list;
  } catch {
    return cityCache?.list ?? [];
  }
}

function clientIp(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    const test = req.headers.get('x-nexus-test-ip');
    if (test) return test;
  }
  return (
    req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  );
}

const YEAR = 365 * 24 * 3600;

/**
 * Home page by city. Search engines and anyone we can't place get the main city at `/`.
 * Others get their chosen city, or the city their IP points to, served at the same `/` URL
 * (rewritten to /homecity/<slug>). A visitor from a city we don't serve yet sees the main city
 * with a short "coming soon" note (/homecity/soon).
 */
async function cityHome(req: NextRequest) {
  if (BOTS.test(req.headers.get('user-agent') ?? '')) return NextResponse.next();
  const cities = await siteCities();
  if (cities.length === 0) return NextResponse.next();
  const main =
    cities.length === 1 ? cities[0]! : (cities.find((c) => c.slug === 'jaipur') ?? cities[0]!);

  let target: string | null = null;
  let geoValue: string | null = null;
  const chosen = req.cookies.get(CITY_COOKIE)?.value ?? '';
  if (SLUG.test(chosen) && cities.some((c) => c.slug === chosen)) {
    target = chosen;
  } else {
    let saved = req.cookies.get(GEO_COOKIE)?.value ?? '';
    if (!/^(\d{1,5}|x)$/.test(saved)) {
      const i = placeIndexForIp(clientIp(req));
      saved = i === null ? 'x' : String(i);
      geoValue = saved;
    }
    if (saved !== 'x') target = siteCityForPlace(Number(saved), cities) ?? 'soon';
  }

  const res =
    !target || target === main.slug
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(`/homecity/${target}`, req.url));
  // The same URL now differs per visitor: keep shared caches from mixing cities up.
  if (target && target !== main.slug) res.headers.set('Cache-Control', 'private, no-store');
  if (geoValue) {
    res.cookies.set(GEO_COOKIE, geoValue, {
      maxAge: 30 * 24 * 3600,
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      path: '/',
    });
  }
  if (req.cookies.get(OLD_GEO_COOKIE)) res.cookies.delete(OLD_GEO_COOKIE);
  const shown = target && target !== 'soon' ? target : main.slug;
  if (req.cookies.get(HOME_CITY_COOKIE)?.value !== shown) {
    res.cookies.set(HOME_CITY_COOKIE, shown, { maxAge: YEAR, sameSite: 'lax', path: '/' });
  }
  return res;
}

/**
 * Fast gates for signed-in areas: no session cookie → the matching login page.
 * This is only a UX shortcut; every API call is still authorised by the API.
 * Also picks the visitor's city for the home page.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === '/') return cityHome(req);
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

export const config = { matcher: ['/', '/admin/:path*', '/dashboard', '/dashboard/:path*'] };
