import {
  propertySearchSchema,
  type Category,
  type ListingType,
  type PropertySearch,
} from '@nexus/shared';

export type RawSearchParams = Record<string, string | string[] | undefined>;

const KEYS = [
  'listingType',
  'category',
  'propertyType',
  'city',
  'locality',
  'minPrice',
  'maxPrice',
  'furnishing',
  'bedrooms',
  'bathrooms',
  'minArea',
  'maxArea',
  'amenities',
  'parking',
  'availableNow',
  'possession',
  'postedBy',
  'verified',
  'withPhotos',
  'rera',
  'plotApproval',
  'pgGender',
  'pgFood',
  'postedWithin',
  'project',
  'q',
  'sort',
  'page',
] as const;

/** Validate raw URL params with the same schema the API uses. Invalid values are dropped. */
export function parseSearch(
  raw: RawSearchParams,
  forced?: { listingType?: ListingType; category?: Category; city?: string; locality?: string },
): PropertySearch {
  const input: Record<string, unknown> = {};
  for (const k of KEYS) {
    const v = raw[k];
    if (v === undefined) continue;
    input[k] = Array.isArray(v)
      ? k === 'propertyType' || k === 'furnishing' || k === 'amenities' || k === 'plotApproval'
        ? v.join(',')
        : v[0]
      : v;
  }
  if (forced?.listingType) input.listingType = forced.listingType;
  if (forced?.category) input.category = forced.category;
  if (forced?.city) input.city = forced.city;
  if (forced?.locality) input.locality = forced.locality;
  return propertySearchSchema.parse(input);
}

/**
 * Serialise a search to a clean, stable query string (defaults omitted, keys in a
 * fixed order) so equivalent searches share one URL.
 */
export function toQueryString(
  s: Partial<PropertySearch>,
  omit: (keyof PropertySearch)[] = [],
): string {
  const qs = new URLSearchParams();
  const put = (k: keyof PropertySearch, v: unknown) => {
    if (omit.includes(k) || v === undefined || v === null || v === '' || v === false) return;
    if (Array.isArray(v)) {
      if (v.length) qs.set(k, v.join(','));
      return;
    }
    qs.set(k, String(v));
  };
  put('listingType', s.listingType);
  put('category', s.category);
  put('propertyType', s.propertyType);
  put('city', s.city);
  put('locality', s.locality);
  put('minPrice', s.minPrice);
  put('maxPrice', s.maxPrice);
  put('furnishing', s.furnishing);
  put('bedrooms', s.bedrooms);
  put('bathrooms', s.bathrooms);
  put('minArea', s.minArea);
  put('maxArea', s.maxArea);
  put('amenities', s.amenities);
  put('parking', s.parking);
  put('availableNow', s.availableNow);
  put('possession', s.possession);
  put('postedBy', s.postedBy);
  put('verified', s.verified);
  put('withPhotos', s.withPhotos);
  put('rera', s.rera);
  put('plotApproval', s.plotApproval);
  put('pgGender', s.pgGender);
  put('pgFood', s.pgFood);
  put('postedWithin', s.postedWithin);
  put('project', s.project);
  put('q', s.q);
  if (s.sort && s.sort !== 'newest') put('sort', s.sort);
  if (s.page && s.page > 1) put('page', s.page);
  return qs.toString();
}

/** API query string: same as the URL one plus limit. */
export function toApiQuery(s: PropertySearch, limit = 12): string {
  const qs = new URLSearchParams(toQueryString(s));
  qs.set('limit', String(limit));
  if (s.page > 1) qs.set('page', String(s.page));
  return qs.toString();
}

/** True when the visitor applied anything beyond the page's own fixed scope. */
export function hasUserFilters(raw: RawSearchParams): boolean {
  if (raw.view === 'map') return true;
  return Object.keys(raw).some(
    (k) => (KEYS as readonly string[]).includes(k) && raw[k] !== undefined && raw[k] !== '',
  );
}
