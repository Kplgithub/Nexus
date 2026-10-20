import { z } from 'zod';
import {
  ALL_PROPERTY_TYPES,
  AMENITIES,
  AREA_TYPES,
  AREA_UNITS,
  CATEGORIES,
  ENQUIRY_STATUSES,
  ENQUIRY_TYPES,
  FURNISHING_STATUSES,
  LISTING_VISIBILITY,
  MAX_MONEY_INR,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  PARKING_OPTIONS,
  PREFERRED_TENANTS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  SUBMISSION_STATUSES,
  TYPES_REQUIRING_ROOMS,
  type Category,
  type PropertyType,
} from './constants.js';
import { SLUG_PATTERN } from './slug.js';

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const money = z
  .number({ error: 'Must be a number' })
  .int('Use whole rupees')
  .min(0, 'Cannot be negative')
  .max(MAX_MONEY_INR, 'Amount looks too large');

const optionalMoney = money.nullable().optional();

const count = (max: number) => z.number().int().min(0).max(max);

const slug = z.string().trim().toLowerCase().max(100).regex(SLUG_PATTERN, 'Invalid slug');

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

/** Plain text only: strips angle brackets so stored content can never become markup. */
const plainText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((s) => s.replace(/[<>]/g, ''));

/* ------------------------------------------------------------------ */
/* Public search                                                       */
/* ------------------------------------------------------------------ */

/** Accepts "a,b" or repeated params; returns a de-duplicated array. */
const csvList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const parts = (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean);
      const allowed = parts.filter((p): p is T[number] =>
        (values as readonly string[]).includes(p),
      );
      return allowed.length ? Array.from(new Set(allowed)) : undefined;
    });

/** Lenient number parser for query strings: invalid input is dropped, not rejected. */
const queryNumber = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return undefined;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s₹]/g, ''));
      if (!Number.isFinite(n)) return undefined;
      return Math.min(Math.max(Math.round(n), min), max);
    });

const queryEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v && (values as readonly string[]).includes(v) ? (v as T[number]) : undefined,
    );

const queryBool = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => (v === true || v === 'true' || v === '1' ? true : undefined));

const querySlug = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const s = v.trim().toLowerCase();
    return SLUG_PATTERN.test(s) && s.length <= 100 ? s : undefined;
  });

/**
 * Public property search. Designed to be forgiving: unknown or invalid values
 * are discarded so a mangled shared URL still shows results instead of an error.
 */
export const propertySearchSchema = z
  .object({
    category: queryEnum(CATEGORIES as unknown as readonly [Category, ...Category[]]),
    propertyType: csvList(
      ALL_PROPERTY_TYPES as unknown as readonly [PropertyType, ...PropertyType[]],
    ),
    city: querySlug,
    locality: querySlug,
    minRent: queryNumber(0, MAX_MONEY_INR),
    maxRent: queryNumber(0, MAX_MONEY_INR),
    furnishing: csvList(FURNISHING_STATUSES),
    bedrooms: queryNumber(0, 10),
    bathrooms: queryNumber(0, 10),
    minArea: queryNumber(0, 10_000_000),
    maxArea: queryNumber(0, 10_000_000),
    amenities: csvList(AMENITIES),
    parking: queryBool,
    availableNow: queryBool,
    featured: queryBool,
    q: z
      .string()
      .optional()
      .transform((v) => (v ? v.trim().slice(0, 80) || undefined : undefined)),
    sort: queryEnum(SORT_OPTIONS).transform((v) => v ?? 'newest'),
    page: queryNumber(1, 1000).transform((v) => v ?? 1),
    limit: queryNumber(1, PAGE_SIZE_MAX).transform((v) => v ?? PAGE_SIZE_DEFAULT),
  })
  .transform((q) => {
    // Swap inverted ranges instead of returning nothing.
    if (q.minRent !== undefined && q.maxRent !== undefined && q.minRent > q.maxRent) {
      [q.minRent, q.maxRent] = [q.maxRent, q.minRent];
    }
    if (q.minArea !== undefined && q.maxArea !== undefined && q.minArea > q.maxArea) {
      [q.minArea, q.maxArea] = [q.maxArea, q.minArea];
    }
    // Locality only makes sense inside a city.
    if (q.locality && !q.city) q.locality = undefined;
    // Drop property types that don't belong to the chosen category.
    if (q.category && q.propertyType) {
      const allowed = PROPERTY_TYPES[q.category] as readonly string[];
      const kept = q.propertyType.filter((t) => allowed.includes(t));
      q.propertyType = kept.length ? kept : undefined;
    }
    return q;
  });

