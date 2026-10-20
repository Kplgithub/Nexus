'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AMENITIES,
  AMENITY_LABELS,
  AREA_TYPES,
  AREA_UNITS,
  AREA_UNIT_LABELS,
  FURNISHING_LABELS,
  FURNISHING_STATUSES,
  LISTING_VISIBILITY,
  PARKING_LABELS,
  PARKING_OPTIONS,
  PREFERRED_TENANTS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  TYPES_REQUIRING_ROOMS,
  formatRent,
  type AdminProperty,
  type City,
  type PropertyImage,
  type PropertyType,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { ImageManager } from './ImageManager';
import { PropertyCard } from '../property/PropertyCard';
import { StatusPill, useAdmin } from './AdminShell';
import { useApi } from './useApi';

/** Form state keeps numbers as strings so inputs can be empty while typing. */
type FormState = {
  title: string;
  slug: string;
  description: string;
  highlights: string;
  category: 'residential' | 'commercial';
  propertyType: PropertyType;
  status: AdminProperty['status'];
  listingVisibility: 'public' | 'unlisted';
  featured: boolean;
  citySlug: string;
  localitySlug: string;
  approvedAddress: string;
  pincode: string;
  monthlyRent: string;
  rentNegotiable: boolean;
  securityDeposit: string;
  maintenanceCharges: string;
  maintenanceIncluded: boolean;
  brokerage: string;
  lockInMonths: string;
  rentalTerms: string;
  areaValue: string;
  areaUnit: AdminProperty['areaUnit'];
  areaType: AdminProperty['areaType'];
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  washrooms: string;
  floorNumber: string;
  totalFloors: string;
  facing: string;
  ageOfPropertyYears: string;
  furnishingStatus: AdminProperty['furnishingStatus'];
  amenities: string[];
  parking: AdminProperty['parking'];
  preferredTenants: string[];
  suitableFor: string;
  images: PropertyImage[];
  coverImageIndex: number;
  availableFrom: string;
  seoTitle: string;
  seoDescription: string;
  ownerReference: string;
  internalNotes: string;
};

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

function fromProperty(p?: AdminProperty): FormState {
  return {
    title: p?.title ?? '',
    slug: p?.slug ?? '',
    description: p?.description ?? '',
    highlights: p?.highlights.join('\n') ?? '',
    category: (p?.category as 'residential' | 'commercial') ?? 'residential',
    propertyType: p?.propertyType ?? 'apartment',
    status: p?.status ?? 'draft',
    listingVisibility: p?.listingVisibility ?? 'public',
    featured: p?.featured ?? false,
    citySlug: p?.citySlug ?? '',
    localitySlug: p?.localitySlug ?? '',
    approvedAddress: p?.approvedAddress ?? '',
    pincode: p?.pincode ?? '',
    monthlyRent: str(p?.monthlyRent),
    rentNegotiable: p?.rentNegotiable ?? false,
    securityDeposit: str(p?.securityDeposit),
    maintenanceCharges: str(p?.maintenanceCharges),
    maintenanceIncluded: p?.maintenanceIncluded ?? false,
    brokerage: p?.brokerage ?? '',
    lockInMonths: str(p?.lockInMonths),
    rentalTerms: p?.rentalTerms ?? '',
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
    preferredTenants: p?.preferredTenants ?? [],
    suitableFor: p?.suitableFor.join(', ') ?? '',
    images: p?.images ?? [],
    coverImageIndex: p?.coverImageIndex ?? 0,
    availableFrom: p?.availableFrom ? p.availableFrom.slice(0, 10) : '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
    ownerReference: p?.ownerReference ?? '',
    internalNotes: p?.internalNotes ?? '',
  };
}

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[,\s₹]/g, '')));

