import type { MetadataRoute } from 'next';
import { SITE_NOINDEX, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (SITE_NOINDEX) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin, accounts and API are private; images under /uploads stay crawlable.
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
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
