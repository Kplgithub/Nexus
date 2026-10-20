import type { FilterQuery, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  propertyValidateMerged,
  slugify,
  toSqft,
  type AdminProperty,
  type PropertyCard,
  type PropertyCreate,
  type PropertySearch,
  type PropertyStatus,
  type PropertyUpdate,
  type PublicProperty,
  type PaginationMeta,
} from '@nexus/shared';
import type { z } from 'zod';
import type { adminPropertyQuerySchema } from '@nexus/shared';
import { Property, type PropertyAttrs } from '../models/property.model.js';
import { Enquiry, SlugRedirect } from '../models/misc.models.js';
import { conflict, notFound, validationError } from '../lib/errors.js';
import { escapeRegex, paginate } from '../lib/respond.js';
import { resolveLocation } from './location.service.js';
import { deleteImages } from './upload.service.js';

type Lean = PropertyAttrs & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

function cover(p: Lean) {
  const img = p.images[p.coverImageIndex] ?? p.images[0];
  return img
    ? {
        url: img.url,
        alt: img.alt || p.title,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        isDemo: img.isDemo ?? false,
      }
    : null;
}

export function toPublic(p: Lean): PublicProperty {
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.title,
    description: p.description,
    highlights: p.highlights ?? [],
    category: p.category as PublicProperty['category'],
    propertyType: p.propertyType as PublicProperty['propertyType'],
    status: p.status === 'rented' ? 'rented' : 'published',
    city: { slug: p.citySlug, name: p.cityName },
    locality: { slug: p.localitySlug, name: p.localityName },
    state: p.state ?? '',
    approvedAddress: p.approvedAddress ?? '',
    monthlyRent: p.monthlyRent,
    rentNegotiable: p.rentNegotiable ?? false,
    securityDeposit: p.securityDeposit ?? null,
    maintenanceCharges: p.maintenanceCharges ?? null,
    maintenanceIncluded: p.maintenanceIncluded ?? false,
    brokerage: p.brokerage ?? null,
    lockInMonths: p.lockInMonths ?? null,
    rentalTerms: p.rentalTerms ?? null,
    areaValue: p.areaValue,
    areaUnit: p.areaUnit as PublicProperty['areaUnit'],
    areaType: (p.areaType ?? 'carpet') as PublicProperty['areaType'],
    areaSqft: p.areaSqft,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    balconies: p.balconies ?? null,
    washrooms: p.washrooms ?? null,
    floorNumber: p.floorNumber ?? null,
    totalFloors: p.totalFloors ?? null,
    facing: p.facing ?? null,
    ageOfPropertyYears: p.ageOfPropertyYears ?? null,
    furnishingStatus: p.furnishingStatus as PublicProperty['furnishingStatus'],
    amenities: (p.amenities ?? []) as PublicProperty['amenities'],
    parking: (p.parking ?? 'none') as PublicProperty['parking'],
    preferredTenants: (p.preferredTenants ?? []) as PublicProperty['preferredTenants'],
    suitableFor: p.suitableFor ?? [],
    images: (p.images ?? []).map((i) => ({
      url: i.url,
      alt: i.alt || p.title,
      width: i.width ?? undefined,
      height: i.height ?? undefined,
      isDemo: i.isDemo ?? false,
    })),
    coverImage: cover(p),
    availableFrom: iso(p.availableFrom),
    featured: p.featured ?? false,
    isDemo: p.isDemo ?? false,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    publishedAt: iso(p.publishedAt),
    updatedAt: iso(p.updatedAt)!,
  };
}

export function toCard(p: Lean): PropertyCard {
  const full = toPublic(p);
  return {
    id: full.id,
    slug: full.slug,
    title: full.title,
    category: full.category,
    propertyType: full.propertyType,
    status: full.status,
    city: full.city,
    locality: full.locality,
    monthlyRent: full.monthlyRent,
    areaValue: full.areaValue,
    areaUnit: full.areaUnit,
    bedrooms: full.bedrooms,
    bathrooms: full.bathrooms,
    furnishingStatus: full.furnishingStatus,
    coverImage: full.coverImage,
    featured: full.featured,
    isDemo: full.isDemo,
    availableFrom: full.availableFrom,
    publishedAt: full.publishedAt,
  };
}

