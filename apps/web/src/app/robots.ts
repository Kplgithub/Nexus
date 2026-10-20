import type { MetadataRoute } from 'next';
import { SITE_NOINDEX, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (SITE_NOINDEX) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin and API are private; images under /uploads stay crawlable.
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
