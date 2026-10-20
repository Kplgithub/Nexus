import type { Metadata } from 'next';
import { getLocations, getSettings } from '@/lib/api';
import { hasUserFilters, parseSearch, type RawSearchParams } from '@/lib/search-params';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ListingResults } from '@/components/search/ListingResults';
import { Breadcrumbs, JsonLd } from '@/components/ui';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const raw = await searchParams;
  return pageMetadata({
    title: 'Properties for Rent in Jaipur — Homes, Offices & Shops',
    description:
      'Search residential and commercial properties for rent in Jaipur by locality, budget, type and furnishing. Updated listings from NEXUS Estate.',
    path: '/properties',
    // Filtered combinations are crawlable but not indexed; the canonical points to the clean page.
    index: !hasUserFilters(raw),
  });
}

export default async function PropertiesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const search = parseSearch(raw);
  const [cities, settings] = await Promise.all([getLocations(), getSettings()]);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Properties', href: '/properties' },
  ];

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Properties for rent</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Homes, offices, shops and showrooms. Use the filters to narrow by locality, budget and
          features.
        </p>
      </header>
      <ListingResults
        search={search}
        cities={cities}
        basePath="/properties"
        phone={settings.phone}
      />
    </div>
  );
}
