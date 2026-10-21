'use client';

import { useMemo } from 'react';
import {
  AMENITIES,
  AMENITY_LABELS,
  AREA_TYPES,
  AREA_UNITS,
  AREA_UNIT_LABELS,
  FURNISHING_LABELS,
  FURNISHING_STATUSES,
  OWNERSHIP_LABELS,
  OWNERSHIP_TYPES,
  PARKING_LABELS,
  PARKING_OPTIONS,
  POSSESSION_LABELS,
  POSSESSION_STATUSES,
  PREFERRED_TENANTS,
  PREFERRED_TENANT_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_LABELS,
  TRANSACTION_TYPES,
  TYPES_REQUIRING_ROOMS,
  formatINR,
  formatPrice,
  toSqft,
  type AdminProperty,
  type City,
  type ListingType,
  type OwnListing,
  type PropertyImage,
  type PropertyType,
} from '@nexus/shared';
import { ImageManager } from '../admin/ImageManager';
import { PropertyCard } from '../property/PropertyCard';
import { BuildingIcon, CheckIcon, HomeIcon } from '../icons';

/* ------------------------------------------------------------------ */
/* Form state                                                          */
/* ------------------------------------------------------------------ */

/** Numbers are kept as strings so inputs can be empty while typing. */
export type ListingFormState = {
  listingType: ListingType;
  title: string;
  description: string;
  highlights: string;
  category: 'residential' | 'commercial';
  propertyType: PropertyType;
  citySlug: string;
  localitySlug: string;
  approvedAddress: string;
  pincode: string;
  projectName: string;
  price: string;
  priceNegotiable: boolean;
  securityDeposit: string;
  maintenanceCharges: string;
  maintenanceIncluded: boolean;
  brokerage: string;
  lockInMonths: string;
  rentalTerms: string;
  preferredTenants: string[];
  availableFrom: string;
  possessionStatus: string;
  possessionDate: string;
  transactionType: string;
  ownershipType: string;
  reraId: string;
  areaValue: string;
  areaUnit: OwnListing['areaUnit'];
  areaType: OwnListing['areaType'];
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  washrooms: string;
  floorNumber: string;
  totalFloors: string;
  facing: string;
  ageOfPropertyYears: string;
  furnishingStatus: OwnListing['furnishingStatus'];
  amenities: string[];
  parking: OwnListing['parking'];
  suitableFor: string;
  images: PropertyImage[];
  coverImageIndex: number;
  // Staff only
  slug: string;
  status: AdminProperty['status'];
  listingVisibility: 'public' | 'unlisted';
  featured: boolean;
  verified: boolean;
  seoTitle: string;
  seoDescription: string;
  ownerReference: string;
  internalNotes: string;
};

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function formFromListing(p?: OwnListing | AdminProperty): ListingFormState {
  const a = p as AdminProperty | undefined;
  return {
    listingType: p?.listingType ?? 'sale',
    title: p?.title ?? '',
    description: p?.description ?? '',
    highlights: p?.highlights.join('\n') ?? '',
    category: (p?.category as 'residential' | 'commercial') ?? 'residential',
    propertyType: p?.propertyType ?? 'apartment',
    citySlug: p?.citySlug ?? '',
    localitySlug: p?.localitySlug ?? '',
    approvedAddress: p?.approvedAddress ?? '',
    pincode: p?.pincode ?? '',
    projectName: p?.projectName ?? '',
    price: str(p?.price),
    priceNegotiable: p?.priceNegotiable ?? false,
    securityDeposit: str(p?.securityDeposit),
    maintenanceCharges: str(p?.maintenanceCharges),
    maintenanceIncluded: p?.maintenanceIncluded ?? false,
    brokerage: p?.brokerage ?? '',
    lockInMonths: str(p?.lockInMonths),
    rentalTerms: p?.rentalTerms ?? '',
    preferredTenants: p?.preferredTenants ?? [],
    availableFrom: p?.availableFrom ? p.availableFrom.slice(0, 10) : '',
    possessionStatus: p?.possessionStatus ?? '',
    possessionDate: p?.possessionDate ? p.possessionDate.slice(0, 10) : '',
    transactionType: p?.transactionType ?? '',
    ownershipType: p?.ownershipType ?? '',
    reraId: p?.reraId ?? '',
    areaValue: str(p?.areaValue),
    areaUnit: p?.areaUnit ?? 'sqft',
    areaType: p?.areaType ?? 'carpet',
    bedrooms: str(p?.bedrooms),
    bathrooms: str(p?.bathrooms),
    balconies: str(p?.balconies),
    washrooms: str(p?.washrooms),
    floorNumber: str(p?.floorNumber),
    totalFloors: str(p?.totalFloors),
    facing: p?.facing ?? '',
    ageOfPropertyYears: str(p?.ageOfPropertyYears),
    furnishingStatus: p?.furnishingStatus ?? 'unfurnished',
    amenities: p?.amenities ?? [],
    parking: p?.parking ?? 'none',
    suitableFor: p?.suitableFor.join(', ') ?? '',
    images: p?.images ?? [],
    coverImageIndex: p?.coverImageIndex ?? 0,
    slug: p?.slug ?? '',
    status: p?.status ?? 'draft',
    listingVisibility: a?.listingVisibility ?? 'public',
    featured: p?.featured ?? false,
    verified: p?.verified ?? false,
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
    ownerReference: a?.ownerReference ?? '',
    internalNotes: a?.internalNotes ?? '',
  };
}

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[,\s₹]/g, '')));
const opt = (s: string) => (s.trim() ? s.trim() : undefined);
const lines = (s: string, sep: string | RegExp) =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

