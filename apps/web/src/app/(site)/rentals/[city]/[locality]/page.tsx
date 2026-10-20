import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCity, getLocations, getSettings } from '@/lib/api';
import { hasUserFilters, parseSearch, type RawSearchParams } from '@/lib/search-params';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ListingResults } from '@/components/search/ListingResults';
import { Breadcrumbs, JsonLd } from '@/components/ui';

type Props = {
  params: Promise<{ city: string; locality: string }>;
  searchParams: Promise<RawSearchParams>;
};

async function load(citySlug: string, localitySlug: string) {
  const city = await getCity(citySlug);
  const locality = city?.localities.find((l) => l.slug === localitySlug);
  return city && locality ? { city, locality } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city: c, locality: l } = await params;
  const found = await load(c, l);
  if (!found) return { title: 'Location not found', robots: { index: false } };
  const { city, locality } = found;
  // Only index pages with genuine content: live listings or written local copy.
  const hasContent = (locality.publishedCount ?? 0) > 0 || locality.intro.length > 0;
  return pageMetadata({
    title: locality.seoTitle || `Property for Rent in ${locality.name}, ${city.name}`,
    description:
      locality.seoDescription ||
      `Flats, houses, offices and shops for rent in ${locality.name}, ${city.name}. See current listings and enquire with NEXUS Estate.`,
    path: `/rentals/${city.slug}/${locality.slug}`,
    index: hasContent && !hasUserFilters(await searchParams),
  });
}

export default async function LocalityPage({ params, searchParams }: Props) {
  const { city: c, locality: l } = await params;
  const [found, cities, settings] = await Promise.all([load(c, l), getLocations(), getSettings()]);
  if (!found) notFound();
  const { city, locality } = found;
  const search = parseSearch(await searchParams, { city: city.slug, locality: locality.slug });
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/rentals' },
    { name: city.name, href: `/rentals/${city.slug}` },
    { name: locality.name, href: `/rentals/${city.slug}/${locality.slug}` },
  ];
  const nearby = city.localities
    .filter((x) => x.slug !== locality.slug && (x.publishedCount ?? 0) > 0)
    .slice(0, 10);

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Property for rent in {locality.name}, {city.name}
        </h1>
        {locality.intro && (
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{locality.intro}</p>
        )}
      </header>

      <ListingResults
        search={search}
        cities={cities}
        basePath={`/rentals/${city.slug}/${locality.slug}`}
        fixed={{ city: city.slug, locality: locality.slug }}
        phone={settings.phone}
      />

      <section className="mt-16" aria-labelledby="more-heading">
        <h2 id="more-heading" className="text-xl font-bold">
          More in {city.name}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          <li>
            <Link
              href={`/residential?city=${city.slug}&locality=${locality.slug}`}
              className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm hover:border-brand"
            >
              Residential in {locality.name}
            </Link>
          </li>
          <li>
            <Link
              href={`/commercial?city=${city.slug}&locality=${locality.slug}`}
              className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm hover:border-brand"
            >
              Commercial in {locality.name}
            </Link>
          </li>
          {nearby.map((n) => (
            <li key={n.slug}>
              <Link
                href={`/rentals/${city.slug}/${n.slug}`}
                className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm hover:border-brand"
              >
                {n.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