function toPayload(f: FormState, statusOverride?: string) {
  return {
    title: f.title,
    ...(f.slug ? { slug: f.slug } : {}),
    description: f.description,
    highlights: f.highlights
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    category: f.category,
    propertyType: f.propertyType,
    status: statusOverride ?? f.status,
    listingVisibility: f.listingVisibility,
    featured: f.featured,
    citySlug: f.citySlug,
    localitySlug: f.localitySlug,
    approvedAddress: f.approvedAddress,
    pincode: f.pincode,
    monthlyRent: num(f.monthlyRent) ?? 0,
    rentNegotiable: f.rentNegotiable,
    securityDeposit: num(f.securityDeposit),
    maintenanceCharges: f.maintenanceIncluded ? null : num(f.maintenanceCharges),
    maintenanceIncluded: f.maintenanceIncluded,
    brokerage: f.brokerage || undefined,
    lockInMonths: num(f.lockInMonths),
    rentalTerms: f.rentalTerms || undefined,
    areaValue: num(f.areaValue) ?? 0,
    areaUnit: f.areaUnit,
    areaType: f.areaType,
    bedrooms: num(f.bedrooms),
    bathrooms: num(f.bathrooms),
    balconies: num(f.balconies),
    washrooms: num(f.washrooms),
    floorNumber: num(f.floorNumber),
    totalFloors: num(f.totalFloors),
    facing: f.facing || undefined,
    ageOfPropertyYears: num(f.ageOfPropertyYears),
    furnishingStatus: f.furnishingStatus,
    amenities: f.amenities,
    parking: f.parking,
    preferredTenants: f.preferredTenants,
    suitableFor: f.suitableFor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    images: f.images,
    coverImageIndex: f.coverImageIndex,
    availableFrom: f.availableFrom || null,
    seoTitle: f.seoTitle || undefined,
    seoDescription: f.seoDescription || undefined,
    ownerReference: f.ownerReference || undefined,
    internalNotes: f.internalNotes || undefined,
  };
}