/** Fields every poster may send. Rent-only / sale-only fields are cleared for the other deal type. */
export function userPayload(f: ListingFormState) {
  const sale = f.listingType === 'sale';
  const residential = f.category === 'residential';
  return {
    listingType: f.listingType,
    title: f.title,
    description: f.description,
    highlights: lines(f.highlights, '\n'),
    category: f.category,
    propertyType: f.propertyType,
    citySlug: f.citySlug,
    localitySlug: f.localitySlug,
    approvedAddress: f.approvedAddress,
    pincode: f.pincode,
    projectName: opt(f.projectName),
    price: num(f.price) ?? 0,
    priceNegotiable: f.priceNegotiable,
    maintenanceCharges: f.maintenanceIncluded && !sale ? null : num(f.maintenanceCharges),
    maintenanceIncluded: sale ? false : f.maintenanceIncluded,
    brokerage: opt(f.brokerage),
    securityDeposit: sale ? null : num(f.securityDeposit),
    lockInMonths: sale ? null : num(f.lockInMonths),
    rentalTerms: sale ? undefined : opt(f.rentalTerms),
    preferredTenants: sale || !residential ? [] : f.preferredTenants,
    availableFrom: sale ? null : f.availableFrom || null,
    possessionStatus: sale ? f.possessionStatus || null : null,
    possessionDate:
      sale && f.possessionStatus === 'under-construction' ? f.possessionDate || null : null,
    transactionType: sale ? f.transactionType || null : null,
    ownershipType: sale ? f.ownershipType || null : null,
    reraId: sale ? opt(f.reraId) : undefined,
    areaValue: num(f.areaValue) ?? 0,
    areaUnit: f.areaUnit,
    areaType: f.areaType,
    bedrooms: residential ? num(f.bedrooms) : null,
    bathrooms: residential ? num(f.bathrooms) : null,
    balconies: residential ? num(f.balconies) : null,
    washrooms: residential ? null : num(f.washrooms),
    floorNumber: num(f.floorNumber),
    totalFloors: num(f.totalFloors),
    facing: opt(f.facing),
    ageOfPropertyYears: num(f.ageOfPropertyYears),
    furnishingStatus: f.furnishingStatus,
    amenities: f.amenities,
    parking: f.parking,
    suitableFor: residential ? [] : lines(f.suitableFor, ','),
    images: f.images,
    coverImageIndex: f.coverImageIndex,
  };
}

