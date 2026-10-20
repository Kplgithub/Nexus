/**
 * Domain constants shared by the API and the web app.
 * Changing a value here is a data-model change: update seed data and run tests.
 */

export const CATEGORIES = ['residential', 'commercial', 'industrial'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Categories that are open to the public. Industrial is reserved for a future launch. */
export const ACTIVE_CATEGORIES: readonly Category[] = ['residential', 'commercial'];

export const PROPERTY_TYPES = {
  residential: [
    'apartment',
    'independent-house',
    'builder-floor',
    'villa',
    'studio',
    'pg',
  ],
  commercial: [
    'office',
    'shop',
    'showroom',
    'commercial-building',
    'coworking',
    'other-commercial',
  ],
  industrial: ['warehouse', 'factory-shed', 'industrial-land'],
} as const satisfies Record<Category, readonly string[]>;

export type PropertyType =
  | (typeof PROPERTY_TYPES.residential)[number]
  | (typeof PROPERTY_TYPES.commercial)[number]
  | (typeof PROPERTY_TYPES.industrial)[number];

export const ALL_PROPERTY_TYPES = [
  ...PROPERTY_TYPES.residential,
  ...PROPERTY_TYPES.commercial,
  ...PROPERTY_TYPES.industrial,
] as const;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment / Flat',
  'independent-house': 'Independent House',
  'builder-floor': 'Builder Floor',
  villa: 'Villa / Bungalow',
  studio: 'Studio Apartment',
  pg: 'PG / Shared Accommodation',
  office: 'Office Space',
  shop: 'Retail Shop',
  showroom: 'Showroom',
  'commercial-building': 'Commercial Building',
  coworking: 'Co-working Space',
  'other-commercial': 'Other Commercial Unit',
  warehouse: 'Warehouse / Godown',
  'factory-shed': 'Factory / Shed',
  'industrial-land': 'Industrial Land',
};

/** Residential types where bedroom and bathroom counts are mandatory. */
export const TYPES_REQUIRING_ROOMS: readonly PropertyType[] = [
  'apartment',
  'independent-house',
  'builder-floor',
  'villa',
];

export const PROPERTY_STATUSES = ['draft', 'published', 'rented', 'inactive', 'archived'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const LISTING_VISIBILITY = ['public', 'unlisted'] as const;
export type ListingVisibility = (typeof LISTING_VISIBILITY)[number];

export const FURNISHING_STATUSES = ['unfurnished', 'semi-furnished', 'furnished'] as const;
export type FurnishingStatus = (typeof FURNISHING_STATUSES)[number];

export const FURNISHING_LABELS: Record<FurnishingStatus, string> = {
  unfurnished: 'Unfurnished',
  'semi-furnished': 'Semi-furnished',
  furnished: 'Fully furnished',
};

export const AREA_UNITS = ['sqft', 'sqyd', 'sqm'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sqft: 'sq ft',
  sqyd: 'sq yd',
  sqm: 'sq m',
};

/** Conversion factors to square feet, used to normalise area for filtering. */
export const AREA_TO_SQFT: Record<AreaUnit, number> = {
  sqft: 1,
  sqyd: 9,
  sqm: 10.7639,
};

export const AREA_TYPES = ['carpet', 'built-up', 'super-built-up', 'plot'] as const;
export type AreaType = (typeof AREA_TYPES)[number];

export const PARKING_OPTIONS = ['none', 'bike', 'car', 'car-and-bike', 'covered', 'open'] as const;
export type ParkingOption = (typeof PARKING_OPTIONS)[number];

export const PARKING_LABELS: Record<ParkingOption, string> = {
  none: 'No parking',
  bike: 'Two-wheeler parking',
  car: 'Car parking',
  'car-and-bike': 'Car and two-wheeler parking',
  covered: 'Covered parking',
  open: 'Open parking',
};

export const AMENITIES = [
  'lift',
  'power-backup',
  'security',
  'cctv',
  'gated-community',
  'water-supply-24x7',
  'gas-pipeline',
  'air-conditioning',
  'modular-kitchen',
  'wifi',
  'gym',
  'swimming-pool',
  'clubhouse',
  'park',
  'visitor-parking',
  'fire-safety',
  'conference-room',
  'pantry',
  'private-washroom',
  'reception',
  'servant-room',
  'pet-friendly',
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const AMENITY_LABELS: Record<Amenity, string> = {
  lift: 'Lift',
  'power-backup': 'Power backup',
  security: 'Security guard',
  cctv: 'CCTV',
  'gated-community': 'Gated community',
  'water-supply-24x7': '24×7 water supply',
  'gas-pipeline': 'Piped gas',
  'air-conditioning': 'Air conditioning',
  'modular-kitchen': 'Modular kitchen',
  wifi: 'Wi-Fi ready',
  gym: 'Gym',
  'swimming-pool': 'Swimming pool',
  clubhouse: 'Clubhouse',
  park: 'Park / garden',
  'visitor-parking': 'Visitor parking',
  'fire-safety': 'Fire safety',
  'conference-room': 'Conference room',
  pantry: 'Pantry',
  'private-washroom': 'Private washroom',
  reception: 'Reception area',
  'servant-room': 'Servant room',
  'pet-friendly': 'Pet friendly',
};

export const PREFERRED_TENANTS = ['any', 'family', 'bachelors', 'company', 'students'] as const;
export type PreferredTenant = (typeof PREFERRED_TENANTS)[number];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'closed', 'spam'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_TYPES = ['property', 'general', 'callback'] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const SUBMISSION_STATUSES = ['new', 'reviewing', 'converted', 'rejected', 'spam'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SORT_OPTIONS = ['newest', 'rent_asc', 'rent_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  rent_asc: 'Rent: low to high',
  rent_desc: 'Rent: high to low',
};

export const ADMIN_ROLES = ['owner', 'admin', 'editor'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PAGE_SIZE_DEFAULT = 12;
export const PAGE_SIZE_MAX = 48;

/** Upper bound on any rent/deposit figure (₹10 crore/month) — guards against typos. */
export const MAX_MONEY_INR = 100_000_000;

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_MAX_PER_PROPERTY = 30;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
