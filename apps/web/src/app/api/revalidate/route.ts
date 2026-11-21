import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Drops cached API data right away when listings change, so a removed or
 * unpublished listing never shows from an old cached search.
 *
 * Called by the API on the same server (http://127.0.0.1:3000/api/revalidate).
 * Nginx sends every public /api/* request to the API, never here. As a second
 * guard, anything that came through Nginx (X-Real-IP set, or a non-local
 * address in X-Forwarded-For, which Next fills with the caller's address) is
 * refused. If REVALIDATE_SECRET is set, it is required as well.
 */
const ALLOWED_TAGS = new Set([
  'properties',
  'projects',
  'profiles',
  'locations',
  'settings',
  'faqs',
  'blog',
]);

export const dynamic = 'force-dynamic';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

function fromThisServer(req: NextRequest) {
  if (req.headers.get('x-real-ip')) return false;
  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain.every((ip) => LOOPBACK.has(ip));
}

export async function POST(req: NextRequest) {
  if (!fromThisServer(req)) return NextResponse.json({ ok: false }, { status: 404 });
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let tags: string[] = [];
  try {
    const body = (await req.json()) as { tags?: unknown };
    if (Array.isArray(body.tags))
      tags = body.tags.filter((t): t is string => typeof t === 'string');
  } catch {
    // fall through with no tags
  }
  const valid = [...new Set(tags)].filter((t) => ALLOWED_TAGS.has(t));
  if (!valid.length) return NextResponse.json({ ok: false }, { status: 400 });

  // expire: 0 = the next visitor gets fresh data, not the old copy.
  for (const tag of valid) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true, revalidated: valid });
}
