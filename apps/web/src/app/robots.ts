import type { MetadataRoute } from 'next';
import { SITE_NOINDEX, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (SITE_NOINDEX) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Accounts and API are private (the admin address is left out on purpose, so it isn't advertised); images under /uploads stay crawlable.
        disallow: [
          '/api/',
          '/dashboard',
          '/invoice/',
          // Served at `/` to visitors from other cities; never a page of its own.
          '/homecity/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    // No `host`: it is a Yandex-only directive and Google Search Console flags it as ignored.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