export function adminPayload(f: ListingFormState, statusOverride?: string) {
  return {
    ...userPayload(f),
    ...(f.slug ? { slug: f.slug } : {}),
    status: statusOverride ?? f.status,
    listingVisibility: f.listingVisibility,
    featured: f.featured,
    verified: f.verified,
    seoTitle: opt(f.seoTitle),
    seoDescription: opt(f.seoDescription),
    ownerReference: opt(f.ownerReference),
    internalNotes: opt(f.internalNotes),
  };
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export const STEPS = [
  { id: 'basics', title: 'Property', hint: 'Sale or rent, and what kind of property' },
  { id: 'location', title: 'Location', hint: 'City, locality and a public landmark' },
  { id: 'price', title: 'Price', hint: 'Asking price or rent, and terms' },
  { id: 'details', title: 'Details', hint: 'Area, rooms, floor and features' },
  { id: 'photos', title: 'Photos & description', hint: 'What buyers will see first' },
] as const;
export type StepId = (typeof STEPS)[number]['id'];

const FIELD_STEP: Record<string, StepId> = {
  listingType: 'basics',
  category: 'basics',
  propertyType: 'basics',
  title: 'photos',
  description: 'photos',
  highlights: 'photos',
  images: 'photos',
  coverImageIndex: 'photos',
  citySlug: 'location',
  localitySlug: 'location',
  approvedAddress: 'location',
  pincode: 'location',
  projectName: 'location',
  price: 'price',
  priceNegotiable: 'price',
  securityDeposit: 'price',
  maintenanceCharges: 'price',
  brokerage: 'price',
  lockInMonths: 'price',
  rentalTerms: 'price',
  possessionStatus: 'price',
  possessionDate: 'price',
  transactionType: 'price',
  ownershipType: 'price',
  reraId: 'price',
  availableFrom: 'price',
  preferredTenants: 'price',
};

export function stepForField(field: string): StepId {
  return FIELD_STEP[field] ?? 'details';
}

/* ------------------------------------------------------------------ */
/* The form body                                                       */
/* ------------------------------------------------------------------ */

type Errors = Record<string, string[] | undefined>;

/**
 * All listing fields, grouped by step. Shared by the user's posting wizard
 * (`step` set: one group at a time) and the staff editor (`step` unset: all groups).
 */
export function ListingFields({
  f,
  setF,
  errors,
  cities,
  step,
  uploadPath,
  showBusinessHints,
}: {
  f: ListingFormState;
  setF: (fn: (s: ListingFormState) => ListingFormState) => void;
  errors: Errors;
  cities: City[];
  step?: StepId;
  uploadPath: string;
  showBusinessHints?: boolean;
}) {
  const set = <K extends keyof ListingFormState>(k: K, v: ListingFormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));
  const toggle = (k: 'amenities' | 'preferredTenants', v: string) =>
    setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const err = (k: string) => errors[k]?.[0];
  const show = (id: StepId) => !step || step === id;

  const city = cities.find((c) => c.slug === f.citySlug);
  const sale = f.listingType === 'sale';
  const residential = f.category === 'residential';
  const isPlot = f.propertyType === 'plot';
  const needsRooms = TYPES_REQUIRING_ROOMS.includes(f.propertyType);
  const priceNum = num(f.price);
  const areaNum = num(f.areaValue);
  const perSqft =
    sale && priceNum && areaNum ? Math.round(priceNum / toSqft(areaNum, f.areaUnit)) : null;

  return (
    <div className="space-y-6">
      {show('basics') && (
        <Group title="What are you listing?" bare={!!step}>
          <fieldset>
            <legend className="field-label">I want to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['sale', 'rent'] as const).map((t) => (
                <Choice
                  key={t}
                  name="listingType"
                  checked={f.listingType === t}
                  onChange={() => set('listingType', t)}
                  title={t === 'sale' ? 'Sell' : 'Rent out'}
                  text={t === 'sale' ? 'Find a buyer' : 'Find a tenant'}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-6">
            <legend className="field-label">Property category</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['residential', 'commercial'] as const).map((c) => (
                <Choice
                  key={c}
                  name="category"
                  checked={f.category === c}
                  onChange={() =>
                    setF((s) => ({
                      ...s,
                      category: c,
                      propertyType: PROPERTY_TYPES[c][0] as PropertyType,
                    }))
                  }
                  Icon={c === 'residential' ? HomeIcon : BuildingIcon}
                  title={c === 'residential' ? 'Residential' : 'Commercial'}
                  text={c === 'residential' ? 'Flat, house, villa, plot' : 'Office, shop, showroom'}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-6">
            <legend className="field-label">Property type</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES[f.category]
                .filter((t) => !(t === 'pg' && sale))
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={f.propertyType === t}
                    onClick={() => set('propertyType', t as PropertyType)}
                    className={`chip ${f.propertyType === t ? 'chip-active' : ''}`}
                  >
                    {PROPERTY_TYPE_LABELS[t as PropertyType]}
                  </button>
                ))}
            </div>
            {err('propertyType') && <p className="field-error">{err('propertyType')}</p>}
          </fieldset>
        </Group>
      )}

      {show('location') && (
        <Group title="Where is it?" bare={!!step}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={err('citySlug')} id="citySlug" label="City">
              <select
                id="citySlug"
                className="field"
                value={f.citySlug}
                onChange={(e) =>
                  setF((s) => ({ ...s, citySlug: e.target.value, localitySlug: '' }))
                }
                aria-invalid={!!err('citySlug')}
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                    {c.active === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              error={err('localitySlug')}
              id="localitySlug"
              label="Locality"
              hint={
                f.citySlug && !city?.localities.length
                  ? 'No localities are available in this city yet.'
                  : 'Don’t see yours? Choose the nearest one and mention it in the landmark.'
              }
            >
              <select
                id="localitySlug"
                className="field"
                value={f.localitySlug}
                onChange={(e) => set('localitySlug', e.target.value)}
                aria-invalid={!!err('localitySlug')}
                disabled={!city}
              >
                <option value="">Select locality</option>
                {[...(city?.localities ?? [])]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              error={err('approvedAddress')}
              id="approvedAddress"
              label="Landmark or road (shown publicly)"
              hint="e.g. “Near Gandhi Path, behind City Mall”. Never the flat or house number."
            >
              <input
                id="approvedAddress"
                className="field"
                maxLength={200}
                value={f.approvedAddress}
                onChange={(e) => set('approvedAddress', e.target.value)}
              />
            </Field>
            <Field error={err('pincode')} id="pincode" label="Pincode (optional)">
              <input
                id="pincode"
                className="field"
                inputMode="numeric"
                maxLength={6}
                value={f.pincode}
                onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field
              error={err('projectName')}
              id="projectName"
              label="Project or society name (optional)"
              hint={
                showBusinessHints ? 'Shown on the listing card for builder projects.' : undefined
              }
            >
              <input
                id="projectName"
                className="field"
                maxLength={120}
                value={f.projectName}
                onChange={(e) => set('projectName', e.target.value)}
              />
            </Field>
          </div>
        </Group>
      )}

      {show('price') && (
        <Group title={sale ? 'Price and legal details' : 'Rent and terms'} bare={!!step}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              error={err('price')}
              id="price"
              label={sale ? 'Asking price (₹)' : 'Monthly rent (₹)'}
              hint={
                priceNum
                  ? `${formatPrice(priceNum, f.listingType)}${perSqft ? ` · ${formatINR(perSqft)}/sq ft` : ''}`
                  : sale
                    ? 'Total price in rupees, e.g. 6500000'
                    : 'Rent per month in rupees'
              }
            >
              <input
                id="price"
                className="field tabular"
                inputMode="numeric"
                value={f.price}
                onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))}
                aria-invalid={!!err('price')}
              />
            </Field>
            {!sale && (
              <Field
                error={err('securityDeposit')}
                id="securityDeposit"
                label="Security deposit (₹)"
              >
                <input
                  id="securityDeposit"
                  className="field tabular"
                  inputMode="numeric"
                  value={f.securityDeposit}
                  onChange={(e) => set('securityDeposit', e.target.value.replace(/[^\d]/g, ''))}
                />
              </Field>
            )}
            <Field
              error={err('maintenanceCharges')}
              id="maintenanceCharges"
              label="Maintenance (₹/month)"
            >
              <input
                id="maintenanceCharges"
                className="field tabular"
                inputMode="numeric"
                disabled={!sale && f.maintenanceIncluded}
                value={f.maintenanceCharges}
                onChange={(e) => set('maintenanceCharges', e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
            <Check
              checked={f.priceNegotiable}
              onChange={(v) => set('priceNegotiable', v)}
              label={sale ? 'Price is negotiable' : 'Rent is negotiable'}
            />
            {!sale && (
              <Check
                checked={f.maintenanceIncluded}
                onChange={(v) => set('maintenanceIncluded', v)}
                label="Maintenance included in rent"
              />
            )}
          </div>

          {sale ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field error={err('possessionStatus')} id="possessionStatus" label="Possession">
                <select
                  id="possessionStatus"
                  className="field"
                  value={f.possessionStatus}
                  onChange={(e) => set('possessionStatus', e.target.value)}
                >
                  <option value="">Select</option>
                  {POSSESSION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {POSSESSION_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              {f.possessionStatus === 'under-construction' && (
                <Field
                  error={err('possessionDate')}
                  id="possessionDate"
                  label="Expected possession"
                >
                  <input
                    id="possessionDate"
                    type="date"
                    className="field"
                    value={f.possessionDate}
                    onChange={(e) => set('possessionDate', e.target.value)}
                  />
                </Field>
              )}
              <Field error={err('transactionType')} id="transactionType" label="Transaction">
                <select
                  id="transactionType"
                  className="field"
                  value={f.transactionType}
                  onChange={(e) => set('transactionType', e.target.value)}
                >
                  <option value="">Select</option>
                  {TRANSACTION_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {TRANSACTION_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field error={err('ownershipType')} id="ownershipType" label="Ownership">
                <select
                  id="ownershipType"
                  className="field"
                  value={f.ownershipType}
                  onChange={(e) => set('ownershipType', e.target.value)}
                >
                  <option value="">Select</option>
                  {OWNERSHIP_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {OWNERSHIP_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                error={err('reraId')}
                id="reraId"
                label="RERA registration (if applicable)"
                hint="Required by law for most new projects. It is shown on the listing."
              >
                <input
                  id="reraId"
                  className="field"
                  maxLength={60}
                  value={f.reraId}
                  onChange={(e) => set('reraId', e.target.value)}
                />
              </Field>
              <Field error={err('brokerage')} id="brokerage" label="Brokerage (optional)">
                <input
                  id="brokerage"
                  className="field"
                  maxLength={120}
                  value={f.brokerage}
                  onChange={(e) => set('brokerage', e.target.value)}
                  placeholder="e.g. No brokerage"
                />
              </Field>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field
                error={err('availableFrom')}
                id="availableFrom"
                label="Available from"
                hint="Leave empty if available now."
              >
                <input
                  id="availableFrom"
                  type="date"
                  className="field"
                  value={f.availableFrom}
                  onChange={(e) => set('availableFrom', e.target.value)}
                />
              </Field>
              <Field error={err('lockInMonths')} id="lockInMonths" label="Lock-in (months)">
                <input
                  id="lockInMonths"
                  className="field"
                  inputMode="numeric"
                  value={f.lockInMonths}
                  onChange={(e) => set('lockInMonths', e.target.value.replace(/[^\d]/g, ''))}
                />
              </Field>
              <Field error={err('brokerage')} id="brokerage" label="Brokerage (optional)">
                <input
                  id="brokerage"
                  className="field"
                  maxLength={120}
                  value={f.brokerage}
                  onChange={(e) => set('brokerage', e.target.value)}
                  placeholder="e.g. One month’s rent"
                />
              </Field>
              {residential && (
                <fieldset className="md:col-span-3">
                  <legend className="field-label">Preferred tenants</legend>
                  <div className="flex flex-wrap gap-2">
                    {PREFERRED_TENANTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={f.preferredTenants.includes(t)}
                        onClick={() => toggle('preferredTenants', t)}
                        className={`chip ${f.preferredTenants.includes(t) ? 'chip-active' : ''}`}
                      >
                        {PREFERRED_TENANT_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="md:col-span-3">
                <Field error={err('rentalTerms')} id="rentalTerms" label="Other terms (optional)">
                  <textarea
                    id="rentalTerms"
                    className="field"
                    maxLength={2000}
                    value={f.rentalTerms}
                    onChange={(e) => set('rentalTerms', e.target.value)}
                    placeholder="e.g. Rent increases 5% yearly. Two months’ notice."
                  />
                </Field>
              </div>
            </div>
          )}
        </Group>
      )}

      {show('details') && (
        <Group title="Size and features" bare={!!step}>
          <div className="grid gap-4 md:grid-cols-4">
            <Field error={err('areaValue')} id="areaValue" label="Area">
              <input
                id="areaValue"
                className="field tabular"
                inputMode="decimal"
                value={f.areaValue}
                onChange={(e) => set('areaValue', e.target.value.replace(/[^\d.]/g, ''))}
                aria-invalid={!!err('areaValue')}
              />
            </Field>
            <Field error={err('areaUnit')} id="areaUnit" label="Unit">
              <select
                id="areaUnit"
                className="field"
                value={f.areaUnit}
                onChange={(e) => set('areaUnit', e.target.value as ListingFormState['areaUnit'])}
              >
                {AREA_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {AREA_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field error={err('areaType')} id="areaType" label="Measured as">
              <select
                id="areaType"
                className="field"
                value={f.areaType}
                onChange={(e) => set('areaType', e.target.value as ListingFormState['areaType'])}
              >
                {AREA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {cap(t.replace(/-/g, ' '))} area
                  </option>
                ))}
              </select>
            </Field>
            {!isPlot && (
              <Field error={err('furnishingStatus')} id="furnishingStatus" label="Furnishing">
                <select
                  id="furnishingStatus"
                  className="field"
                  value={f.furnishingStatus}
                  onChange={(e) =>
                    set('furnishingStatus', e.target.value as ListingFormState['furnishingStatus'])
                  }
                >
                  {FURNISHING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FURNISHING_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {residential && !isPlot && (
              <>
                <NumField
                  f={f}
                  set={set}
                  err={err}
                  k="bedrooms"
                  label={`Bedrooms${needsRooms ? '' : ' (optional)'}`}
                  hint="0 for studio"
                />
                <NumField
                  f={f}
                  set={set}
                  err={err}
                  k="bathrooms"
                  label={`Bathrooms${needsRooms ? '' : ' (optional)'}`}
                />
                <NumField f={f} set={set} err={err} k="balconies" label="Balconies" />
              </>
            )}
            {!residential && <NumField f={f} set={set} err={err} k="washrooms" label="Washrooms" />}
            {!isPlot && (
              <>
                <NumField
                  f={f}
                  set={set}
                  err={err}
                  k="floorNumber"
                  label="Floor"
                  hint="0 = ground"
                  allowNegative
                />
                <NumField f={f} set={set} err={err} k="totalFloors" label="Total floors" />
                <NumField
                  f={f}
                  set={set}
                  err={err}
                  k="ageOfPropertyYears"
                  label="Age (years)"
                  hint="0 = new"
                />
              </>
            )}
            <Field error={err('facing')} id="facing" label="Facing">
              <input
                id="facing"
                className="field"
                maxLength={30}
                value={f.facing}
                onChange={(e) => set('facing', e.target.value)}
                placeholder="e.g. East"
              />
            </Field>
            <Field error={err('parking')} id="parking" label="Parking">
              <select
                id="parking"
                className="field"
                value={f.parking}
                onChange={(e) => set('parking', e.target.value as ListingFormState['parking'])}
              >
                {PARKING_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PARKING_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            {!residential && (
              <div className="md:col-span-2">
                <Field
                  error={err('suitableFor')}
                  id="suitableFor"
                  label="Suitable for"
                  hint="Comma separated, e.g. Retail, Café, Clinic"
                >
                  <input
                    id="suitableFor"
                    className="field"
                    value={f.suitableFor}
                    onChange={(e) => set('suitableFor', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
          <fieldset className="mt-6">
            <legend className="field-label">Amenities</legend>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={f.amenities.includes(a)}
                  onClick={() => toggle('amenities', a)}
                  className={`chip ${f.amenities.includes(a) ? 'chip-active' : ''}`}
                >
                  {f.amenities.includes(a) && <CheckIcon size={14} />} {AMENITY_LABELS[a]}
                </button>
              ))}
            </div>
          </fieldset>
        </Group>
      )}

      {show('photos') && (
        <Group title="Photos and description" bare={!!step}>
          <ImageManager
            images={f.images}
            cover={f.coverImageIndex}
            title={f.title}
            uploadPath={uploadPath}
            onChange={(images, cover) => setF((s) => ({ ...s, images, coverImageIndex: cover }))}
          />
          {err('images') && <p className="field-error">{err('images')}</p>}
          <div className="mt-6 space-y-4">
            <Field
              error={err('title')}
              id="title"
              label="Listing title"
              hint={`e.g. “3 BHK corner flat with park view near Gandhi Path”. ${f.title.length}/140`}
            >
              <input
                id="title"
                className="field"
                value={f.title}
                maxLength={140}
                onChange={(e) => set('title', e.target.value)}
                aria-invalid={!!err('title')}
              />
            </Field>
            <Field
              error={err('description')}
              id="description"
              label="Description"
              hint="At least 30 characters. Mention what makes it good to live or work in, nearby schools, markets or transport."
            >
              <textarea
                id="description"
                className="field min-h-44"
                maxLength={6000}
                value={f.description}
                onChange={(e) => set('description', e.target.value)}
                aria-invalid={!!err('description')}
              />
            </Field>
            <Field
              error={err('highlights')}
              id="highlights"
              label="Highlights (optional)"
              hint="One per line, up to 12."
            >
              <textarea
                id="highlights"
                className="field"
                value={f.highlights}
                onChange={(e) => set('highlights', e.target.value)}
              />
            </Field>
          </div>
        </Group>
      )}
    </div>
  );
}

/** Live card preview, as it will appear in search results. */
export function ListingPreview({
  f,
  cities,
  id,
  isDemo,
}: {
  f: ListingFormState;
  cities: City[];
  id?: string;
  isDemo?: boolean;
}) {
  const city = cities.find((c) => c.slug === f.citySlug);
  const card = useMemo(
    () => ({
      id: id ?? 'preview',
      slug: f.slug || 'preview',
      listingType: f.listingType,
      title: f.title || 'Your listing title',
      category: f.category,
      propertyType: f.propertyType,
      status: 'published' as const,
      city: { slug: f.citySlug, name: city?.name ?? 'City' },
      locality: {
        slug: f.localitySlug,
        name: city?.localities.find((l) => l.slug === f.localitySlug)?.name ?? 'Locality',
      },
      projectName: f.projectName || null,
      price: Number(num(f.price) ?? 0),
      pricePerSqft: null,
      areaValue: Number(num(f.areaValue) ?? 0),
      areaUnit: f.areaUnit,
      bedrooms: num(f.bedrooms),
      bathrooms: num(f.bathrooms),
      furnishingStatus: f.furnishingStatus,
      possessionStatus: (f.possessionStatus || null) as never,
      coverImage: f.images[f.coverImageIndex] ?? f.images[0] ?? null,
      featured: f.featured,
      verified: f.verified,
      isDemo: isDemo ?? false,
      availableFrom: f.availableFrom || null,
      publishedAt: null,
      posterType: 'owner' as const,
      imageCount: f.images.length,
    }),
    [f, city, id, isDemo],
  );
  return <PropertyCard p={card} preview />;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Group({
  title,
  children,
  bare,
}: {
  title: string;
  children: React.ReactNode;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <section>
        <h2 className="mb-6 text-[1.6rem] leading-tight">{title}</h2>
        {children}
      </section>
    );
  }
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 font-sans text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  children,
  hint,
  error,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function NumField({
  f,
  set,
  err,
  k,
  label,
  hint,
  allowNegative,
}: {
  f: ListingFormState;
  set: <K extends keyof ListingFormState>(k: K, v: ListingFormState[K]) => void;
  err: (k: string) => string | undefined;
  k:
    | 'bedrooms'
    | 'bathrooms'
    | 'balconies'
    | 'washrooms'
    | 'floorNumber'
    | 'totalFloors'
    | 'ageOfPropertyYears';
  label: string;
  hint?: string;
  allowNegative?: boolean;
}) {
  return (
    <Field error={err(k)} id={k} label={label} hint={hint}>
      <input
        id={k}
        className="field tabular"
        inputMode="numeric"
        value={f[k]}
        onChange={(e) => set(k, e.target.value.replace(allowNegative ? /[^\d-]/g : /[^\d]/g, ''))}
        aria-invalid={!!err(k)}
      />
    </Field>
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
      <input
        type="checkbox"
        className="size-4 accent-[var(--color-brand)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  text,
  Icon,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  text: string;
  Icon?: typeof HomeIcon;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
        checked
          ? 'border-brand bg-brand-50 ring-1 ring-brand'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {Icon && <Icon size={24} className={checked ? 'text-brand' : 'text-ink-muted'} />}
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-muted">{text}</span>
      </span>
      <span
        aria-hidden
        className={`ml-auto grid size-5 place-items-center rounded-full border ${checked ? 'border-brand bg-brand text-white' : 'border-line-strong'}`}
      >
        {checked && <CheckIcon size={12} />}
      </span>
    </label>
  );
}
