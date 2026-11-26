'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AMENITIES,
  AMENITY_LABELS,
  AREA_TYPES,
  AREA_UNITS,
  AREA_UNIT_LABELS,
  FURNISHING_LABELS,
  FURNISHING_STATUSES,
  OWNERSHIP_LABELS,
  PG_GENDERS,
  PG_GENDER_LABELS,
  PG_SHARING,
  PG_SHARING_LABELS,
  PLOT_APPROVALS,
  PLOT_APPROVAL_LABELS,
  FARM_ELECTRICITY,
  FARM_ELECTRICITY_LABELS,
  FARM_FEATURES,
  FARM_FEATURE_LABELS,
  FARM_LAND_USES,
  FARM_LAND_USE_LABELS,
  FARM_WATER_SOURCES,
  FARM_WATER_SOURCE_LABELS,
  LAND_AREA_UNITS,
  isFarmType,
  pricePerLandUnit,
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
  type GeoPointValue,
  type ListingType,
  type OwnListing,
  type PropertyImage,
  type PgGender,
  type PgSharing,
  type PlotApproval,
  type FarmElectricity,
  type FarmFeature,
  type FarmLandUse,
  type FarmWaterSource,
  type PropertyType,
  coverFirst,
} from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { PinPicker } from '../map/Map';
import { ImageManager } from '../admin/ImageManager';
import { PropertyCard } from '../property/PropertyCard';
import { BuildingIcon, CheckIcon, HomeIcon, KeyIcon } from '../icons';
import { useSections } from '../session/SectionsProvider';

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
  location: GeoPointValue | null;
  videoUrl: string;
  projectId: string;
  plotApproval: PlotApproval | '';
  cornerPlot: boolean;
  roadWidthFt: string;
  openSides: string;
  boundaryWall: boolean;
  farmLandUse: FarmLandUse | '';
  farmWaterSource: FarmWaterSource | '';
  farmElectricity: FarmElectricity | '';
  farmFeatures: FarmFeature[];
  farmhouseAreaSqft: string;
  pgSharing: PgSharing[];
  pgGender: PgGender | '';
  pgFoodIncluded: boolean;
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
    // The first photo is the cover; older records may point at another one.
    images: coverFirst(p?.images ?? [], p?.coverImageIndex),
    coverImageIndex: 0,
    location: p?.location ?? null,
    videoUrl: p?.videoUrl ?? '',
    projectId: p?.projectId ?? '',
    plotApproval: p?.plotApproval ?? '',
    cornerPlot: p?.cornerPlot ?? false,
    roadWidthFt: str(p?.roadWidthFt),
    openSides: str(p?.openSides),
    boundaryWall: p?.boundaryWall ?? false,
    farmLandUse: p?.farmLandUse ?? '',
    farmWaterSource: p?.farmWaterSource ?? '',
    farmElectricity: p?.farmElectricity ?? '',
    farmFeatures: p?.farmFeatures ?? [],
    farmhouseAreaSqft: str(p?.farmhouseAreaSqft),
    pgSharing: p?.pgSharing ?? [],
    pgGender: p?.pgGender ?? '',
    pgFoodIncluded: p?.pgFoodIncluded ?? false,
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
  const plot = f.propertyType === 'plot';
  const farm = isFarmType(f.propertyType);
  const land = plot || farm;
  const pg = f.propertyType === 'pg';
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
    possessionStatus: sale && !farm ? f.possessionStatus || null : null,
    possessionDate:
      sale && !farm && f.possessionStatus === 'under-construction'
        ? f.possessionDate || null
        : null,
    transactionType: sale ? f.transactionType || null : null,
    ownershipType: sale ? f.ownershipType || null : null,
    reraId: sale && !farm ? opt(f.reraId) : undefined,
    areaValue: num(f.areaValue) ?? 0,
    areaUnit: f.areaUnit,
    areaType: farm ? 'plot' : f.areaType,
    bedrooms: residential && !land ? num(f.bedrooms) : null,
    bathrooms: residential && !land ? num(f.bathrooms) : null,
    balconies: residential && !land ? num(f.balconies) : null,
    washrooms: residential ? null : num(f.washrooms),
    floorNumber: land ? null : num(f.floorNumber),
    totalFloors: land ? null : num(f.totalFloors),
    facing: opt(f.facing),
    ageOfPropertyYears: land ? null : num(f.ageOfPropertyYears),
    furnishingStatus: land ? 'unfurnished' : f.furnishingStatus,
    amenities: farm ? [] : f.amenities,
    parking: farm ? 'none' : f.parking,
    suitableFor: residential ? [] : lines(f.suitableFor, ','),
    images: f.images,
    coverImageIndex: f.coverImageIndex,
    location: f.location,
    videoUrl: f.videoUrl.trim(),
    projectId: f.projectId || null,
    plotApproval: plot ? f.plotApproval || null : null,
    cornerPlot: plot ? f.cornerPlot : false,
    roadWidthFt: land ? num(f.roadWidthFt) : null,
    openSides: land ? num(f.openSides) : null,
    boundaryWall: land ? f.boundaryWall : false,
    farmLandUse: farm ? f.farmLandUse || null : null,
    farmWaterSource: farm ? f.farmWaterSource || null : null,
    farmElectricity: farm ? f.farmElectricity || null : null,
    farmFeatures: farm ? f.farmFeatures : [],
    farmhouseAreaSqft: f.propertyType === 'farmhouse' ? num(f.farmhouseAreaSqft) : null,
    pgSharing: pg ? f.pgSharing : [],
    pgGender: pg ? f.pgGender || null : null,
    pgFoodIncluded: pg ? f.pgFoodIncluded : false,
  };
}

