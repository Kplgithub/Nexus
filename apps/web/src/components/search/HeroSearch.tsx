'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  PROJECT_UNIT_TYPES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  FARM_TYPES,
  isFarmType,
  type City,
  type ListingType,
  type PropertyType,
} from '@nexus/shared';
import { toQueryString } from '@/lib/search-params';
import { SMART_EXAMPLES, parseSmartQuery } from '@/lib/smart-search';
import { smartSearchHref } from '@/lib/smart-search-types';
import { priceLabel, priceSteps } from './options';
import { FilterIcon, SearchIcon, SparklesIcon } from '../icons';
import { useSections } from '../session/SectionsProvider';
import type { SectionsOn } from '@/lib/sections';

type Tab = 'sale' | 'rent' | 'projects' | 'pg' | 'plot' | 'farm' | 'commercial';
const TABS: { id: Tab; label: string }[] = [
  { id: 'sale', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'projects', label: 'New projects' },
  { id: 'pg', label: 'PG' },
  { id: 'plot', label: 'Plots' },
  { id: 'farm', label: 'Farms' },
  { id: 'commercial', label: 'Commercial' },
];
/** Each tab shows only while its site sections are on (Admin → Settings → Site sections). */
const TAB_ON: Record<Tab, (on: SectionsOn) => boolean> = {
  sale: (on) => on.buy,
  rent: (on) => on.rent,
  projects: (on) => on.projects,
  pg: (on) => on.pg && on.rent,
  plot: (on) => on.plot && on.buy,
  farm: (on) => on.buy,
  commercial: (on) => on.commercial,
};

/** Tabs that fix the property type, so the type picker is hidden. */
const FIXED_TYPE: Partial<Record<Tab, PropertyType>> = { pg: 'pg', plot: 'plot' };
const ACTION: Record<Tab, string> = {
  sale: '/buy',
  rent: '/rent',
  projects: '/projects',
  pg: '/rent',
  plot: '/buy',
  farm: '/buy',
  commercial: '/commercial',
};

/** Words the smart box adds for the chosen tab, unless the text already says otherwise. */
const TAB_HINT: Record<Tab, string> = {
  sale: '',
  rent: ' for rent',
  projects: ' new project',
  pg: ' pg',
  plot: ' plot',
  farm: ' farm',
  commercial: ' commercial',
};
const DEAL_WORDS = /\b(rent|rental|lease|buy|sale|purchase|kiraye|kiraya)\b/i;

/** Types out each example, pauses, then moves to the next. */
function useTypedExample(active: boolean) {
  const [i, setI] = useState(0);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (!active) return;
    const full = SMART_EXAMPLES[i % SMART_EXAMPLES.length]!;
    const done = len >= full.length;
    const t = setTimeout(
      () => {
        if (done) {
          setI((x) => x + 1);
          setLen(0);
        } else setLen((x) => x + 1);
      },
      done ? 2200 : 38,
    );
    return () => clearTimeout(t);
  }, [active, i, len]);
  return SMART_EXAMPLES[i % SMART_EXAMPLES.length]!.slice(0, len);
}

const RESIDENTIAL: readonly PropertyType[] = PROPERTY_TYPES.residential;
const HOMES: readonly PropertyType[] = RESIDENTIAL.filter((t) => !isFarmType(t));
const COMMERCIAL: readonly PropertyType[] = PROPERTY_TYPES.commercial;

/**
 * Home-page search. Cities and localities are exactly the ones the admin has
 * added. Works as a plain GET form without JavaScript.
 */
