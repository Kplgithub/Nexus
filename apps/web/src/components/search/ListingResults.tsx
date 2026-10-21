import Link from 'next/link';
import { Suspense } from 'react';
import type { Category, City, ListingType, PropertySearch } from '@nexus/shared';
import { searchProperties } from '@/lib/api';
import { toApiQuery, toQueryString } from '@/lib/search-params';
import { EmptyState, Pagination } from '../ui';
import { PropertyGrid } from '../property/PropertyCard';
import { FiltersPanel } from './FiltersPanel';
import { SortSelect } from './SortSelect';

const PAGE_SIZE = 12;

type Props = {
  search: PropertySearch;
  cities: City[];
  basePath: string;
  fixed?: { listingType?: ListingType; category?: Category; city?: string; locality?: string };
  phone: string;
};

/** Server-rendered results + filters. Every filter round-trips through the URL and the API. */
export async function ListingResults({ search, cities, basePath, fixed = {}, phone }: Props) {
  let result: Awaited<ReturnType<typeof searchProperties>> | null = null;
  let failed = false;
  try {
    result = await searchProperties(toApiQuery(search, PAGE_SIZE));
  } catch {
    failed = true;
  }

  const omit = (Object.keys(fixed) as (keyof PropertySearch)[]).filter(
    (k) => fixed[k as keyof typeof fixed],
  );
  const hrefFor = (page: number) => {
    const qs = toQueryString({ ...search, page }, omit);
    return `${basePath}${qs ? `?${qs}` : ''}`;
  };
  const total = result?.meta.total ?? 0;
  const from = total ? (search.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(search.page * PAGE_SIZE, total);

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
          <Suspense fallback={null}>
            <SortSelect value={search.sort} />
          </Suspense>
        </div>

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