export type PropertySearch = z.output<typeof propertySearchSchema>;

/* ------------------------------------------------------------------ */
/* Property (admin)                                                    */
/* ------------------------------------------------------------------ */

/** HTTPS (Cloudinary/S3), local dev uploads, or site-relative paths used by demo content. */
const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      /^https:\/\/[^\s]+$/.test(v) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s]*$/.test(v) ||
      /^\/[a-z0-9/_.-]+$/i.test(v),
    'Image URL must be HTTPS',
  );

export const propertyImageSchema = z.object({
  url: imageUrl,
  publicId: z.string().max(300).optional(),
  alt: plainText(0, 160).default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  isDemo: z.boolean().optional(),
});

const propertyBase = z.object({
  title: plainText(8, 140),
  slug: slug.optional(),
  description: plainText(30, 6000),
  highlights: z.array(plainText(2, 140)).max(12).default([]),
  category: z.enum(CATEGORIES),
  propertyType: z.enum(ALL_PROPERTY_TYPES as unknown as readonly [PropertyType, ...PropertyType[]]),
  status: z.enum(PROPERTY_STATUSES).default('draft'),
  /** "unlisted" = reachable by direct link only; hidden from search, home and sitemap. */
  listingVisibility: z.enum(LISTING_VISIBILITY).default('public'),

  citySlug: slug,
  localitySlug: slug,
  state: plainText(2, 60).default('Rajasthan'),
  /** Public-safe address line (e.g. "Near Gandhi Path, Vaishali Nagar"). Never the exact unit. */
  approvedAddress: plainText(0, 200).default(''),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  monthlyRent: money.min(1, 'Rent is required'),
  rentNegotiable: z.boolean().default(false),
  securityDeposit: optionalMoney,
  maintenanceCharges: optionalMoney,
  maintenanceIncluded: z.boolean().default(false),
  brokerage: plainText(0, 120).optional(),
  lockInMonths: count(120).nullable().optional(),
  rentalTerms: plainText(0, 2000).optional(),

  areaValue: z.number().positive('Area must be positive').max(10_000_000),
  areaUnit: z.enum(AREA_UNITS),
  areaType: z.enum(AREA_TYPES).default('carpet'),

  bedrooms: count(20).nullable().optional(),
  bathrooms: count(20).nullable().optional(),
  balconies: count(20).nullable().optional(),
  floorNumber: z.number().int().min(-5).max(200).nullable().optional(),
  totalFloors: z.number().int().min(0).max(200).nullable().optional(),
  facing: plainText(0, 30).optional(),
  ageOfPropertyYears: count(200).nullable().optional(),

  furnishingStatus: z.enum(FURNISHING_STATUSES),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).default([]),
  parking: z.enum(PARKING_OPTIONS).default('none'),
  preferredTenants: z.array(z.enum(PREFERRED_TENANTS)).max(5).default([]),
  suitableFor: z.array(plainText(2, 60)).max(12).default([]),
  washrooms: count(50).nullable().optional(),

  images: z.array(propertyImageSchema).max(30).default([]),
  coverImageIndex: z.number().int().min(0).default(0),

  availableFrom: z.coerce.date().nullable().optional(),
  featured: z.boolean().default(false),
  isDemo: z.boolean().default(false),

  ownerReference: plainText(0, 200).optional(),
  internalNotes: plainText(0, 4000).optional(),

  seoTitle: plainText(0, 70).optional(),
  seoDescription: plainText(0, 170).optional(),
});

type PropertyBaseInput = z.infer<typeof propertyBase>;