export function PropertyEditor({ property }: { property?: AdminProperty }) {
  const router = useRouter();
  const { toast } = useAdmin();
  const [f, setF] = useState<FormState>(() => fromProperty(property));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { data: cities } = useApi<City[]>('/admin/locations');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };
  const toggle = (k: 'amenities' | 'preferredTenants', v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const city = cities?.find((c) => c.slug === f.citySlug);
  const needsRooms = TYPES_REQUIRING_ROOMS.includes(f.propertyType);
  const isResidential = f.category === 'residential';
  const err = (k: string) => errors[k]?.[0];

  const errorList = useMemo(() => Object.entries(errors), [errors]);

  async function save(statusOverride?: AdminProperty['status']) {
    setSaving(true);
    setErrors({});
    const body = toPayload(f, statusOverride);
    try {
      const { data } = property
        ? await apiFetch<AdminProperty>(`/admin/properties/${property.id}`, {
            method: 'PATCH',
            body,
          })
        : await apiFetch<AdminProperty>('/admin/properties', { method: 'POST', body });
      toast(statusOverride === 'published' ? 'Saved and published' : 'Saved');
      setDirty(false);
      if (!property) router.replace(`/admin/properties/${data.id}`);
      else {
        setF(fromProperty(data));
        router.refresh();
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.details) setErrors(e.details);
      toast(e instanceof ApiClientError ? e.message : 'Save failed', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6 pb-28"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{property ? 'Edit property' : 'New property'}</h1>
          {property && (
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
              <StatusPill status={property.status} /> /properties/{property.slug}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/properties" className="btn btn-ghost">
            Back
          </Link>
          {property && ['published', 'rented'].includes(property.status) && (
            <a
              href={`/properties/${property.slug}`}
              target="_blank"
              rel="noopener"
              className="btn btn-outline"
            >
              View live
            </a>
          )}
        </div>
      </div>

      {errorList.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-50 p-4 text-sm text-danger"
        >
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc pl-5">
            {errorList.map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {v[0]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              error={err('title')}
              id="title"
              label="Title"
              hint="e.g. “2 BHK semi-furnished flat near Gandhi Path”. 8–140 characters."
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
          </div>
          <Field error={err('category')} id="category" label="Category">
            <select
              id="category"
              className="field"
              value={f.category}
              onChange={(e) => {
                const c = e.target.value as FormState['category'];
                setF((s) => ({
                  ...s,
                  category: c,
                  propertyType: PROPERTY_TYPES[c][0] as PropertyType,
                }));
                setDirty(true);
              }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </Field>
          <Field error={err('propertyType')} id="propertyType" label="Property type">
            <select
              id="propertyType"
              className="field"
              value={f.propertyType}
              onChange={(e) => set('propertyType', e.target.value as PropertyType)}
            >
              {PROPERTY_TYPES[f.category].map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field error={err('status')} id="status" label="Status">
            <select
              id="status"
              className="field"
              value={f.status}
              onChange={(e) => set('status', e.target.value as FormState['status'])}
            >
              {PROPERTY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={err('listingVisibility')}
            id="listingVisibility"
            label="Visibility"
            hint="Unlisted = only people with the link can see it."
          >
            <select
              id="listingVisibility"
              className="field"
              value={f.listingVisibility}
              onChange={(e) =>
                set('listingVisibility', e.target.value as FormState['listingVisibility'])
              }
            >
              {LISTING_VISIBILITY.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              checked={f.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            Feature on the home page
          </label>
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
        </div>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={err('citySlug')} id="citySlug" label="City">
            <select
              id="citySlug"
              className="field"
              value={f.citySlug}
              onChange={(e) => {
                setF((s) => ({ ...s, citySlug: e.target.value, localitySlug: '' }));
                setDirty(true);
              }}
              aria-invalid={!!err('citySlug')}
            >
              <option value="">Select city</option>
              {cities?.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={err('localitySlug')}
            id="localitySlug"
            label="Locality"
            hint={
              cities && !city?.localities.length
                ? 'Add localities under Locations first.'
                : undefined
            }
          >
            <select
              id="localitySlug"
              className="field"
              value={f.localitySlug}
              onChange={(e) => set('localitySlug', e.target.value)}
              aria-invalid={!!err('localitySlug')}
            >
              <option value="">Select locality</option>
              {city?.localities.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={err('approvedAddress')}
            id="approvedAddress"
            label="Public address line"
            hint="Shown publicly. Use a landmark or road — never the flat/unit number."
          >
            <input
              id="approvedAddress"
              className="field"
              maxLength={200}
              value={f.approvedAddress}
              onChange={(e) => set('approvedAddress', e.target.value)}
            />
          </Field>
          <Field error={err('pincode')} id="pincode" label="Pincode">
            <input
              id="pincode"
              className="field"
              inputMode="numeric"
              maxLength={6}
              value={f.pincode}
              onChange={(e) => set('pincode', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Rent and terms">
        <div className="grid gap-4 md:grid-cols-3">
          <Field error={err('monthlyRent')} id="monthlyRent" label="Monthly rent (₹)">
            <input
              id="monthlyRent"
              className="field"
              inputMode="numeric"
              value={f.monthlyRent}
              onChange={(e) => set('monthlyRent', e.target.value)}
              aria-invalid={!!err('monthlyRent')}
            />
          </Field>
          <Field error={err('securityDeposit')} id="securityDeposit" label="Security deposit (₹)">
            <input
              id="securityDeposit"
              className="field"
              inputMode="numeric"
              value={f.securityDeposit}
              onChange={(e) => set('securityDeposit', e.target.value)}
            />
          </Field>
          <Field
            error={err('maintenanceCharges')}
            id="maintenanceCharges"
            label="Maintenance (₹/month)"
          >
            <input
              id="maintenanceCharges"
              className="field"
              inputMode="numeric"
              disabled={f.maintenanceIncluded}
              value={f.maintenanceCharges}
              onChange={(e) => set('maintenanceCharges', e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              checked={f.rentNegotiable}
              onChange={(e) => set('rentNegotiable', e.target.checked)}
            />
            Rent negotiable
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              checked={f.maintenanceIncluded}
              onChange={(e) => set('maintenanceIncluded', e.target.checked)}
            />
            Maintenance included in rent
          </label>
          <span />
          <Field error={err('lockInMonths')} id="lockInMonths" label="Lock-in (months)">
            <input
              id="lockInMonths"
              className="field"
              inputMode="numeric"
              value={f.lockInMonths}
              onChange={(e) => set('lockInMonths', e.target.value)}
            />
          </Field>
          <Field error={err('brokerage')} id="brokerage" label="Brokerage (public note)">
            <input
              id="brokerage"
              className="field"
              maxLength={120}
              value={f.brokerage}
              onChange={(e) => set('brokerage', e.target.value)}
              placeholder="e.g. One month’s rent"
            />
          </Field>
          <div className="md:col-span-3">
            <Field error={err('rentalTerms')} id="rentalTerms" label="Other rental terms (public)">
              <textarea
                id="rentalTerms"
                className="field"
                maxLength={2000}
                value={f.rentalTerms}
                onChange={(e) => set('rentalTerms', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Size and layout">
        <div className="grid gap-4 md:grid-cols-4">
          <Field error={err('areaValue')} id="areaValue" label="Area">
            <input
              id="areaValue"
              className="field"
              inputMode="decimal"
              value={f.areaValue}
              onChange={(e) => set('areaValue', e.target.value)}
              aria-invalid={!!err('areaValue')}
            />
          </Field>
          <Field error={err('areaUnit')} id="areaUnit" label="Unit">
            <select
              id="areaUnit"
              className="field"
              value={f.areaUnit}
              onChange={(e) => set('areaUnit', e.target.value as FormState['areaUnit'])}
            >
              {AREA_UNITS.map((u) => (
                <option key={u} value={u}>
                  {AREA_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </Field>
          <Field error={err('areaType')} id="areaType" label="Area type">
            <select
              id="areaType"
              className="field"
              value={f.areaType}
              onChange={(e) => set('areaType', e.target.value as FormState['areaType'])}
            >
              {AREA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field error={err('furnishingStatus')} id="furnishingStatus" label="Furnishing">
            <select
              id="furnishingStatus"
              className="field"
              value={f.furnishingStatus}
              onChange={(e) =>
                set('furnishingStatus', e.target.value as FormState['furnishingStatus'])
              }
            >
              {FURNISHING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {FURNISHING_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          {isResidential && (
            <>
              <Field
                error={err('bedrooms')}
                id="bedrooms"
                label={`Bedrooms${needsRooms ? ' *' : ''}`}
              >
                <input
                  id="bedrooms"
                  className="field"
                  inputMode="numeric"
                  value={f.bedrooms}
                  onChange={(e) => set('bedrooms', e.target.value)}
                  aria-invalid={!!err('bedrooms')}
                />
              </Field>
              <Field
                error={err('bathrooms')}
                id="bathrooms"
                label={`Bathrooms${needsRooms ? ' *' : ''}`}
              >
                <input
                  id="bathrooms"
                  className="field"
                  inputMode="numeric"
                  value={f.bathrooms}
                  onChange={(e) => set('bathrooms', e.target.value)}
                  aria-invalid={!!err('bathrooms')}
                />
              </Field>
              <Field error={err('balconies')} id="balconies" label="Balconies">
                <input
                  id="balconies"
                  className="field"
                  inputMode="numeric"
                  value={f.balconies}
                  onChange={(e) => set('balconies', e.target.value)}
                />
              </Field>
            </>
          )}
          {!isResidential && (
            <Field error={err('washrooms')} id="washrooms" label="Washrooms">
              <input
                id="washrooms"
                className="field"
                inputMode="numeric"
                value={f.washrooms}
                onChange={(e) => set('washrooms', e.target.value)}
              />
            </Field>
          )}
          <Field error={err('floorNumber')} id="floorNumber" label="Floor" hint="0 = ground">
            <input
              id="floorNumber"
              className="field"
              inputMode="numeric"
              value={f.floorNumber}
              onChange={(e) => set('floorNumber', e.target.value)}
              aria-invalid={!!err('floorNumber')}
            />
          </Field>
          <Field error={err('totalFloors')} id="totalFloors" label="Total floors">
            <input
              id="totalFloors"
              className="field"
              inputMode="numeric"
              value={f.totalFloors}
              onChange={(e) => set('totalFloors', e.target.value)}
            />
          </Field>
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
          <Field error={err('ageOfPropertyYears')} id="ageOfPropertyYears" label="Age (years)">
            <input
              id="ageOfPropertyYears"
              className="field"
              inputMode="numeric"
              value={f.ageOfPropertyYears}
              onChange={(e) => set('ageOfPropertyYears', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Features">
        <div className="grid gap-6 md:grid-cols-2">
          <Field error={err('parking')} id="parking" label="Parking">
            <select
              id="parking"
              className="field"
              value={f.parking}
              onChange={(e) => set('parking', e.target.value as FormState['parking'])}
            >
              {PARKING_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PARKING_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          {isResidential ? (
            <fieldset>
              <legend className="field-label">Preferred tenants</legend>
              <div className="flex flex-wrap gap-3">
                {PREFERRED_TENANTS.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm capitalize">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-brand)]"
                      checked={f.preferredTenants.includes(t)}
                      onChange={() => toggle('preferredTenants', t)}
                    />{' '}
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <Field
              error={err('suitableFor')}
              id="suitableFor"
              label="Suitable business use"
              hint="Comma separated, e.g. Retail, Café, Clinic"
            >
              <input
                id="suitableFor"
                className="field"
                value={f.suitableFor}
                onChange={(e) => set('suitableFor', e.target.value)}
              />
            </Field>
          )}
          <fieldset className="md:col-span-2">
            <legend className="field-label">Amenities</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-brand)]"
                    checked={f.amenities.includes(a)}
                    onChange={() => toggle('amenities', a)}
                  />{' '}
                  {AMENITY_LABELS[a]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      <Section title="Description">
        <div className="space-y-4">
          <Field
            error={err('description')}
            id="description"
            label="Description"
            hint="At least 30 characters. Plain text; line breaks are kept."
          >
            <textarea
              id="description"
              className="field min-h-48"
              maxLength={6000}
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              aria-invalid={!!err('description')}
            />
          </Field>
          <Field
            error={err('highlights')}
            id="highlights"
            label="Highlights"
            hint="One per line (max 12)."
          >
            <textarea
              id="highlights"
              className="field"
              value={f.highlights}
              onChange={(e) => set('highlights', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Preview">
        <p className="mb-4 text-sm text-ink-muted">
          How this listing will appear in search results.
          {property && !['published', 'rented'].includes(f.status)
            ? ' It is not public until published.'
            : ''}
        </p>
        <div className="max-w-sm">
          <PropertyCard
            p={{
              id: property?.id ?? 'preview',
              slug: f.slug || 'preview',
              title: f.title || 'Untitled property',
              category: f.category,
              propertyType: f.propertyType,
              status: f.status === 'rented' ? 'rented' : 'published',
              city: { slug: f.citySlug, name: city?.name ?? 'City' },
              locality: {
                slug: f.localitySlug,
                name: city?.localities.find((l) => l.slug === f.localitySlug)?.name ?? 'Locality',
              },
              monthlyRent: Number(num(f.monthlyRent) ?? 0),
              areaValue: Number(num(f.areaValue) ?? 0),
              areaUnit: f.areaUnit,
              bedrooms: num(f.bedrooms),
              bathrooms: num(f.bathrooms),
              furnishingStatus: f.furnishingStatus,
              coverImage: f.images[f.coverImageIndex] ?? f.images[0] ?? null,
              featured: f.featured,
              isDemo: property?.isDemo ?? false,
              availableFrom: f.availableFrom || null,
              publishedAt: null,
            }}
          />
        </div>
      </Section>

      <Section title={`Photos (${f.images.length})`}>
        <ImageManager
          images={f.images}
          cover={f.coverImageIndex}
          title={f.title}
          onChange={(images, cover) => {
            setF((s) => ({ ...s, images, coverImageIndex: cover }));
            setDirty(true);
          }}
        />
        {err('images') && <p className="field-error">{err('images')}</p>}
      </Section>

      <Section title="Search engine listing (optional)">
        <div className="grid gap-4">
          <Field
            error={err('slug')}
            id="slug"
            label="URL slug"
            hint={
              property
                ? 'Changing this keeps the old URL redirecting here.'
                : 'Leave empty to generate from the title.'
            }
          >
            <input
              id="slug"
              className="field"
              value={f.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
              aria-invalid={!!err('slug')}
            />
          </Field>
          <Field
            error={err('seoTitle')}
            id="seoTitle"
            label={`SEO title (${f.seoTitle.length}/70)`}
          >
            <input
              id="seoTitle"
              className="field"
              maxLength={70}
              value={f.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
            />
          </Field>
          <Field
            error={err('seoDescription')}
            id="seoDescription"
            label={`Meta description (${f.seoDescription.length}/170)`}
          >
            <textarea
              id="seoDescription"
              className="field min-h-20"
              maxLength={170}
              value={f.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Private (never shown publicly)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={err('ownerReference')} id="ownerReference" label="Owner / lead reference">
            <input
              id="ownerReference"
              className="field"
              maxLength={200}
              value={f.ownerReference}
              onChange={(e) => set('ownerReference', e.target.value)}
            />
          </Field>
          <Field error={err('internalNotes')} id="internalNotes" label="Internal notes">
            <textarea
              id="internalNotes"
              className="field"
              maxLength={4000}
              value={f.internalNotes}
              onChange={(e) => set('internalNotes', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-ink-muted">
            {f.monthlyRent && Number(f.monthlyRent) > 0
              ? formatRent(Number(f.monthlyRent))
              : 'No rent set'}{' '}
            · {dirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-outline" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {f.status !== 'published' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => save('published')}
              >
                Save &amp; publish
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
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
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