export function HeroSearch({
  cities,
  defaultCity,
  farms = true,
}: {
  cities: City[];
  defaultCity?: string;
  /** Admin switch for the Farms tab. */
  farms?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const on = useSections();
  const tabs = useMemo(
    () => TABS.filter((t) => TAB_ON[t.id](on) && (farms || t.id !== 'farm')),
    [on, farms],
  );
  const [picked, setTab] = useState<Tab>('sale');
  const tab: Tab = tabs.some((t) => t.id === picked) ? picked : (tabs[0]?.id ?? 'sale');
  const [city, setCity] = useState(
    cities.some((c) => c.slug === defaultCity) ? defaultCity! : (cities[0]?.slug ?? ''),
  );
  const [deal, setDeal] = useState<ListingType>('sale');
  const [mode, setMode] = useState<'smart' | 'filters'>('smart');
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const typed = useTypedExample(mode === 'smart' && !text && !focused);
  // Quick picks for the chosen city (Jaipur's are the ones people search most there).
  const topLocality = cities.find((c) => c.slug === city)?.localities[0]?.name;
  const popularAll =
    city === 'jaipur' || !city
      ? ['2 BHK for rent', '3 BHK flat to buy', 'Villa in Vaishali Nagar', 'JDA plot', 'Girls PG']
      : [
          '2 BHK for rent',
          '3 BHK flat to buy',
          topLocality ? `Villa in ${topLocality}` : 'Villa to buy',
          'Plot for sale',
          'Girls PG',
        ];
  const popular = popularAll.filter((q) =>
    /pg/i.test(q)
      ? on.pg && on.rent
      : /plot/i.test(q)
        ? on.plot && on.buy
        : /rent/i.test(q)
          ? on.rent
          : on.buy,
  );
  const localities = [...(cities.find((c) => c.slug === city)?.localities ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const listingType: ListingType =
    tab === 'commercial' ? deal : tab === 'rent' || tab === 'pg' ? 'rent' : 'sale';
  const types: readonly string[] =
    tab === 'commercial'
      ? COMMERCIAL
      : tab === 'projects'
        ? PROJECT_UNIT_TYPES
        : tab === 'farm'
          ? FARM_TYPES
          : (farms && tab === 'sale' ? RESIDENTIAL : HOMES).filter(
              (t) => (t !== 'pg' || on.pg) && (t !== 'plot' || on.plot),
            );
  const fixedType = FIXED_TYPE[tab];
  const steps = priceSteps(listingType);

  const smartLocalities = useMemo(
    () =>
      (cities.find((c) => c.slug === city)?.localities ?? []).map((l) => ({
        slug: l.slug,
        name: l.name,
      })),
    [cities, city],
  );
  const smart = useMemo(() => {
    if (!text.trim()) return null;
    const hinted = TAB_HINT[tab] && !DEAL_WORDS.test(text) ? `${text}${TAB_HINT[tab]}` : text;
    return parseSmartQuery(tab === 'sale' || tab === 'rent' ? hinted : `${text}${TAB_HINT[tab]}`, {
      city: city || undefined,
      localities: smartLocalities,
    });
  }, [text, tab, city, smartLocalities]);

  /** Hand the text to the AI search page; new projects keep their own listing. */
  function goSmart(query: string) {
    if (tab === 'projects') {
      const r = parseSmartQuery(`${query}${TAB_HINT.projects}`, {
        city: city || undefined,
        localities: smartLocalities,
      });
      return start(() => router.push(r.path));
    }
    const q =
      DEAL_WORDS.test(query) || tab === 'sale' || tab === 'rent'
        ? query
        : `${query}${TAB_HINT[tab]}`;
    // Words like "rent" or "buy" in the text win over the selected tab.
    const dealFor: ListingType | undefined = DEAL_WORDS.test(query)
      ? undefined
      : tab === 'rent' || tab === 'pg'
        ? 'rent'
        : tab === 'commercial'
          ? deal
          : 'sale';
    start(() => router.push(smartSearchHref({ q: q.trim(), deal: dealFor })));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === 'smart' && text.trim()) return goSmart(text.trim());
    if (mode === 'smart') {
      const path =
        smart?.path ??
        parseSmartQuery(TAB_HINT[tab].trim(), {
          city: city || undefined,
          localities: smartLocalities,
        }).path;
      return start(() => router.push(path));
    }
    const fd = new FormData(e.currentTarget);
    const locality = (fd.get('locality') as string) || undefined;
    const maxPrice = fd.get('maxPrice') ? Number(fd.get('maxPrice')) : undefined;
    const propertyType = fixedType ?? ((fd.get('propertyType') as PropertyType) || undefined);
    if (tab === 'projects') {
      const qs = new URLSearchParams();
      if (city) qs.set('city', city);
      if (locality) qs.set('locality', locality);
      if (propertyType) qs.set('unitType', propertyType);
      if (maxPrice) qs.set('maxPrice', String(maxPrice));
      return start(() => router.push(`/projects${qs.size ? `?${qs}` : ''}`));
    }
    if (tab === 'commercial') {
      const qs = toQueryString({
        listingType,
        city: city || undefined,
        locality,
        propertyType: propertyType ? [propertyType] : undefined,
        maxPrice,
      });
      return start(() => router.push(`/commercial${qs ? `?${qs}` : ''}`));
    }
    const root = ACTION[tab];
    const path = city ? (locality ? `${root}/${city}/${locality}` : `${root}/${city}`) : root;
    const qs = toQueryString({
      category: 'residential',
      propertyType: propertyType
        ? [propertyType]
        : tab === 'farm'
          ? ['farmhouse', 'farm-land']
          : undefined,
      maxPrice,
    });
    start(() => router.push(`${path}${qs ? `?${qs}` : ''}`));
  }

  return (
    <form
      action={ACTION[tab]}
      method="get"
      onSubmit={onSubmit}
      role="search"
      aria-label="Search properties"
      className="relative rounded-2xl bg-white text-ink shadow-[0_30px_80px_-30px_rgba(11,26,63,0.6)]"
    >
      <div className="flex items-center gap-2 border-b border-line px-2 sm:px-4">
        <div
          role="tablist"
          aria-label="What are you looking for"
          className="nx-scroll-x -mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-soft hover:text-brand'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === 'smart' ? 'filters' : 'smart')}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:border-brand sm:inline-flex"
          aria-pressed={mode === 'filters'}
        >
          {mode === 'smart' ? (
            <>
              <FilterIcon size={14} /> Use filters
            </>
          ) : (
            <>
              <SparklesIcon size={14} className="text-accent-700" /> AI search
            </>
          )}
        </button>
      </div>

      <div className="p-3 sm:p-4">
        {mode === 'smart' ? (
          <>
            <div className="nx-ai-ring">
              <div className="flex items-center gap-2 rounded-[1rem] bg-white py-1.5 pl-3 pr-1.5 sm:pl-4">
                <SparklesIcon size={20} className="shrink-0 text-accent-700" />
                <label htmlFor="hs-smart" className="sr-only">
                  Describe what you are looking for
                </label>
                <input
                  id="hs-smart"
                  name="q"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={
                    focused ? 'Try: 2 BHK flat for rent under 25k in Malviya Nagar' : typed || ' '
                  }
                  autoComplete="off"
                  className="h-11 min-w-0 flex-1 bg-transparent text-[0.975rem] outline-none placeholder:text-ink-muted sm:text-base"
                />
                <button
                  type="submit"
                  className="btn btn-primary h-11 shrink-0 rounded-xl px-4 sm:px-6"
                  disabled={pending}
                  aria-label="Search"
                >
                  <SearchIcon size={18} />
                  <span className="hidden sm:inline" aria-hidden>
                    {pending ? 'Searching…' : 'Search'}
                  </span>
                </button>
              </div>
            </div>
            <div
              className="mt-3 flex min-h-8 flex-wrap items-center gap-1.5 text-xs"
              aria-live="polite"
            >
              {smart ? (
                <>
                  <span className="font-semibold text-accent-700">AI understood:</span>
                  {smart.understood.map((u) => (
                    <span
                      key={u}
                      className="rounded-full bg-accent-50 px-2.5 py-1 font-medium text-brand-800 ring-1 ring-accent-100"
                    >
                      {u}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span className="text-ink-muted">Popular:</span>
                  {popular.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => goSmart(q)}
                      className="rounded-full border border-line px-2.5 py-1 text-ink-soft transition-colors hover:border-brand hover:text-brand"
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMode('filters')}
                    className="ml-auto inline-flex items-center gap-1 font-semibold text-brand sm:hidden"
                  >
                    <FilterIcon size={13} /> Filters
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {tab === 'commercial' && (
              <div className="mb-3 flex gap-2 px-1" role="radiogroup" aria-label="Deal">
                {(['sale', 'rent'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={deal === d}
                    onClick={() => setDeal(d)}
                    className={`chip ${deal === d ? 'chip-active' : ''}`}
                  >
                    {d === 'sale' ? 'To buy' : 'To lease'}
                  </button>
                ))}
                <input type="hidden" name="listingType" value={deal} />
              </div>
            )}
            {fixedType && <input type="hidden" name="propertyType" value={fixedType} />}
            <div
              className={`grid gap-2 ${fixedType ? 'md:grid-cols-[1.4fr_1fr_auto]' : 'md:grid-cols-[1.4fr_1fr_1fr_auto]'}`}
            >
              <div className="flex rounded-xl border border-line focus-within:border-brand">
                {cities.length > 1 && (
                  <label className="sr-only" htmlFor="hs-city">
                    City
                  </label>
                )}
                {cities.length > 1 ? (
                  <select
                    id="hs-city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="max-w-[9rem] rounded-l-xl border-r border-line bg-surface px-3 text-sm font-semibold outline-none"
                  >
                    {cities.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="city" value={city} />
                    {cities[0] && (
                      <span className="flex items-center rounded-l-xl border-r border-line bg-surface px-3 text-sm font-semibold text-brand-900">
                        {cities[0].name}
                      </span>
                    )}
                  </>
                )}
                <label className="sr-only" htmlFor="hs-locality">
                  Locality
                </label>
                <select
                  id="hs-locality"
                  name="locality"
                  defaultValue=""
                  key={city}
                  className="h-12 w-full min-w-0 rounded-r-xl bg-white px-3 text-ink outline-none"
                >
                  <option value="">
                    {localities.length ? 'All localities' : 'No localities yet'}
                  </option>
                  {localities.map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fixedType ? 'hidden' : ''}>
                <label className="sr-only" htmlFor="hs-type">
                  Property type
                </label>
                <select
                  id="hs-type"
                  name="propertyType"
                  defaultValue=""
                  key={tab}
                  disabled={!!fixedType}
                  className="field h-12"
                >
                  <option value="">Any property type</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {PROPERTY_TYPE_LABELS[t as PropertyType]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="hs-budget">
                  Budget
                </label>
                <select
                  id="hs-budget"
                  name="maxPrice"
                  defaultValue=""
                  key={listingType}
                  className="field h-12"
                >
                  <option value="">
                    {listingType === 'rent' ? 'Any monthly rent' : 'Any budget'}
                  </option>
                  {steps.map((s) => (
                    <option key={s} value={s}>
                      Up to {priceLabel(s)}
                      {listingType === 'rent' ? '/mo' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary h-12 px-7" disabled={pending}>
                <SearchIcon size={18} /> {pending ? 'Searching…' : 'Search'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMode('smart')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand sm:hidden"
            >
              <SparklesIcon size={14} /> Describe it instead (AI search)
            </button>
          </>
        )}
      </div>
    </form>
  );
}