function refineProperty(p: Partial<PropertyBaseInput>, ctx: z.RefinementCtx) {
  if (p.category && p.propertyType) {
    const allowed = PROPERTY_TYPES[p.category] as readonly string[];
    if (!allowed.includes(p.propertyType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['propertyType'],
        message: `"${p.propertyType}" is not a ${p.category} property type`,
      });
    }
  }
  if (p.propertyType && TYPES_REQUIRING_ROOMS.includes(p.propertyType)) {
    if (p.bedrooms === undefined || p.bedrooms === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['bedrooms'],
        message: 'Bedrooms are required for this property type',
      });
    }
    if (p.bathrooms === undefined || p.bathrooms === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['bathrooms'],
        message: 'Bathrooms are required for this property type',
      });
    }
  }
  if (
    p.floorNumber !== undefined &&
    p.floorNumber !== null &&
    p.totalFloors !== undefined &&
    p.totalFloors !== null &&
    p.floorNumber > p.totalFloors
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['floorNumber'],
      message: 'Floor cannot exceed total floors',
    });
  }
  if (
    p.images &&
    p.coverImageIndex !== undefined &&
    p.images.length > 0 &&
    p.coverImageIndex >= p.images.length
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['coverImageIndex'],
      message: 'Cover image must be one of the uploaded images',
    });
  }
  if (p.status === 'published' && p.images && p.images.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['images'],
      message: 'Add at least one photo before publishing',
    });
  }
}

export const propertyCreateSchema = propertyBase.superRefine(refineProperty);
export type PropertyCreateInput = z.input<typeof propertyCreateSchema>;
export type PropertyCreate = z.output<typeof propertyCreateSchema>;

/** Partial update; cross-field rules are re-checked by the service against the merged document. */
export const propertyUpdateSchema = propertyBase.partial().strict();
export type PropertyUpdate = z.output<typeof propertyUpdateSchema>;

export const propertyValidateMerged = (merged: Partial<PropertyBaseInput>) =>
  propertyBase.partial().superRefine(refineProperty).safeParse(merged);

export const propertyStatusChangeSchema = z.object({
  status: z.enum(PROPERTY_STATUSES),
});

export const adminPropertyQuerySchema = z.object({
  status: queryEnum(PROPERTY_STATUSES),
  category: queryEnum(CATEGORIES),
  city: querySlug,
  featured: queryBool,
  demo: queryBool,
  q: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().slice(0, 80) || undefined : undefined)),
  page: queryNumber(1, 10_000).transform((v) => v ?? 1),
  limit: queryNumber(1, 100).transform((v) => v ?? 20),
});

/* ------------------------------------------------------------------ */
/* Enquiries & submissions                                             */
/* ------------------------------------------------------------------ */

/** Honeypot: real users never see this field; any value marks the request as spam. */
const honeypot = z.string().max(200).optional();

export const enquiryCreateSchema = z.object({
  type: z.enum(ENQUIRY_TYPES).default('general'),
  name: plainText(2, 80),
  phone: z.string().trim().min(8).max(25),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  message: plainText(0, 2000).default(''),
  propertyId: objectIdSchema.optional(),
  sourcePage: z.string().trim().max(300).optional(),
  preferredContactTime: plainText(0, 60).optional(),
  consent: z.literal(true, { error: 'Please agree to be contacted' }),
  website: honeypot,
  /** Milliseconds the form was open; very fast submissions are treated as bots. */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});
export type EnquiryCreateInput = z.input<typeof enquiryCreateSchema>;

