import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCity, getLocations, getSettings } from '@/lib/api';
import { hasUserFilters, parseSearch, type RawSearchParams } from '@/lib/search-params';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ListingResults } from '@/components/search/ListingResults';
import { Breadcrumbs, JsonLd } from '@/components/ui';

type Props = { params: Promise<{ city: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCity(slug);
  if (!city) return { title: 'Location not found', robots: { index: false } };
  const hasContent = (city.publishedCount ?? 0) > 0 || city.intro.length > 0;
  return pageMetadata({
    title: city.seoTitle || `Property for Rent in ${city.name} — Homes, Offices & Shops`,
    description:
      city.seoDescription ||
      `Residential and commercial property for rent in ${city.name}, ${city.state}. Browse flats, houses, offices and shops by locality with NEXUS Estate.`,
    path: `/rentals/${city.slug}`,
    index: hasContent && !hasUserFilters(await searchParams),
  });
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city: slug } = await params;
  const [city, cities, settings] = await Promise.all([
    getCity(slug),
    getLocations(),
    getSettings(),
  ]);
  if (!city) notFound();
  const search = parseSearch(await searchParams, { city: city.slug });
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/rentals' },
    { name: city.name, href: `/rentals/${city.slug}` },
  ];
  const withListings = city.localities.filter((l) => (l.publishedCount ?? 0) > 0);
  const others = city.localities.filter((l) => !l.publishedCount);

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Property for rent in {city.name}</h1>
        {city.intro && <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{city.intro}</p>}
        <nav aria-label={`Localities in ${city.name}`} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {[...withListings, ...others].map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/rentals/${city.slug}/${l.slug}`}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm ${l.publishedCount ? 'border-brand-100 bg-brand-50 font-medium text-brand-800' : 'border-line text-ink-soft'} hover:border-brand`}
                >
                  {l.name}
                  {l.publishedCount ? ` · ${l.publishedCount}` : ''}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <ListingResults
        search={search}
        cities={cities}
        basePath={`/rentals/${city.slug}`}
        fixed={{ city: city.slug }}
        phone={settings.phone}
      />

      <section className="mt-16 grid gap-6 md:grid-cols-2" aria-label="Rental categories">
        <Link href={`/residential?city=${city.slug}`} className="card p-6 hover:border-brand">
          <h2 className="text-lg font-semibold">Residential rentals in {city.name}</h2>
          <p className="mt-1 text-ink-soft">
            Flats, builder floors, independent houses and villas.
          </p>
        </Link>
        <Link href={`/commercial?city=${city.slug}`} className="card p-6 hover:border-brand">
          <h2 className="text-lg font-semibold">Commercial rentals in {city.name}</h2>
          <p className="mt-1 text-ink-soft">Offices, shops, showrooms and co-working spaces.</p>
        </Link>
      </section>
    </div>
  );
}