export function toAdmin(p: Lean): AdminProperty {
  return {
    ...toPublic(p),
    status: p.status as PropertyStatus,
    listingVisibility: (p.listingVisibility ?? 'public') as AdminProperty['listingVisibility'],
    citySlug: p.citySlug,
    localitySlug: p.localitySlug,
    pincode: p.pincode ?? null,
    images: (p.images ?? []).map((i) => ({
      url: i.url,
      publicId: i.publicId ?? undefined,
      alt: i.alt ?? '',
      width: i.width ?? undefined,
      height: i.height ?? undefined,
      isDemo: i.isDemo ?? false,
    })),
    coverImageIndex: p.coverImageIndex ?? 0,
    ownerReference: p.ownerReference ?? null,
    internalNotes: p.internalNotes ?? null,
    createdAt: iso(p.createdAt)!,
  };
}

/* ------------------------------------------------------------------ */
/* Public search                                                       */
/* ------------------------------------------------------------------ */

const CARD_FIELDS =
  'slug title category propertyType status citySlug cityName localitySlug localityName monthlyRent areaValue areaUnit areaSqft bedrooms bathrooms furnishingStatus images coverImageIndex featured isDemo availableFrom publishedAt updatedAt description';

export function buildPublicFilter(q: PropertySearch): FilterQuery<PropertyAttrs> {
  const f: FilterQuery<PropertyAttrs> = { status: 'published', listingVisibility: 'public' };
  if (q.category) f.category = q.category;
  if (q.propertyType?.length) f.propertyType = { $in: q.propertyType };
  if (q.city) f.citySlug = q.city;
  if (q.locality) f.localitySlug = q.locality;
  if (q.minRent !== undefined || q.maxRent !== undefined) {
    f.monthlyRent = {
      ...(q.minRent !== undefined ? { $gte: q.minRent } : {}),
      ...(q.maxRent !== undefined ? { $lte: q.maxRent } : {}),
    };
  }
  if (q.furnishing?.length) f.furnishingStatus = { $in: q.furnishing };
  // Bedrooms/bathrooms are minimums ("2+ BHK"), matching how renters search.
  if (q.bedrooms) f.bedrooms = { $gte: q.bedrooms };
  if (q.bathrooms) f.bathrooms = { $gte: q.bathrooms };
  if (q.minArea !== undefined || q.maxArea !== undefined) {
    f.areaSqft = {
      ...(q.minArea !== undefined ? { $gte: q.minArea } : {}),
      ...(q.maxArea !== undefined ? { $lte: q.maxArea } : {}),
    };
  }
  if (q.amenities?.length) f.amenities = { $all: q.amenities };
  if (q.parking) f.parking = { $nin: ['none', null] };
  if (q.availableNow) f.$or = [{ availableFrom: null }, { availableFrom: { $lte: new Date() } }];
  if (q.featured) f.featured = true;
  if (q.q) f.$text = { $search: q.q };
  return f;
}

const SORTS: Record<PropertySearch['sort'], Record<string, SortOrder>> = {
  newest: { publishedAt: -1, _id: -1 },
  rent_asc: { monthlyRent: 1, _id: 1 },
  rent_desc: { monthlyRent: -1, _id: -1 },
};

export async function searchPublic(
  q: PropertySearch,
): Promise<{ items: PropertyCard[]; meta: PaginationMeta }> {
  const filter = buildPublicFilter(q);
  const [rows, total] = await Promise.all([
    Property.find(filter)
      .select(CARD_FIELDS)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<Lean[]>(),
    Property.countDocuments(filter),
  ]);
  return { items: rows.map(toCard), meta: paginate(q.page, q.limit, total) };
}

export type PublicDetailResult =
  | { kind: 'found'; property: PublicProperty; similar: PropertyCard[] }
  | { kind: 'redirect'; slug: string };

