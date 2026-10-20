import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocations } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd } from '@/components/ui';
import { MapPinIcon } from '@/components/icons';

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Rental Properties by Location',
  description: 'Browse NEXUS Estate rental listings by city and locality.',
  path: '/rentals',
});

export default async function RentalsIndex() {
  const cities = await getLocations();
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/rentals' },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Browse rentals by location</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Pick a city, then a locality, to see current residential and commercial listings.
      </p>

      {cities.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Locations are being set up">
            Please check back shortly or contact our team.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {cities.map((c) => (
            <section key={c.slug} aria-labelledby={`city-${c.slug}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`city-${c.slug}`} className="text-2xl font-bold">
                  <Link href={`/rentals/${c.slug}`} className="hover:text-brand">
                    {c.name}
                  </Link>
                </h2>
                <Link
                  href={`/rentals/${c.slug}`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  All rentals in {c.name}
                  {c.publishedCount ? ` (${c.publishedCount})` : ''}
                </Link>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {c.localities.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/rentals/${c.slug}/${l.slug}`}
                      className="card flex items-center justify-between gap-2 p-4 hover:border-brand"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <MapPinIcon size={17} className="text-brand" /> {l.name}
                      </span>
                      <span className="text-sm text-ink-muted">{l.publishedCount || '—'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
