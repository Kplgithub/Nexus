'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type Category, type City } from '@nexus/shared';
import { toQueryString } from '@/lib/search-params';
import { RENT_STEPS, rentLabel } from './options';
import { BuildingIcon, HomeIcon, SearchIcon } from '../icons';

/**
 * Home-page search. Works as a plain GET form without JavaScript; with JS it
 * builds a clean URL (no empty params) and navigates client-side.
 */
export function HeroSearch({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState<Category>('residential');
  const [city, setCity] = useState(cities[0]?.slug ?? '');
  const localities = cities.find((c) => c.slug === city)?.localities ?? [];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => (fd.get(k) ? Number(fd.get(k)) : undefined);
    const qs = toQueryString({
      category,
      city: (fd.get('city') as string) || undefined,
      locality: (fd.get('locality') as string) || undefined,
      propertyType: fd.get('propertyType') ? [fd.get('propertyType') as never] : undefined,
      maxRent: num('maxRent'),
    });
    start(() => router.push(`/properties${qs ? `?${qs}` : ''}`));
  }

  return (
    <form
      action="/properties"
      method="get"
      onSubmit={onSubmit}
      className="card p-3 sm:p-4"
      role="search"
      aria-label="Find a rental"
    >
      <input type="hidden" name="category" value={category} />
      <div
        role="radiogroup"
        aria-label="Property category"
        className="mb-3 inline-flex rounded-lg bg-surface p-1"
      >
        {(['residential', 'commercial'] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={category === c}
            onClick={() => setCategory(c)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              category === c ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {c === 'residential' ? <HomeIcon size={17} /> : <BuildingIcon size={17} />}
            {c === 'residential' ? 'Residential' : 'Commercial'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="hs-city" className="field-label">
            City
          </label>
          <select
            id="hs-city"
            name="city"
            className="field"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {cities.length === 0 && <option value="">Jaipur</option>}
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hs-locality" className="field-label">
            Locality
          </label>
          <select id="hs-locality" name="locality" className="field" defaultValue="">
            <option value="">Any locality</option>
            {localities.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hs-type" className="field-label">
            Property type
          </label>
          <select id="hs-type" name="propertyType" className="field" defaultValue="" key={category}>
            <option value="">Any type</option>
            {PROPERTY_TYPES[category].map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hs-budget" className="field-label">
            Max monthly rent
          </label>
          <select id="hs-budget" name="maxRent" className="field" defaultValue="">
            <option value="">Any budget</option>
            {RENT_STEPS.map((r) => (
              <option key={r} value={r}>
                Up to {rentLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="btn btn-primary w-full lg:w-auto lg:px-6"
            disabled={pending}
          >
            <SearchIcon size={18} />
            {pending ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  );
}
