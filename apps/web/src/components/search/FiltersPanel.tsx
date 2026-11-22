'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  AMENITY_LABELS,
  FURNISHING_LABELS,
  FURNISHING_STATUSES,
  PG_GENDERS,
  PG_GENDER_LABELS,
  PLOT_APPROVALS,
  PLOT_APPROVAL_LABELS,
  AREA_TO_SQFT,
  FARM_LAND_USES,
  FARM_LAND_USE_LABELS,
  FARM_WATER_SOURCES,
  FARM_WATER_SOURCE_LABELS,
  LAND_AREA_UNITS,
  isFarmType,
  type LandAreaUnit,
  POSTED_WITHIN_DAYS,
  POSSESSION_LABELS,
  POSSESSION_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type Amenity,
  type Category,
  type City,
  type ListingType,
  type PropertySearch,
} from '@nexus/shared';
import { toQueryString } from '@/lib/search-params';
import { AREA_STEPS, priceLabel, priceSteps } from './options';
import { CloseIcon, FilterIcon } from '../icons';
import { useSections } from '../session/SectionsProvider';

const RESIDENTIAL_AMENITIES: Amenity[] = [
  'lift',
  'power-backup',
  'security',
  'gated-community',
  'gym',
  'swimming-pool',
  'modular-kitchen',
  'air-conditioning',
  'pet-friendly',
];
const COMMERCIAL_AMENITIES: Amenity[] = [
  'power-backup',
  'lift',
  'air-conditioning',
  'fire-safety',
  'conference-room',
  'pantry',
  'private-washroom',
  'cctv',
  'visitor-parking',
];

type Props = {
  search: PropertySearch;
  cities: City[];
  basePath: string;
  /** Scope fixed by the page (category page or location page) — not editable here. */
  fixed?: { listingType?: ListingType; category?: Category; city?: string; locality?: string };
  resultCount: number;
  /** Current results view; kept when filters change. */
  view?: 'list' | 'grid' | 'map';
  /** Admin switch: farm types and farm filters. */
  farmsOn?: boolean;
};

