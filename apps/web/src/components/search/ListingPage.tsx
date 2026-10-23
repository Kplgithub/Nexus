import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Category, City, ListingType, Locality } from '@nexus/shared';
import { getCity, getLocalityInsights, getLocations, getSettings } from '@/lib/api';
import { hasUserFilters, parseSearch, type RawSearchParams } from '@/lib/search-params';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ListingResults } from './ListingResults';
import { Breadcrumbs, JsonLd } from '../ui';
import { LocalityInsights } from '../locality/LocalityInsights';

/**
 * One page component for every browse URL:
 *   /buy, /rent, /commercial, /properties
 *   /buy/[city], /rent/[city], /buy/[city]/[locality], /rent/[city]/[locality]
 * Cities and localities come only from what the admin has added.
 */
export type Scope = {
  deal?: ListingType;
  category?: Category;
  city?: string;
  locality?: string;
};

const DEAL_PATH: Record<ListingType, string> = { sale: '/buy', rent: '/rent' };

export function basePathFor(scope: Scope) {
  if (scope.deal) {
    const root = DEAL_PATH[scope.deal];
    if (scope.city && scope.locality) return `${root}/${scope.city}/${scope.locality}`;
    if (scope.city) return `${root}/${scope.city}`;
    return root;
  }
  if (scope.category === 'commercial') return '/commercial';
  return '/properties';
}

async function resolve(scope: Scope): Promise<{ city?: City; locality?: Locality } | null> {
  if (!scope.city) return {};
  const city = await getCity(scope.city);
  if (!city) return null;
  if (!scope.locality) return { city };
  const locality = city.localities.find((l) => l.slug === scope.locality);
  return locality ? { city, locality } : null;
}

function words(scope: Scope, place?: string) {
  const what = scope.category === 'commercial' ? 'Commercial property' : 'Property';
  const deal =
    scope.deal === 'sale' ? 'for sale' : scope.deal === 'rent' ? 'for rent' : 'for sale and rent';
  return `${what} ${deal}${place ? ` in ${place}` : ''}`;
}

export async function listingMetadata(scope: Scope, raw: RawSearchParams): Promise<Metadata> {
  const found = await resolve(scope);
  if (!found) return { title: 'Location not found', robots: { index: false } };
  const { city, locality } = found;
  const place = locality && city ? `${locality.name}, ${city.name}` : city?.name;
  const title =
    (locality?.seoTitle && scope.deal ? `${locality.seoTitle}` : '') ||
    (city && !locality && city.seoTitle && scope.deal ? city.seoTitle : '') ||
    words(scope, place);
  const fallbackDescription =
    scope.deal === 'sale'
      ? `Flats, houses, villas, plots and commercial spaces for sale${place ? ` in ${place}` : ''}. Verified details, photos and direct enquiries on NEXUS Estate.`
      : scope.deal === 'rent'
        ? `Flats, houses, offices and shops for rent${place ? ` in ${place}` : ''}. Compare rent, deposit and furnishing, then contact owners and agents on NEXUS Estate.`
        : `Offices, shops and showrooms for sale and rent${place ? ` in ${place}` : ''} on NEXUS Estate.`;
  const description =
    (locality?.seoDescription || (!locality ? city?.seoDescription : undefined)) ??
    fallbackDescription;
  // Thin location pages (no listings and no written copy) stay out of the index.
  const target = locality ?? city;
  const hasContent = !target || (target.publishedCount ?? 0) > 0 || target.intro.length > 0;
  return pageMetadata({
    title,
    description: description || fallbackDescription,
    path: basePathFor(scope),
    index: hasContent && !hasUserFilters(raw),
  });
}

export async function ListingPage({
  scope,
  raw,
  intro,
  after,
}: {
  scope: Scope;
  raw: RawSearchParams;
  intro?: string;
  after?: React.ReactNode;
}) {
  const [found, cities, settings, insights] = await Promise.all([
    resolve(scope),
    getLocations(),
    getSettings(),
    scope.city && scope.locality ? getLocalityInsights(scope.city, scope.locality) : null,
  ]);
  if (!found) notFound();
  const { city, locality } = found!;
  const path = basePathFor(scope);
  const search = parseSearch(raw, {
    listingType: scope.deal,
    category: scope.category,
    city: scope.city,
    locality: scope.locality,
  });

  const dealName =
    scope.deal === 'sale'
      ? 'Buy'
      : scope.deal === 'rent'
        ? 'Rent'
        : scope.category === 'commercial'
          ? 'Commercial'
          : 'Properties';
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: dealName, href: scope.deal ? DEAL_PATH[scope.deal] : path },
  ];
  if (city && scope.deal)
    crumbs.push({ name: city.name, href: `${DEAL_PATH[scope.deal]}/${city.slug}` });
  if (city && locality && scope.deal)
    crumbs.push({
      name: locality.name,
      href: `${DEAL_PATH[scope.deal]}/${city.slug}/${locality.slug}`,
    });

  const place = locality && city ? `${locality.name}, ${city.name}` : city?.name;
  const lead = locality?.intro || (!locality ? city?.intro : '') || intro;

  // Locality chips: within a city page, its localities; on a deal root with one city, that city's.
  const chipCity = city ?? (scope.deal && cities.length === 1 ? cities[0] : undefined);
  const chips = chipCity
    ? [...chipCity.localities].sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
    : [];

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-5">
        <h1 className="text-[2rem] leading-tight sm:text-[2.6rem]">{words(scope, place)}</h1>
        {lead && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">{lead}</p>}

        {scope.deal && !scope.city && cities.length > 1 && (
          <nav aria-label="Cities" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link href={`${DEAL_PATH[scope.deal!]}/${c.slug}`} className="chip">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {scope.deal && chipCity && chips.length > 0 && (
          <nav aria-label={`Localities in ${chipCity.name}`} className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {chips.map((l) => {
                const active = l.slug === locality?.slug;
                return (
                  <li key={l.slug}>
                    <Link
                      href={
                        active
                          ? `${DEAL_PATH[scope.deal!]}/${chipCity.slug}`
                          : `${DEAL_PATH[scope.deal!]}/${chipCity.slug}/${l.slug}`
                      }
                      aria-current={active ? 'page' : undefined}
                      className={`chip ${active ? 'chip-active' : ''}`}
                    >
                      {l.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <ListingResults
        search={search}
        cities={cities}
        basePath={path}
        fixed={{
          listingType: scope.deal,
          category: scope.category,
          city: scope.city,
          locality: scope.locality,
        }}
        phone={settings.phone}
        view={raw.view === 'map' ? 'map' : 'list'}
      />

      {insights && search.page === 1 && <LocalityInsights data={insights} deal={scope.deal} />}

      {after}
    </div>
  );
}

export type { RawSearchParams };