export async function getPublicBySlug(slug: string): Promise<PublicDetailResult> {
  const p = await Property.findOne({ slug, status: { $in: ['published', 'rented'] } }).lean<Lean>();
  if (p) {
    return { kind: 'found', property: toPublic(p), similar: await findSimilar(p) };
  }
  const redirect = await SlugRedirect.findOne({ fromSlug: slug }).lean();
  if (redirect) {
    const target = await Property.findOne({
      _id: redirect.property,
      status: { $in: ['published', 'rented'] },
    })
      .select('slug')
      .lean();
    if (target) return { kind: 'redirect', slug: target.slug };
  }
  throw notFound('Property not found');
}

async function findSimilar(p: Lean, limit = 4): Promise<PropertyCard[]> {
  const base: FilterQuery<PropertyAttrs> = {
    _id: { $ne: p._id },
    status: 'published',
    listingVisibility: 'public',
    category: p.category,
    citySlug: p.citySlug,
  };
  const close = await Property.find({
    ...base,
    monthlyRent: { $gte: Math.round(p.monthlyRent * 0.6), $lte: Math.round(p.monthlyRent * 1.4) },
  })
    .select(CARD_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit * 3)
    .lean<Lean[]>();
  // Prefer listings in the same locality, then the rest of the city.
  close.sort(
    (a, b) => Number(b.localitySlug === p.localitySlug) - Number(a.localitySlug === p.localitySlug),
  );
  close.splice(limit);
  if (close.length >= limit) return close.map(toCard);
  const more = await Property.find({ ...base, _id: { $nin: [p._id, ...close.map((c) => c._id)] } })
    .select(CARD_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit - close.length)
    .lean<Lean[]>();
  return [...close, ...more].map(toCard);
}

export async function listHomeSections() {
  const visible = { status: 'published', listingVisibility: 'public' } as const;
  const [featured, recent] = await Promise.all([
    Property.find({ ...visible, featured: true })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean<Lean[]>(),
    Property.find(visible).select(CARD_FIELDS).sort({ publishedAt: -1 }).limit(6).lean<Lean[]>(),
  ]);
  return { featured: featured.map(toCard), recent: recent.map(toCard) };
}

/** Lightweight list for the XML sitemap. */
export async function sitemapEntries() {
  // Demo listings are noindex, so they stay out of the sitemap too.
  const rows = await Property.find({
    status: 'published',
    listingVisibility: 'public',
    isDemo: { $ne: true },
  })
    .select('slug updatedAt')
    .sort({ updatedAt: -1 })
    .limit(45_000)
    .lean();
  return rows.map((r) => ({ slug: r.slug, updatedAt: iso(r.updatedAt as Date)! }));
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function uniqueSlug(
  base: string,
  excludeId?: Types.ObjectId | string,
): Promise<string> {
  const root = slugify(base) || 'property';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const exists = await Property.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    const redirected = await SlugRedirect.exists({ fromSlug: candidate });
    if (!exists && !redirected) return candidate;
  }
  return `${root}-${new Types.ObjectId().toString().slice(-6)}`;
}