export function FiltersPanel({
  search,
  cities,
  basePath,
  fixed = {},
  resultCount,
  view = 'list',
  farmsOn = true,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | ''>(fixed.category ?? search.category ?? '');
  const [city, setCity] = useState(fixed.city ?? search.city ?? '');
  const [deal, setDeal] = useState<ListingType | ''>(fixed.listingType ?? search.listingType ?? '');
  const steps = priceSteps(deal || undefined);
  const localities = cities.find((c) => c.slug === city)?.localities ?? [];

  const on = useSections();
  const isResidential = category === 'residential';
  // Choices from switched-off site sections are left out (Admin → Settings → Site sections).
  // Farms are sold only, and admin can switch them off.
  const types = (
    category
      ? PROPERTY_TYPES[category]
      : [...PROPERTY_TYPES.residential, ...PROPERTY_TYPES.commercial]
  ).filter(
    (t) =>
      (t !== 'pg' || on.pg) &&
      (t !== 'plot' || on.plot) &&
      (on.commercial || !(PROPERTY_TYPES.commercial as readonly string[]).includes(t)) &&
      (!isFarmType(t) || (farmsOn && on.buy && deal !== 'rent')),
  );
  const commercialPage = fixed.category === 'commercial';
  const dealOptions = (
    [
      ['', 'Any'],
      ['sale', 'Buy'],
      ['rent', 'Rent'],
    ] as const
  ).filter(([v]) => commercialPage || !v || (v === 'sale' ? on.buy : on.rent));
  const categoryOptions = (
    [
      ['', 'All'],
      ['residential', 'Residential'],
      ['commercial', 'Commercial'],
    ] as const
  ).filter(([v]) => !v || (v === 'commercial' ? on.commercial : on.buy || on.rent));
  const showPlot = on.plot && deal !== 'rent' && category !== 'commercial';
  const showPg = on.pg && deal !== 'sale' && category !== 'commercial';
  const farmsShown = farmsOn && on.buy;
  const [picked, setPicked] = useState<string[]>(search.propertyType ?? []);
  const farmPicked = farmsShown && deal !== 'rent' && picked.some((t) => isFarmType(t));
  const farmOnly = farmPicked && picked.every((t) => isFarmType(t));
  const [landUnit, setLandUnit] = useState<LandAreaUnit>('bigha');
  const inLand = (sqft: number | undefined) =>
    sqft === undefined ? '' : String(Math.round((sqft / AREA_TO_SQFT[landUnit]) * 100) / 100);
  const amenities =
    category === 'commercial'
      ? COMMERCIAL_AMENITIES
      : category === 'residential'
        ? RESIDENTIAL_AMENITIES
        : [...new Set([...RESIDENTIAL_AMENITIES, ...COMMERCIAL_AMENITIES])];

  const activeCount = [
    !fixed.listingType && search.listingType,
    !fixed.category && search.category,
    !fixed.city && search.city,
    !fixed.locality && search.locality,
    search.minPrice,
    search.maxPrice,
    search.possession,
    search.postedBy,
    search.verified,
    search.propertyType?.length,
    search.furnishing?.length,
    search.bedrooms,
    search.bathrooms,
    search.minArea,
    search.maxArea,
    search.amenities?.length,
    search.parking,
    search.availableNow,
    search.withPhotos,
    search.rera,
    search.plotApproval?.length,
    search.farmLandUse?.length,
    search.farmWater?.length,
    search.pgGender,
    search.pgFood,
    search.postedWithin,
  ].filter(Boolean).length;

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const n = (k: string) => {
      const v = fd.get(k);
      return v ? Number(v) : undefined;
    };
    const all = (k: string) => fd.getAll(k).map(String).filter(Boolean);
    /** Land area typed in bigha or acre, sent to the API in sq ft. */
    const land = (k: string) => {
      const v = Number(fd.get(k));
      return v > 0 ? Math.round(v * AREA_TO_SQFT[landUnit]) : undefined;
    };
    const next: Partial<PropertySearch> = {
      listingType: (deal || undefined) as ListingType | undefined,
      category: (category || undefined) as Category | undefined,
      city: city || undefined,
      locality: (fd.get('locality') as string) || undefined,
      propertyType: all('propertyType') as PropertySearch['propertyType'],
      minPrice: n('minPrice'),
      maxPrice: n('maxPrice'),
      possession:
        deal === 'sale'
          ? (fd.get('possession') as PropertySearch['possession']) || undefined
          : undefined,
      postedBy: (fd.get('postedBy') as PropertySearch['postedBy']) || undefined,
      verified: fd.get('verified') === 'true' || undefined,
      furnishing: all('furnishing') as PropertySearch['furnishing'],
      bedrooms: isResidential || !category ? n('bedrooms') : undefined,
      bathrooms: isResidential || !category ? n('bathrooms') : undefined,
      minArea: farmOnly ? land('landMin') : n('minArea'),
      maxArea: farmOnly ? land('landMax') : n('maxArea'),
      amenities: farmOnly ? undefined : (all('amenities') as PropertySearch['amenities']),
      farmLandUse: farmPicked ? (all('farmLandUse') as PropertySearch['farmLandUse']) : undefined,
      farmWater: farmPicked ? (all('farmWater') as PropertySearch['farmWater']) : undefined,
      parking: fd.get('parking') === 'true' || undefined,
      availableNow: deal !== 'sale' && fd.get('availableNow') === 'true' ? true : undefined,
      withPhotos: fd.get('withPhotos') === 'true' || undefined,
      rera: deal !== 'rent' && fd.get('rera') === 'true' ? true : undefined,
      plotApproval:
        showPlot && fd.get('plotApproval')
          ? ([fd.get('plotApproval')] as PropertySearch['plotApproval'])
          : undefined,
      pgGender:
        deal !== 'sale' && category !== 'commercial'
          ? (fd.get('pgGender') as PropertySearch['pgGender']) || undefined
          : undefined,
      pgFood: deal !== 'sale' && fd.get('pgFood') === 'true' ? true : undefined,
      postedWithin: n('postedWithin') as PropertySearch['postedWithin'],
      project: search.project,
      q: search.q,
      sort: search.sort,
    };
    const omit: (keyof PropertySearch)[] = [];
    if (fixed.listingType) omit.push('listingType');
    if (fixed.category) omit.push('category');
    if (fixed.city) omit.push('city');
    if (fixed.locality) omit.push('locality');
    const params = new URLSearchParams(toQueryString(next, omit));
    if (view !== 'list') params.set('view', view);
    const qs = params.toString();
    setOpen(false);
    start(() => router.push(`${basePath}${qs ? `?${qs}` : ''}`, { scroll: false }));
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full lg:hidden"
        aria-expanded={open}
        aria-controls="filters"
        onClick={() => setOpen((o) => !o)}
      >
        <FilterIcon size={18} /> Filters{activeCount ? ` (${activeCount})` : ''}
      </button>

      <form
        id="filters"
        onSubmit={apply}
        action={basePath}
        method="get"
        aria-label="Filter properties"
        className={`${open ? 'block' : 'hidden'} mt-3 rounded-2xl border border-line bg-white p-5 lg:mt-0 lg:block`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm lg:hidden"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {!fixed.listingType && dealOptions.length > 2 && (
            <fieldset>
              <legend className="field-label">Looking to</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1 text-sm">
                {dealOptions.map(([v, label]) => (
                  <label
                    key={v}
                    className={`cursor-pointer rounded-md px-2 py-2 text-center font-medium ${deal === v ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
                  >
                    <input
                      type="radio"
                      name="listingType"
                      value={v}
                      className="sr-only"
                      checked={deal === v}
                      onChange={() => setDeal(v)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {!fixed.category && categoryOptions.length > 2 && (
            <fieldset>
              <legend className="field-label">Category</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1 text-sm">
                {categoryOptions.map(([v, label]) => (
                  <label
                    key={v}
                    className={`cursor-pointer rounded-md px-2 py-2 text-center font-medium ${category === v ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={v}
                      className="sr-only"
                      checked={category === v}
                      onChange={() => setCategory(v)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!fixed.city && (
            <div>
              <label htmlFor="f-city" className="field-label">
                City
              </label>
              <select
                id="f-city"
                name="city"
                className="field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Any city</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!fixed.locality && city && (
            <div>
              <label htmlFor="f-locality" className="field-label">
                Locality
              </label>
              <select
                id="f-locality"
                name="locality"
                className="field"
                defaultValue={search.locality ?? ''}
                key={city}
              >
                <option value="">Any locality</option>
                {localities.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <fieldset>
            <legend className="field-label">
              {deal === 'rent' ? 'Monthly rent' : deal === 'sale' ? 'Budget' : 'Price'}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <select
                name="minPrice"
                aria-label="Minimum price"
                className="field"
                defaultValue={search.minPrice ?? ''}
                key={`min-${deal}`}
              >
                <option value="">No min</option>
                {steps.map((r) => (
                  <option key={r} value={r}>
                    {priceLabel(r)}
                  </option>
                ))}
              </select>
              <select
                name="maxPrice"
                aria-label="Maximum price"
                className="field"
                defaultValue={search.maxPrice ?? ''}
                key={`max-${deal}`}
              >
                <option value="">No max</option>
                {steps.map((r) => (
                  <option key={r} value={r}>
                    {priceLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {deal === 'sale' && (
            <div>
              <label htmlFor="f-possession" className="field-label">
                Possession
              </label>
              <select
                id="f-possession"
                name="possession"
                className="field"
                defaultValue={search.possession ?? ''}
              >
                <option value="">Any</option>
                {POSSESSION_STATUSES.map((p) => (
                  <option key={p} value={p}>
                    {POSSESSION_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="f-posted" className="field-label">
              Posted by
            </label>
            <select
              id="f-posted"
              name="postedBy"
              className="field"
              defaultValue={search.postedBy ?? ''}
            >
              <option value="">Anyone</option>
              <option value="owner">Owner</option>
              <option value="agent">Agent</option>
              <option value="builder">Builder</option>
              <option value="nexus">NEXUS Estate</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-within" className="field-label">
              Posted within
            </label>
            <select
              id="f-within"
              name="postedWithin"
              className="field"
              defaultValue={search.postedWithin ?? ''}
            >
              <option value="">Any time</option>
              {POSTED_WITHIN_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? 'Last 24 hours' : `Last ${d} days`}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="field-label">Property type</legend>
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {types.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    name="propertyType"
                    value={t}
                    defaultChecked={search.propertyType?.includes(t)}
                    onChange={(e) =>
                      setPicked(
                        e.currentTarget.form
                          ? new FormData(e.currentTarget.form).getAll('propertyType').map(String)
                          : [],
                      )
                    }
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  {PROPERTY_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          {farmPicked && (
            <div className="space-y-4 rounded-xl border border-line bg-surface/60 p-3">
              {farmOnly && (
                <fieldset>
                  <legend className="field-label">Land area</legend>
                  <div
                    role="group"
                    aria-label="Land unit"
                    className="mb-2 inline-flex overflow-hidden rounded-lg border border-line"
                  >
                    {LAND_AREA_UNITS.map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={landUnit === u}
                        onClick={() => setLandUnit(u)}
                        className={`px-3 py-1.5 text-sm font-semibold ${landUnit === u ? 'bg-brand text-white' : 'bg-white text-ink-soft'}`}
                      >
                        {u === 'bigha' ? 'Bigha' : 'Acre'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      key={`min-${landUnit}`}
                      name="landMin"
                      aria-label={`Minimum land in ${landUnit}`}
                      className="field"
                      inputMode="decimal"
                      placeholder="Min"
                      defaultValue={inLand(search.minArea)}
                    />
                    <input
                      key={`max-${landUnit}`}
                      name="landMax"
                      aria-label={`Maximum land in ${landUnit}`}
                      className="field"
                      inputMode="decimal"
                      placeholder="Max"
                      defaultValue={inLand(search.maxArea)}
                    />
                  </div>
                </fieldset>
              )}
              <fieldset>
                <legend className="field-label">Land use</legend>
                <div className="space-y-1.5">
                  {FARM_LAND_USES.filter((u) => u !== 'unknown').map((u) => (
                    <label
                      key={u}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        name="farmLandUse"
                        value={u}
                        defaultChecked={search.farmLandUse?.includes(u)}
                        className="size-4 accent-[var(--color-brand)]"
                      />
                      {FARM_LAND_USE_LABELS[u]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Water source</legend>
                <div className="space-y-1.5">
                  {FARM_WATER_SOURCES.filter((w) => w !== 'none').map((w) => (
                    <label
                      key={w}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        name="farmWater"
                        value={w}
                        defaultChecked={search.farmWater?.includes(w)}
                        className="size-4 accent-[var(--color-brand)]"
                      />
                      {FARM_WATER_SOURCE_LABELS[w]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {(isResidential || !category) && !farmOnly && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="f-bed" className="field-label">
                  Bedrooms
                </label>
                <select
                  id="f-bed"
                  name="bedrooms"
                  className="field"
                  defaultValue={search.bedrooms ?? ''}
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((b) => (
                    <option key={b} value={b}>
                      {b}+ BHK
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-bath" className="field-label">
                  Bathrooms
                </label>
                <select
                  id="f-bath"
                  name="bathrooms"
                  className="field"
                  defaultValue={search.bathrooms ?? ''}
                >
                  <option value="">Any</option>
                  {[1, 2, 3].map((b) => (
                    <option key={b} value={b}>
                      {b}+
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {showPlot && (
            <div>
              <label htmlFor="f-plot" className="field-label">
                Plot approved by
              </label>
              <select
                id="f-plot"
                name="plotApproval"
                className="field"
                defaultValue={search.plotApproval?.[0] ?? ''}
              >
                <option value="">Any</option>
                {PLOT_APPROVALS.filter((a) => a !== 'none').map((a) => (
                  <option key={a} value={a}>
                    {PLOT_APPROVAL_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showPg && (
            <div>
              <label htmlFor="f-pg" className="field-label">
                PG / hostel for
              </label>
              <select
                id="f-pg"
                name="pgGender"
                className="field"
                defaultValue={search.pgGender ?? ''}
              >
                <option value="">Any</option>
                {PG_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {PG_GENDER_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!farmOnly && (
            <fieldset>
              <legend className="field-label">Furnishing</legend>
              <div className="space-y-1.5">
                {FURNISHING_STATUSES.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      name="furnishing"
                      value={f}
                      defaultChecked={search.furnishing?.includes(f)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    {FURNISHING_LABELS[f]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!farmOnly && (
            <fieldset>
              <legend className="field-label">Area (sq ft)</legend>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="minArea"
                  aria-label="Minimum area"
                  className="field"
                  defaultValue={search.minArea ?? ''}
                >
                  <option value="">No min</option>
                  {AREA_STEPS.map((a) => (
                    <option key={a} value={a}>
                      {a.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                <select
                  name="maxArea"
                  aria-label="Maximum area"
                  className="field"
                  defaultValue={search.maxArea ?? ''}
                >
                  <option value="">No max</option>
                  {AREA_STEPS.map((a) => (
                    <option key={a} value={a}>
                      {a.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          )}

          {!farmOnly && (
            <fieldset>
              <legend className="field-label">Amenities</legend>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {amenities.map((a) => (
                  <label
                    key={a}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={a}
                      defaultChecked={search.amenities?.includes(a)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    {AMENITY_LABELS[a]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-1.5">
            <legend className="field-label">More</legend>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="parking"
                value="true"
                defaultChecked={search.parking}
                className="size-4 accent-[var(--color-brand)]"
              />
              Parking available
            </label>
            {deal !== 'sale' && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="availableNow"
                  value="true"
                  defaultChecked={search.availableNow}
                  className="size-4 accent-[var(--color-brand)]"
                />
                Available now
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="verified"
                value="true"
                defaultChecked={search.verified}
                className="size-4 accent-[var(--color-brand)]"
              />
              Verified listings only
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="withPhotos"
                value="true"
                defaultChecked={search.withPhotos}
                className="size-4 accent-[var(--color-brand)]"
              />
              With photos only
            </label>
            {deal !== 'rent' && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="rera"
                  value="true"
                  defaultChecked={search.rera}
                  className="size-4 accent-[var(--color-brand)]"
                />
                RERA registered
              </label>
            )}
            {showPg && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="pgFood"
                  value="true"
                  defaultChecked={search.pgFood}
                  className="size-4 accent-[var(--color-brand)]"
                />
                PG with meals
              </label>
            )}
          </fieldset>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex gap-2 border-t border-line bg-white p-4 lg:static lg:m-0 lg:mt-6 lg:border-0 lg:p-0">
          <button type="submit" className="btn btn-primary flex-1" disabled={pending}>
            {pending ? 'Updating…' : `Show results`}
          </button>
          {activeCount > 0 && (
            <Link href={basePath} className="btn btn-outline" scroll={false}>
              Clear
            </Link>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {pending ? 'Loading results' : `${resultCount} properties found`}
        </p>
      </form>
    </div>
  );
}
