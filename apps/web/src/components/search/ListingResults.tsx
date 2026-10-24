import Link from 'next/link';
import { Suspense } from 'react';
import {
  formatINRShort,
  type Category,
  type City,
  type ListingType,
  type PropertySearch,
} from '@nexus/shared';
import { searchProperties } from '@/lib/api';
import { toApiQuery, toQueryString } from '@/lib/search-params';
import { EmptyState, Pagination } from '../ui';
import { PropertyGrid } from '../property/PropertyCard';
import { FiltersPanel } from './FiltersPanel';
import { QuickInsights } from './QuickInsights';
import { SortSelect } from './SortSelect';
import { MapView } from '../map/Map';
import { GridIcon, MapPinIcon } from '../icons';

const PAGE_SIZE = 12;
const MAP_PAGE_SIZE = 24;

type Props = {
  search: PropertySearch;
  cities: City[];
  basePath: string;
  fixed?: { listingType?: ListingType; category?: Category; city?: string; locality?: string };
  phone: string;
  view?: 'list' | 'map';
};

/** Server-rendered results + filters. Every filter round-trips through the URL and the API. */
export async function ListingResults({
  search,
  cities,
  basePath,
  fixed = {},
  phone,
  view = 'list',
}: Props) {
  const pageSize = view === 'map' ? MAP_PAGE_SIZE : PAGE_SIZE;
  let result: Awaited<ReturnType<typeof searchProperties>> | null = null;
  let failed = false;
  try {
    result = await searchProperties(toApiQuery(search, pageSize));
  } catch {
    failed = true;
  }

  const omit = (Object.keys(fixed) as (keyof PropertySearch)[]).filter(
    (k) => fixed[k as keyof typeof fixed],
  );
  const hrefWith = (page: number, v: 'list' | 'map') => {
    const qs = new URLSearchParams(toQueryString({ ...search, page }, omit));
    if (v === 'map') qs.set('view', 'map');
    const str = qs.toString();
    return `${basePath}${str ? `?${str}` : ''}`;
  };
  const hrefFor = (page: number) => hrefWith(page, view);
  const total = result?.meta.total ?? 0;
  const from = total ? (search.page - 1) * pageSize + 1 : 0;
  const to = Math.min(search.page * pageSize, total);
  const pins = (result?.items ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      ...p.location!,
      label: formatINRShort(p.price),
      title: p.title,
      href: `/properties/${p.slug}`,
    }));

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside
        aria-label="Filters"
        className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto"
      >
        <FiltersPanel
          key={toQueryString(search)}
          search={search}
          cities={cities}
          basePath={basePath}
          fixed={fixed}
          resultCount={total}
          view={view}
        />
      </aside>

      <section aria-labelledby="results-heading" aria-busy={false}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="results-heading" className="text-base font-medium text-ink-soft">
            {failed
              ? 'Results unavailable'
              : total
                ? `Showing ${from}–${to} of ${total} ${total === 1 ? 'property' : 'properties'}`
                : 'No matching properties'}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Results view" className="flex rounded-lg bg-surface p-1 text-sm">
              <Link
                href={hrefWith(1, 'list')}
                aria-current={view === 'list' ? 'page' : undefined}
                scroll={false}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${view === 'list' ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
              >
                <GridIcon size={15} /> List
              </Link>
              <Link
                href={hrefWith(1, 'map')}
                aria-current={view === 'map' ? 'page' : undefined}
                scroll={false}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${view === 'map' ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
              >
                <MapPinIcon size={15} /> Map
              </Link>
            </nav>
            <Suspense fallback={null}>
              <SortSelect value={search.sort} />
            </Suspense>
          </div>
        </div>

        {view === 'map' && !failed && (
          <div className="mb-8">
            <MapView
              markers={pins}
              label="Map of matching properties"
              className="h-[26rem] lg:h-[32rem]"
              zoom={12}
            />
            <p className="mt-2 text-xs text-ink-muted">
              {pins.length
                ? `${pins.length} of the ${result?.items.length ?? 0} properties on this page have a map pin.`
                : 'None of the properties on this page have a map pin yet.'}
            </p>
          </div>
        )}

        {failed ? (
          <EmptyState
            title="We couldn’t load listings right now"
            action={
              <a className="btn btn-primary" href={`tel:${phone}`}>
                Call our team
              </a>
            }
          >
            Please refresh in a moment. If it keeps happening, call us and we’ll share options
            directly.
          </EmptyState>
        ) : result && result.items.length > 0 ? (
          <>
            {view === 'list' && <QuickInsights items={result.items} total={total} />}
            <PropertyGrid items={result.items} priorityCount={2} />
            <Pagination page={search.page} totalPages={result.meta.totalPages} hrefFor={hrefFor} />
          </>
        ) : (
          <EmptyState
            title="No properties match these filters"
            action={
              <>
                <Link href={basePath} className="btn btn-outline">
                  Clear filters
                </Link>
                <Link href="/contact" className="btn btn-primary">
                  Tell us what you need
                </Link>
              </>
            }
          >
            Try widening your budget or choosing a nearby locality. New properties are reviewed and
            added regularly — share your requirement and our team will get back to you.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
