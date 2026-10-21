'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type City,
  type ListingType,
  type PropertyType,
} from '@nexus/shared';
import { toQueryString } from '@/lib/search-params';
import { priceLabel, priceSteps } from './options';
import { SearchIcon } from '../icons';

type Tab = 'sale' | 'rent' | 'commercial';
const TABS: { id: Tab; label: string }[] = [
  { id: 'sale', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'commercial', label: 'Commercial' },
];

const RESIDENTIAL: readonly PropertyType[] = PROPERTY_TYPES.residential;
const COMMERCIAL: readonly PropertyType[] = PROPERTY_TYPES.commercial;

/**
 * Home-page search. Cities and localities are exactly the ones the admin has
 * added. Works as a plain GET form without JavaScript.
 */
export function HeroSearch({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>('sale');
  const [city, setCity] = useState(cities[0]?.slug ?? '');
  const [deal, setDeal] = useState<ListingType>('sale');
  const localities = [...(cities.find((c) => c.slug === city)?.localities ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const listingType: ListingType = tab === 'commercial' ? deal : tab;
  const types = tab === 'commercial' ? COMMERCIAL : RESIDENTIAL;
  const steps = priceSteps(listingType);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const locality = (fd.get('locality') as string) || undefined;
    const maxPrice = fd.get('maxPrice') ? Number(fd.get('maxPrice')) : undefined;
    const propertyType = (fd.get('propertyType') as PropertyType) || undefined;
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
    const root = tab === 'sale' ? '/buy' : '/rent';
    const path = city ? (locality ? `${root}/${city}/${locality}` : `${root}/${city}`) : root;
    const qs = toQueryString({
      category: 'residential',
      propertyType: propertyType ? [propertyType] : undefined,
      maxPrice,
    });
    start(() => router.push(`${path}${qs ? `?${qs}` : ''}`));
  }

  return (
    <form
      action={tab === 'sale' ? '/buy' : tab === 'rent' ? '/rent' : '/commercial'}
      method="get"
      onSubmit={onSubmit}
      role="search"
      aria-label="Search properties"
      className="relative"
    >
      <div role="tablist" aria-label="What are you looking for" className="flex gap-1 pl-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-white text-brand-900' : 'text-white/80 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl rounded-tl-none bg-white p-3 shadow-[0_24px_60px_-20px_rgba(1,42,51,0.45)] sm:p-4">
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
        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
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
              className="h-12 w-full min-w-0 rounded-r-xl bg-white px-3 outline-none"
            >
              <option value="">{localities.length ? 'All localities' : 'No localities yet'}</option>
              {localities.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="hs-type">
              Property type
            </label>
            <select
              id="hs-type"
              name="propertyType"
              defaultValue=""
              key={tab}
              className="field h-12"
            >
              <option value="">Any property type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
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
              <option value="">{listingType === 'rent' ? 'Any monthly rent' : 'Any budget'}</option>
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
      </div>
    </form>
  );
}
