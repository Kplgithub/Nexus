import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocations } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd } from '@/components/ui';

export const metadata: Metadata = pageMetadata({
  title: 'Locations — Property by City and Locality',
  description: 'Browse property for sale and rent on NEXUS Estate by city and locality.',
  path: '/locations',
});

export default async function LocationsPage() {
  const cities = await getLocations();
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/locations' },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-5 text-[2rem] leading-tight sm:text-[2.6rem]">Where we list property</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Choose a locality to see what’s available to buy or rent there.
      </p>

      {cities.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Locations are being added">
            Please check back shortly, or call our team for current availability.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-12 space-y-16">
          {cities.map((c) => (
            <section key={c.slug} aria-labelledby={`city-${c.slug}`}>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 id={`city-${c.slug}`} className="text-[1.75rem]">
                    {c.name}
                  </h2>
                  <p className="text-sm text-ink-muted">{c.state}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/buy/${c.slug}`} className="btn btn-outline btn-sm">
                    Buy in {c.name}
                  </Link>
                  <Link href={`/rent/${c.slug}`} className="btn btn-outline btn-sm">
                    Rent in {c.name}
                  </Link>
                </div>
              </div>
              {c.intro && <p className="mt-4 max-w-3xl text-ink-soft">{c.intro}</p>}
              <ul className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {[...c.localities]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <li
                      key={l.slug}
                      className="flex items-center justify-between gap-3 border-b border-line py-3"
                    >
                      <span className="font-medium">{l.name}</span>
                      <span className="flex gap-3 text-sm">
                        <Link
                          href={`/buy/${c.slug}/${l.slug}`}
                          className="text-brand hover:underline"
                        >
                          Buy
                        </Link>
                        <Link
                          href={`/rent/${c.slug}/${l.slug}`}
                          className="text-brand hover:underline"
                        >
                          Rent
                        </Link>
                      </span>
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