export const enquiryUpdateSchema = z
  .object({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    followUpAt: z.coerce.date().nullable().optional(),
    assignedTo: plainText(0, 80).optional(),
    note: plainText(1, 2000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const adminEnquiryQuerySchema = z.object({
  status: queryEnum(ENQUIRY_STATUSES),
  type: queryEnum(ENQUIRY_TYPES),
  propertyId: z
    .string()
    .optional()
    .transform((v) => (v && /^[a-f0-9]{24}$/i.test(v) ? v : undefined)),
  q: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().slice(0, 80) || undefined : undefined)),
  from: z.coerce.date().optional().catch(undefined),
  to: z.coerce.date().optional().catch(undefined),
  followUpDue: queryBool,
  page: queryNumber(1, 10_000).transform((v) => v ?? 1),
  limit: queryNumber(1, 100).transform((v) => v ?? 20),
});

export const propertySubmissionCreateSchema = z.object({
  ownerName: plainText(2, 80),
  phone: z.string().trim().min(8).max(25),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  relationship: z.enum(['owner', 'family', 'authorised-agent']).default('owner'),
  category: z.enum(CATEGORIES),
  propertyType: z.enum(ALL_PROPERTY_TYPES as unknown as readonly [PropertyType, ...PropertyType[]]),
  city: plainText(2, 60),
  locality: plainText(2, 80),
  expectedRent: money.optional(),
  areaValue: z.number().positive().max(10_000_000).optional(),
  areaUnit: z.enum(AREA_UNITS).default('sqft'),
  bedrooms: count(20).optional(),
  furnishingStatus: z.enum(FURNISHING_STATUSES).optional(),
  availableFrom: z.coerce.date().optional(),
  description: plainText(0, 3000).default(''),
  consent: z.literal(true, { error: 'Please agree to be contacted' }),
  website: honeypot,
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});
export type PropertySubmissionInput = z.input<typeof propertySubmissionCreateSchema>;

export const submissionUpdateSchema = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    note: plainText(1, 2000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

export const passwordPolicy = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200)
  .refine(
    (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v),
    'Use upper- and lower-case letters and a number',
  );

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordPolicy,
});

/* ------------------------------------------------------------------ */
/* Locations, FAQs, settings                                           */
/* ------------------------------------------------------------------ */

export const localitySchema = z.object({
  name: plainText(2, 80),
  slug: slug.optional(),
  active: z.boolean().default(true),
  /** Unique copy for the locality landing page. Pages without it are not indexed. */
  intro: plainText(0, 3000).default(''),
  seoTitle: plainText(0, 70).optional(),
  seoDescription: plainText(0, 170).optional(),
});

export const cityCreateSchema = z.object({
  name: plainText(2, 60),
  slug: slug.optional(),
  state: plainText(2, 60),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  intro: plainText(0, 4000).default(''),
  seoTitle: plainText(0, 70).optional(),
  seoDescription: plainText(0, 170).optional(),
  localities: z.array(localitySchema).max(300).default([]),
});
export const cityUpdateSchema = cityCreateSchema.partial().strict();

export const faqCreateSchema = z.object({
  question: plainText(5, 200),
  answer: plainText(5, 3000),
  category: z.enum(['general', 'tenants', 'owners', 'commercial']).default('general'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  published: z.boolean().default(true),
  showOnHome: z.boolean().default(false),
});
export const faqUpdateSchema = faqCreateSchema.partial().strict();

const optionalUrl = z
  .union([z.url({ protocol: /^https$/ }).max(300), z.literal('')])
  .optional()
  .transform((v) => v || undefined);

export const siteSettingsSchema = z.object({
  businessName: plainText(2, 80),
  tagline: plainText(0, 80),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919521750202'),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use international format'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  address: z
    .object({
      line1: plainText(0, 120).default(''),
      line2: plainText(0, 120).default(''),
      city: plainText(0, 60).default(''),
      state: plainText(0, 60).default(''),
      pincode: z.string().trim().max(6).default(''),
    })
    .default({ line1: '', line2: '', city: '', state: '', pincode: '' }),
  showAddress: z.boolean().default(false),
  businessHours: plainText(0, 120).default(''),
  social: z
    .object({
      facebook: optionalUrl,
      instagram: optionalUrl,
      linkedin: optionalUrl,
      youtube: optionalUrl,
      x: optionalUrl,
    })
    .default({
      facebook: undefined,
      instagram: undefined,
      linkedin: undefined,
      youtube: undefined,
      x: undefined,
    }),
  home: z.object({
    heroHeadline: plainText(5, 90),
    heroSubheadline: plainText(5, 220),
    heroImageUrl: optionalUrl,
    showRecent: z.boolean().default(true),
    showFeatured: z.boolean().default(true),
  }),
  allowInternationalEnquiries: z.boolean().default(false),
  enquiryNotificationEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
export const siteSettingsUpdateSchema = siteSettingsSchema.partial();

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export const imageReorderSchema = z.object({
  images: z.array(propertyImageSchema).max(30),
  coverImageIndex: z.number().int().min(0).default(0),
});
