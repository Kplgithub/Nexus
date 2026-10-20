import type { MetadataRoute } from 'next';
import { getLocations, getSitemapProperties } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Only real, indexable URLs: static pages, published public listings, and
 * location pages that have live listings or written local content.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, cities] = await Promise.all([getSitemapProperties(), getLocations()]);
  const now = new Date();
  const url = (p: string) => `${SITE_URL}${p}`;

  const staticPages: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: url('/properties'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: url('/residential'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: url('/commercial'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: url('/rentals'), changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/list-your-property'), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/about'), changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/contact'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/faq'), changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/privacy-policy'), changeFrequency: 'yearly', priority: 0.1 },
    { url: url('/terms-and-conditions'), changeFrequency: 'yearly', priority: 0.1 },
    { url: url('/cookie-policy'), changeFrequency: 'yearly', priority: 0.1 },
  ];

  const locationPages: MetadataRoute.Sitemap = cities.flatMap((c) => [
    ...((c.publishedCount ?? 0) > 0 || c.intro
      ? [{ url: url(`/rentals/${c.slug}`), changeFrequency: 'daily' as const, priority: 0.8 }]
      : []),
    ...c.localities
      .filter((l) => (l.publishedCount ?? 0) > 0 || l.intro)
      .map((l) => ({
        url: url(`/rentals/${c.slug}/${l.slug}`),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
  ]);

  const listingPages: MetadataRoute.Sitemap = properties.map((p) => ({
    url: url(`/properties/${p.slug}`),
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...locationPages, ...listingPages];
}
