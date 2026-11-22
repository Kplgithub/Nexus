import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ListingType } from '@nexus/shared';
import { getLocations, getSettings, smartSearch } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';
import { hrefOn, sectionsOn } from '@/lib/sections';
import { toQueryString } from '@/lib/search-params';
import { parseSmartQuery } from '@/lib/smart-search';
import {
  smartSearchHref,
  type SmartParams,
  type SmartSearchResult,
} from '@/lib/smart-search-types';
import { SmartSearchBar } from '@/components/search/SmartSearchBar';
import { PropertyRow } from '@/components/property/PropertyRow';
import { Breadcrumbs } from '@/components/ui';
import { SparklesIcon } from '@/components/icons';

type Raw = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Raw> };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

function readParams(raw: Raw): SmartParams | null {
  const q = one(raw.q)?.slice(0, 200);
  if (!q) return null;
  const deal = one(raw.deal);
  return {
    q,
    deal: deal === 'rent' || deal === 'sale' ? (deal as ListingType) : undefined,
    locality: /^[a-z0-9-]{1,100}$/.test(one(raw.locality) ?? '') ? one(raw.locality) : undefined,
    drop: one(raw.drop),
    maxPrice: /^\d{1,10}$/.test(one(raw.maxPrice) ?? '') ? one(raw.maxPrice) : undefined,
    page: /^\d{1,2}$/.test(one(raw.page) ?? '') ? one(raw.page) : undefined,
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = readParams(await searchParams);
  // Every visitor's query makes a new URL; keep them out of Google.
  return pageMetadata({
    title: p ? `${p.q} | Property search` : 'Property search',
    description: 'Search Jaipur property in your own words, in English, Hindi or Hinglish.',
    path: '/search',
    index: false,
  });
}

/** Where "Edit filters" goes: the normal browse page with the same filters. */
function filtersHref(r: SmartSearchResult) {
  const f = r.filters;
  const root = r.listingType === 'sale' ? '/buy' : '/rent';
  const path = f.locality ? `${root}/${r.city}/${f.locality}` : `${root}/${r.city}`;
  const qs = toQueryString(f, ['listingType', 'city', 'locality']);
  return `${path}${qs ? `?${qs}` : ''}`;
}

export default async function SmartSearchPage({ searchParams }: Props) {
  const params = readParams(await searchParams);
  if (!params) redirect('/rent');

  let result: SmartSearchResult;
  try {
    result = await smartSearch(params);
  } catch {
    // Search must never break: fall back to the quick word rules and normal filters.
    const cities = await getLocations().catch(() => []);
    const city = cities.find((c) => c.slug === 'jaipur') ?? cities[0];
    const text = params.deal === 'rent' ? `${params.q} for rent` : params.q;
    redirect(parseSmartQuery(text, { city: city?.slug, localities: city?.localities ?? [] }).path);
  }
  const settings = await getSettings();
  const on = sectionsOn(settings);
  const dropped = new Set((params.drop ?? '').split(',').filter(Boolean));
  const withDrop = (key: string) =>
    smartSearchHref({ ...params, page: undefined, drop: [...dropped, key].join(',') });
  const deal = result.listingType;
  const exact = result.items.filter((i) => i.match.exact);
  const close = result.items.filter((i) => !i.match.exact);

  return (
    <div>
      <header className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div className="nx-aurora" aria-hidden />
        <div className="nx-grid" aria-hidden />
        <div className="container-page relative pb-8 pt-6 sm:pb-10">
          <Breadcrumbs
            dark
            items={[
              { name: 'Home', href: '/' },
              ...(on[deal === 'sale' ? 'buy' : 'rent']
                ? [
                    {
                      name: deal === 'sale' ? 'Buy' : 'Rent',
                      href: deal === 'sale' ? '/buy' : '/rent',
                    },
                  ]
                : []),
              {
                name: 'AI search',
                href: smartSearchHref({
                  q: params.q,
                  deal: params.deal,
                  locality: params.locality,
                }),
              },
            ]}
          />
          <p className="nx-rise mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
            <SparklesIcon size={14} className="text-accent" />
            <span className="text-accent">AI search</span>
            <span className="text-white/80">· English, Hindi ya Hinglish</span>
          </p>
          <h1 className="nx-rise mt-3 text-[1.7rem] leading-tight text-white sm:text-[2.2rem]">
            {result.hinglish ? 'Aapke liye best matches' : 'Best matches for you'}
          </h1>
          <div className="nx-rise mt-4" style={{ '--i': 1 } as React.CSSProperties}>
            <SmartSearchBar deal={params.deal} locality={params.locality} initialText={params.q} />
          </div>

          <section
            aria-live="polite"
            className="nx-rise mt-4 max-w-2xl rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/15 backdrop-blur"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <h2 className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-orange-300">
              <SparklesIcon size={13} /> {result.hinglish ? 'AI ne samjha' : 'AI understood'}
            </h2>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-white">{result.summary}</p>
            {result.understood && (
              <ul className="mt-3 flex flex-wrap items-center gap-1.5">
                {result.chips.map((c) => (
                  <li key={c.key}>
                    {c.removable ? (
                      <Link
                        href={withDrop(c.key)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-orange-50"
                        aria-label={`Remove ${c.label}`}
                        title="Remove"
                      >
                        {c.label}{' '}
                        <span aria-hidden className="text-ink-muted">
                          ✕
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
                {hrefOn(filtersHref(result), on) && (
                  <li>
                    <Link
                      href={filtersHref(result)}
                      className="px-1.5 text-xs text-white/80 underline hover:text-white"
                    >
                      {result.hinglish ? 'Filters badlein' : 'Edit filters'}
                    </Link>
                  </li>
                )}
              </ul>
            )}
            {dropped.size > 0 && (
              <Link
                href={smartSearchHref({
                  q: params.q,
                  deal: params.deal,
                  locality: params.locality,
                })}
                className="mt-2 inline-block text-xs text-white/70 underline hover:text-white"
              >
                {result.hinglish ? 'Hataye gaye filters wapas lagayein' : 'Undo removed filters'}
              </Link>
            )}
          </section>
        </div>
      </header>

      <div className="container-page pb-12 pt-8">
        {result.projectsPath && on.projects && (
          <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm">
            Looking for new projects?{' '}
            <Link href={result.projectsPath} className="font-semibold text-brand underline">
              See new projects
            </Link>
          </p>
        )}

        {result.items.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-lg font-semibold">{result.summary}</p>
            <Link
              href={
                hrefOn(deal === 'sale' ? '/buy' : '/rent', on)
                  ? deal === 'sale'
                    ? '/buy'
                    : '/rent'
                  : '/properties'
              }
              className="btn btn-primary mt-4"
            >
              Browse all properties
            </Link>
          </div>
        ) : (
          <>
            {exact.length > 0 && (
              <section aria-labelledby="exact-h">
                <h2 id="exact-h" className="font-sans text-lg font-bold">
                  {result.exactCount} {result.exactCount === 1 ? 'exact match' : 'exact matches'}
                </h2>
                <ul className="mt-4 space-y-4">
                  {exact.map((p, i) => (
                    <li key={p.id}>
                      <PropertyRow
                        p={p}
                        index={i}
                        priority={i < 2}
                        whatsapp={settings.whatsapp}
                        match={p.match}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.budgetSuggestion && result.page === 1 && (
              <p className="my-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-orange-200 bg-orange-50 p-3.5 text-sm">
                <span>{result.budgetSuggestion.label}.</span>
                <Link
                  href={smartSearchHref({
                    ...params,
                    page: undefined,
                    maxPrice: String(result.budgetSuggestion.maxPrice),
                  })}
                  className="font-semibold text-brand underline"
                >
                  {result.hinglish ? 'Dikhao →' : 'Show them →'}
                </Link>
              </p>
            )}

            {close.length > 0 && (
              <section aria-labelledby="close-h" className={exact.length ? 'mt-10' : ''}>
                <h2 id="close-h" className="font-sans text-lg font-bold">
                  {exact.length
                    ? result.hinglish
                      ? 'Milte-julte options'
                      : 'Close matches'
                    : result.hinglish
                      ? 'Sabse kareeb wale options'
                      : 'Closest options'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {result.hinglish
                    ? 'Har property pe likha hai kya match hua aur kya alag hai.'
                    : 'Each listing shows what matches and what is different.'}
                </p>
                <ul className="mt-4 space-y-4">
                  {close.map((p, i) => (
                    <li key={p.id}>
                      <PropertyRow p={p} index={i} whatsapp={settings.whatsapp} match={p.match} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.pages > 1 && (
              <nav aria-label="Pages" className="mt-8 flex flex-wrap justify-center gap-2">
                {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={smartSearchHref({ ...params, page: String(n) })}
                    aria-current={n === result.page ? 'page' : undefined}
                    className={`chip ${n === result.page ? 'chip-active' : ''}`}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