export async function listAdmin(q: z.output<typeof adminPropertyQuerySchema>) {
  const f: FilterQuery<PropertyAttrs> = {};
  if (q.status) f.status = q.status;
  if (q.category) f.category = q.category;
  if (q.city) f.citySlug = q.city;
  if (q.featured) f.featured = true;
  if (q.demo) f.isDemo = true;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.$or = [{ title: rx }, { slug: rx }, { localityName: rx }, { ownerReference: rx }];
  }
  const [rows, total] = await Promise.all([
    Property.find(f)
      .sort({ updatedAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<Lean[]>(),
    Property.countDocuments(f),
  ]);
  const ids = rows.map((r) => r._id);
  const counts = await Enquiry.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { property: { $in: ids } } },
    { $group: { _id: '$property', n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    items: rows.map((r) => ({ ...toAdmin(r), enquiryCount: byId.get(String(r._id)) ?? 0 })),
    meta: paginate(q.page, q.limit, total),
  };
}

export async function getAdmin(id: string): Promise<AdminProperty> {
  const p = await Property.findById(id).lean<Lean>();
  if (!p) throw notFound('Property not found');
  return toAdmin(p);
}

export async function createProperty(
  input: PropertyCreate,
  adminId: string,
): Promise<AdminProperty> {
  const loc = await resolveLocation(input.citySlug, input.localitySlug);
  const slug = input.slug
    ? await ensureSlugFree(input.slug)
    : await uniqueSlug(`${input.title} ${loc.localityName}`);
  const doc = await Property.create({
    ...input,
    slug,
    cityName: loc.cityName,
    localityName: loc.localityName,
    state: input.state || loc.state,
    areaSqft: toSqft(input.areaValue, input.areaUnit),
    publishedAt: input.status === 'published' ? new Date() : null,
    rentedAt: input.status === 'rented' ? new Date() : null,
    createdBy: adminId,
    updatedBy: adminId,
  });
  return toAdmin(doc.toObject() as unknown as Lean);
}

async function ensureSlugFree(slug: string, excludeId?: Types.ObjectId | string) {
  const taken = await Property.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
  if (taken) throw conflict('That URL slug is already used by another property');
  const redirect = await SlugRedirect.findOne({ fromSlug: slug }).lean();
  if (redirect && String(redirect.property) !== String(excludeId)) {
    throw conflict('That URL slug was used by another property and still redirects to it');
  }
  return slug;
}

export async function updateProperty(
  id: string,
  patch: PropertyUpdate,
  adminId: string,
): Promise<AdminProperty> {
  const doc = await Property.findById(id);
  if (!doc) throw notFound('Property not found');

  const current = doc.toObject() as unknown as Lean;
  const merged = { ...current, ...patch };
  // Re-check cross-field rules against the merged document (nulls = "not set").
  const check = propertyValidateMerged(
    stripNulls(JSON.parse(JSON.stringify(merged))) as Parameters<typeof propertyValidateMerged>[0],
  );
  if (!check.success) throw validationError(check.error);

  const set: Record<string, unknown> = { ...patch, updatedBy: adminId };

  if (patch.citySlug || patch.localitySlug) {
    const loc = await resolveLocation(merged.citySlug, merged.localitySlug);
    Object.assign(set, { cityName: loc.cityName, localityName: loc.localityName });
  }
  if (patch.areaValue !== undefined || patch.areaUnit !== undefined) {
    set.areaSqft = toSqft(merged.areaValue, merged.areaUnit as PropertyCreate['areaUnit']);
  }
  if (patch.status) Object.assign(set, statusSideEffects(current, patch.status));

  const oldSlug = current.slug;
  if (patch.slug && patch.slug !== oldSlug) {
    await ensureSlugFree(patch.slug, doc._id);
    await SlugRedirect.deleteOne({ fromSlug: patch.slug });
    await SlugRedirect.updateOne(
      { fromSlug: oldSlug },
      { $set: { fromSlug: oldSlug, property: doc._id } },
      { upsert: true },
    );
  }

  // Remove images that were dropped from the gallery.
  if (patch.images) {
    const keep = new Set(patch.images.map((i) => i.publicId).filter(Boolean));
    const removed = current.images
      .map((i) => i.publicId)
      .filter((p): p is string => !!p && !keep.has(p));
    if (removed.length) void deleteImages(removed);
  }

  doc.set(set);
  await doc.save();
  return toAdmin(doc.toObject() as unknown as Lean);
}

function statusSideEffects(current: Lean, next: PropertyStatus) {
  const out: Record<string, unknown> = { status: next };
  if (next === 'published' && !current.publishedAt) out.publishedAt = new Date();
  if (next === 'rented') out.rentedAt = new Date();
  if (next === 'archived' || next === 'inactive') out.featured = false;
  return out;
}

export async function changeStatus(id: string, status: PropertyStatus, adminId: string) {
  return updateProperty(id, { status }, adminId);
}

export async function deleteProperty(id: string) {
  const doc = await Property.findById(id);
  if (!doc) throw notFound('Property not found');
  const publicIds = doc.images.map((i) => i.publicId).filter((p): p is string => !!p);
  await SlugRedirect.deleteMany({ property: doc._id });
  await doc.deleteOne();
  if (publicIds.length) void deleteImages(publicIds);
  return { id, title: doc.title };
}

function stripNulls<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null)) as Partial<T>;
}