export function adminPayload(f: ListingFormState, statusOverride?: string) {
  return {
    ...userPayload(f),
    // Admins may list at ₹0 ("Free"), so a blank price must stay blank rather than become 0.
    price: num(f.price),
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
  projectId: 'location',
  location: 'location',
  videoUrl: 'photos',
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
  clearError,
  cities,
  step,
  uploadPath,
  showBusinessHints,
  allowFree,
  farmsAllowed = true,
}: {
  f: ListingFormState;
  setF: (fn: (s: ListingFormState) => ListingFormState) => void;
  errors: Errors;
  clearError?: (key: string) => void;
  cities: City[];
  step?: StepId;
  uploadPath: string;
  showBusinessHints?: boolean;
  /** Admin only: ₹0 is allowed and shown as "Free". */
  allowFree?: boolean;
  /** Admin can switch new farm listings off; an existing farm listing stays editable. */
  farmsAllowed?: boolean;
}) {
  const set = <K extends keyof ListingFormState>(k: K, v: ListingFormState[K]) => {
    clearError?.(k);
    setF((s) => ({ ...s, [k]: v }));
  };
  const toggle = (k: 'amenities' | 'preferredTenants' | 'pgSharing' | 'farmFeatures', v: string) => {
    clearError?.(k);
    setF((s) => ({
      ...s,
      [k]: (s[k] as string[]).includes(v)
        ? (s[k] as string[]).filter((x) => x !== v)
        : [...s[k], v],
    }));
  };
  const err = (k: string) => errors[k]?.[0];
  const show = (id: StepId) => !step || step === id;

  const city = cities.find((c) => c.slug === f.citySlug);
  const sale = f.listingType === 'sale';
  const residential = f.category === 'residential';
  const isFarm = isFarmType(f.propertyType);
  // Plots and farms are land: no rooms, floors or furnishing.
  const isPlot = f.propertyType === 'plot' || isFarm;
  const isPg = f.propertyType === 'pg';
  /** Pick a property type, adjusting the deal and units farms need. */
  const pickType = (t: PropertyType) =>
    setF((s) =>
      isFarmType(t)
        ? {
            ...s,
            propertyType: t,
            listingType: 'sale',
            areaUnit: (LAND_AREA_UNITS as readonly string[]).includes(s.areaUnit)
              ? s.areaUnit
              : 'bigha',
            areaType: 'plot',
            furnishingStatus: 'unfurnished',
          }
        : {
            ...s,
            propertyType: t,
            areaUnit: (LAND_AREA_UNITS as readonly string[]).includes(s.areaUnit)
              ? 'sqft'
              : s.areaUnit,
          },
    );
  const needsRooms = TYPES_REQUIRING_ROOMS.includes(f.propertyType);
  const locality = city?.localities.find((l) => l.slug === f.localitySlug);
  const projects = useProjectOptions(f.citySlug);
  const priceNum = num(f.price);
  const areaNum = num(f.areaValue);
  const perLand =
    sale && priceNum && areaNum ? pricePerLandUnit(priceNum, areaNum, f.areaUnit) : null;
  const perSqft =
    sale && priceNum && areaNum && !perLand
      ? Math.round(priceNum / toSqft(areaNum, f.areaUnit))
      : null;

  // Switched-off site sections (Admin → Settings → Site sections) can't take new listings.
  const on = useSections();
  const dealOn = (t: ListingType) => (t === 'sale' ? on.buy : on.rent) || on.commercial;
  const categoryOn = (c: 'residential' | 'commercial', t: ListingType = f.listingType) =>
    c === 'commercial' ? on.commercial : t === 'sale' ? on.buy : on.rent;
  const typeOn = (t: string) => (t !== 'pg' || on.pg) && (t !== 'plot' || on.plot);
  const isNew = !f.title;
  useEffect(() => {
    if (!isNew) return;
    const deal = dealOn(f.listingType) ? f.listingType : (['sale', 'rent'] as const).find(dealOn);
    if (!deal) return;
    const category = categoryOn(f.category, deal)
      ? f.category
      : (['residential', 'commercial'] as const).find((c) => categoryOn(c, deal));
    if (!category) return;
    const type =
      category === f.category && typeOn(f.propertyType)
        ? f.propertyType
        : (PROPERTY_TYPES[category].find((t) => typeOn(t) && !(t === 'pg' && deal === 'sale')) as
            | PropertyType
            | undefined);
    if (!type) return;
    if (deal !== f.listingType || category !== f.category || type !== f.propertyType)
      setF((s) => ({ ...s, listingType: deal, category, propertyType: type }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, on, f.listingType, f.category, f.propertyType]);

  return (
    <div className="space-y-6">
      {show('basics') && (
        <Group title="What are you listing?" bare={!!step}>
          <fieldset>
            <legend className="field-label">I want to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['sale', 'rent'] as const)
                .filter((t) => dealOn(t) || f.listingType === t)
                .map((t) => (
                  <Choice
                    key={t}
                    name="listingType"
                    checked={f.listingType === t}
                    onChange={() => set('listingType', t)}
                    title={t === 'sale' ? 'Sell' : 'Rent out'}
                    text={
                      t === 'sale'
                        ? 'Find a buyer'
                        : isFarm
                          ? 'Not available for farms'
                          : 'Find a tenant'
                    }
                    Icon={t === 'sale' ? HomeIcon : KeyIcon}
                    disabled={t === 'rent' && isFarm}
                  />
                ))}
            </div>
            {err('listingType') && <p className="field-error">{err('listingType')}</p>}
          </fieldset>
          <fieldset className="mt-6">
            <legend className="field-label">Property category</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['residential', 'commercial'] as const)
                .filter((c) => categoryOn(c) || f.category === c)
                .map((c) => (
                  <Choice
                    key={c}
                    name="category"
                    checked={f.category === c}
                    onChange={() =>
                      setF((s) => ({
                        ...s,
                        category: c,
                        propertyType: (PROPERTY_TYPES[c].find(
                          (t) => typeOn(t) && (!isFarmType(t) || farmsAllowed),
                        ) ?? PROPERTY_TYPES[c][0]) as PropertyType,
                      }))
                    }
                    Icon={c === 'residential' ? HomeIcon : BuildingIcon}
                    title={c === 'residential' ? 'Residential' : 'Commercial'}
                    text={
                      c === 'residential'
                        ? farmsAllowed
                          ? 'Flat, house, villa, plot, farm'
                          : 'Flat, house, villa, plot'
                        : 'Office, shop, showroom'
                    }
                  />
                ))}
            </div>
          </fieldset>
          <fieldset className="mt-6">
            <legend className="field-label">Property type</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES[f.category]
                .filter((t) => !(t === 'pg' && sale))
                .filter(
                  (t) => (typeOn(t) && (!isFarmType(t) || farmsAllowed)) || f.propertyType === t,
                )
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={f.propertyType === t}
                    onClick={() => pickType(t as PropertyType)}
                    className={`chip ${f.propertyType === t ? 'chip-active' : ''}`}
                  >
                    {PROPERTY_TYPE_LABELS[t as PropertyType]}
                  </button>
                ))}
            </div>
            {err('propertyType') && <p className="field-error">{err('propertyType')}</p>}
            {isFarm && (
              <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-ink-soft">
                Farms are listed for sale only. Land area is in bigha or acre.
              </p>
            )}
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
            {projects.length > 0 && (
              <Field
                error={err('projectId')}
                id="projectId"
                label="Part of a NEXUS project page? (optional)"
                hint="Links this listing to the project, so buyers see it there too."
              >
                <select
                  id="projectId"
                  className="field"
                  value={f.projectId}
                  onChange={(e) => {
                    const pr = projects.find((x) => x.id === e.target.value);
                    setF((s) => ({
                      ...s,
                      projectId: e.target.value,
                      projectName: pr ? pr.name : s.projectName,
                      localitySlug: pr ? pr.localitySlug : s.localitySlug,
                    }));
                  }}
                >
                  <option value="">Not linked</option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <fieldset className="mt-6">
            <legend className="field-label">Location on map (optional, recommended)</legend>
            <p className="field-hint mb-2 mt-0">
              Listings with a pin show up on map search. Put it on your street or building; we only
              show an approximate circle for owner listings.
            </p>
            <PinPicker
              value={f.location}
              onChange={(v) => set('location', v)}
              fallbackCenter={locality?.center ?? null}
            />
            {err('location') && <p className="field-error">{err('location')}</p>}
          </fieldset>
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
                  ? `${formatPrice(priceNum, f.listingType)}${perSqft ? ` · ${formatINR(perSqft)}/sq ft` : ''}${perLand ? ` · ${formatPrice(perLand.amount, 'sale')} per ${perLand.unit}` : ''}`
                  : allowFree && priceNum === 0
                    ? 'Shows as "Free" on the site'
                    : `${sale ? 'Total price in rupees, e.g. 6500000' : 'Rent per month in rupees'}${allowFree ? '. Enter 0 to show it as Free' : ''}`
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
              {!isFarm && (
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
              )}
              {!isFarm && f.possessionStatus === 'under-construction' && (
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
              {!isFarm && (
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
              )}
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
            <Field
              error={err('areaValue')}
              id="areaValue"
              label={isFarm ? 'Total land area' : 'Area'}
              hint={
                isFarm && areaNum && f.areaUnit === 'bigha'
                  ? `≈ ${Math.round(areaNum * 3025).toLocaleString('en-IN')} sq yd (1 pakka bigha = 3,025 sq yd)`
                  : undefined
              }
            >
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
                {(isFarm ? [...LAND_AREA_UNITS, 'sqyd' as const] : AREA_UNITS)
                  .filter((u) => isFarm || f.areaUnit === u || !isLandUnit(u))
                  .map((u) => (
                    <option key={u} value={u}>
                      {AREA_UNIT_LABELS[u]}
                    </option>
                  ))}
              </select>
            </Field>
            {!isFarm && (
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
            )}
            {f.propertyType === 'farmhouse' && (
              <Field
                error={err('farmhouseAreaSqft')}
                id="farmhouseAreaSqft"
                label="Farmhouse built-up (sq ft)"
                hint="The house on the land"
              >
                <input
                  id="farmhouseAreaSqft"
                  className="field tabular"
                  inputMode="numeric"
                  value={f.farmhouseAreaSqft}
                  onChange={(e) => set('farmhouseAreaSqft', e.target.value.replace(/[^\d]/g, ''))}
                />
              </Field>
            )}
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
            {!isFarm && (
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
            )}
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
          {isFarm && (
            <div className="mt-6 space-y-5">
              <ChipPick
                label="Land use"
                options={FARM_LAND_USES}
                labels={FARM_LAND_USE_LABELS}
                value={f.farmLandUse}
                onChange={(v) => set('farmLandUse', v)}
              />
              <ChipPick
                label="Water source"
                options={FARM_WATER_SOURCES}
                labels={FARM_WATER_SOURCE_LABELS}
                value={f.farmWaterSource}
                onChange={(v) => set('farmWaterSource', v)}
              />
              <ChipPick
                label="Electricity"
                options={FARM_ELECTRICITY}
                labels={FARM_ELECTRICITY_LABELS}
                value={f.farmElectricity}
                onChange={(v) => set('farmElectricity', v)}
              />
            </div>
          )}
          {isPlot && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {!isFarm && (
                <Field error={err('plotApproval')} id="plotApproval" label="Approved by">
                  <select
                    id="plotApproval"
                    className="field"
                    value={f.plotApproval}
                    onChange={(e) => set('plotApproval', e.target.value as PlotApproval | '')}
                  >
                    <option value="">Select</option>
                    {PLOT_APPROVALS.map((a) => (
                      <option key={a} value={a}>
                        {PLOT_APPROVAL_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                error={err('roadWidthFt')}
                id="roadWidthFt"
                label={isFarm ? 'Approach road (ft)' : 'Road in front (ft)'}
                hint="e.g. 30, 40, 60"
              >
                <input
                  id="roadWidthFt"
                  className="field tabular"
                  inputMode="numeric"
                  value={f.roadWidthFt}
                  onChange={(e) => set('roadWidthFt', e.target.value.replace(/[^\d]/g, ''))}
                />
              </Field>
              <Field error={err('openSides')} id="openSides" label="Open sides">
                <select
                  id="openSides"
                  className="field"
                  value={f.openSides}
                  onChange={(e) => set('openSides', e.target.value)}
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              {!isFarm && (
                <div className="flex flex-col justify-end">
                  <Check
                    checked={f.cornerPlot}
                    onChange={(v) => set('cornerPlot', v)}
                    label="Corner plot"
                  />
                  <Check
                    checked={f.boundaryWall}
                    onChange={(v) => set('boundaryWall', v)}
                    label="Boundary wall built"
                  />
                </div>
              )}
            </div>
          )}
          {isPg && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <fieldset className="md:col-span-3">
                <legend className="field-label">Room sharing offered</legend>
                <div className="flex flex-wrap gap-2">
                  {PG_SHARING.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={f.pgSharing.includes(t)}
                      onClick={() => toggle('pgSharing', t)}
                      className={`chip ${f.pgSharing.includes(t) ? 'chip-active' : ''}`}
                    >
                      {PG_SHARING_LABELS[t]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field error={err('pgGender')} id="pgGender" label="For">
                <select
                  id="pgGender"
                  className="field"
                  value={f.pgGender}
                  onChange={(e) => set('pgGender', e.target.value as PgGender | '')}
                >
                  <option value="">Select</option>
                  {PG_GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {PG_GENDER_LABELS[g]}
                    </option>
                  ))}
                </select>
              </Field>
              <Check
                checked={f.pgFoodIncluded}
                onChange={(v) => set('pgFoodIncluded', v)}
                label="Meals included"
              />
            </div>
          )}
          {isFarm ? (
            <fieldset className="mt-6">
              <legend className="field-label">Also has</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={f.boundaryWall}
                  onClick={() => set('boundaryWall', !f.boundaryWall)}
                  className={`chip ${f.boundaryWall ? 'chip-active' : ''}`}
                >
                  {f.boundaryWall && <CheckIcon size={14} />} Boundary wall
                </button>
                {FARM_FEATURES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={f.farmFeatures.includes(a)}
                    onClick={() => toggle('farmFeatures', a)}
                    className={`chip ${f.farmFeatures.includes(a) ? 'chip-active' : ''}`}
                  >
                    {f.farmFeatures.includes(a) && <CheckIcon size={14} />} {FARM_FEATURE_LABELS[a]}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
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
          )}
        </Group>
      )}

      {show('photos') && (
        <Group title="Photos and description" bare={!!step}>
          <ImageManager
            images={f.images}
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
            <Field
              error={err('videoUrl')}
              id="videoUrl"
              label="Video tour (optional)"
              hint="A YouTube link, e.g. https://youtu.be/… Upload the walkthrough to YouTube first."
            >
              <input
                id="videoUrl"
                className="field"
                type="url"
                inputMode="url"
                maxLength={200}
                value={f.videoUrl}
                onChange={(e) => set('videoUrl', e.target.value)}
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
      coverImage: f.images[0] ?? null,
      featured: f.featured,
      verified: f.verified,
      isDemo: isDemo ?? false,
      availableFrom: f.availableFrom || null,
      publishedAt: null,
      posterType: 'owner' as const,
      imageCount: f.images.length,
      areaSqft: num(f.areaValue) ? Math.round(toSqft(num(f.areaValue)!, f.areaUnit)) : 0,
      location: f.location,
      plotApproval: f.propertyType === 'plot' ? f.plotApproval || null : null,
      farmLandUse: isFarmType(f.propertyType) ? f.farmLandUse || null : null,
      farmWaterSource: isFarmType(f.propertyType) ? f.farmWaterSource || null : null,
      farmhouseAreaSqft: f.propertyType === 'farmhouse' ? num(f.farmhouseAreaSqft) : null,
      pgGender: f.propertyType === 'pg' ? f.pgGender || null : null,
      partnerBadge: false,
      refreshedAt: null,
    }),
    [f, city, id, isDemo],
  );
  return <PropertyCard p={card} preview />;
}

type ProjectOption = { id: string; name: string; slug: string; localitySlug: string };

/** Live projects in the chosen city, for the "part of a project" picker. */
function useProjectOptions(citySlug: string) {
  // Keyed by city so a stale list never shows after the city changes.
  const [state, setState] = useState<{ city: string; items: ProjectOption[] }>({
    city: '',
    items: [],
  });
  useEffect(() => {
    if (!citySlug) return;
    const ctl = new AbortController();
    apiFetch<ProjectOption[]>(`/projects/options?city=${encodeURIComponent(citySlug)}`, {
      signal: ctl.signal,
    })
      .then(({ data }) => setState({ city: citySlug, items: data }))
      .catch(() => setState({ city: citySlug, items: [] }));
    return () => ctl.abort();
  }, [citySlug]);
  return citySlug && state.city === citySlug ? state.items : [];
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const isLandUnit = (u: string) => (LAND_AREA_UNITS as readonly string[]).includes(u);

/** One choice from a short list, shown as chips. Clicking the chosen chip clears it. */
function ChipPick<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | '';
  onChange: (v: T | '') => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? '' : o)}
            className={`chip ${value === o ? 'chip-active' : ''}`}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

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
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  text: string;
  Icon?: typeof HomeIcon;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${
        checked
          ? 'border-brand bg-brand-50 ring-1 ring-brand'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
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
