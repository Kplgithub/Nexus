import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  ALL_PROPERTY_TYPES,
  AMENITIES,
  AREA_TYPES,
  AREA_UNITS,
  CATEGORIES,
  FURNISHING_STATUSES,
  LISTING_VISIBILITY,
  MAX_MONEY_INR,
  PARKING_OPTIONS,
  PREFERRED_TENANTS,
  PROPERTY_STATUSES,
} from '@nexus/shared';

const moneyField = {
  type: Number,
  min: [0, 'Cannot be negative'],
  max: MAX_MONEY_INR,
  validate: { validator: Number.isInteger, message: 'Use whole rupees' },
};

const imageSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 1000 },
    publicId: { type: String, maxlength: 300 },
    alt: { type: String, default: '', maxlength: 160 },
    width: Number,
    height: Number,
    isDemo: { type: Boolean, default: false },
  },
  { _id: false },
);

const propertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 6000 },
    highlights: { type: [String], default: [] },

    category: { type: String, enum: CATEGORIES, required: true },
    propertyType: { type: String, enum: ALL_PROPERTY_TYPES, required: true },
    status: { type: String, enum: PROPERTY_STATUSES, default: 'draft', required: true },
    listingVisibility: { type: String, enum: LISTING_VISIBILITY, default: 'public' },

    citySlug: { type: String, required: true, lowercase: true },
    cityName: { type: String, required: true },
    localitySlug: { type: String, required: true, lowercase: true },
    localityName: { type: String, required: true },
    state: { type: String, default: 'Rajasthan' },
    approvedAddress: { type: String, default: '', maxlength: 200 },
    pincode: { type: String, match: /^\d{6}$/ },

    currency: { type: String, default: 'INR', enum: ['INR'], immutable: true },
    monthlyRent: { ...moneyField, required: true },
    rentNegotiable: { type: Boolean, default: false },
    securityDeposit: { ...moneyField, default: null },
    maintenanceCharges: { ...moneyField, default: null },
    maintenanceIncluded: { type: Boolean, default: false },
    brokerage: { type: String, maxlength: 120 },
    lockInMonths: { type: Number, min: 0, max: 120, default: null },
    rentalTerms: { type: String, maxlength: 2000 },

    areaValue: { type: Number, required: true, min: 0 },
    areaUnit: { type: String, enum: AREA_UNITS, required: true },
    areaType: { type: String, enum: AREA_TYPES, default: 'carpet' },
    /** Normalised area in sq ft — used only for filtering and sorting. */
    areaSqft: { type: Number, required: true, min: 0 },

    bedrooms: { type: Number, min: 0, max: 20, default: null },
    bathrooms: { type: Number, min: 0, max: 20, default: null },
    balconies: { type: Number, min: 0, max: 20, default: null },
    washrooms: { type: Number, min: 0, max: 50, default: null },
    floorNumber: { type: Number, min: -5, max: 200, default: null },
    totalFloors: { type: Number, min: 0, max: 200, default: null },
    facing: { type: String, maxlength: 30 },
    ageOfPropertyYears: { type: Number, min: 0, max: 200, default: null },

    furnishingStatus: { type: String, enum: FURNISHING_STATUSES, required: true },
    amenities: { type: [String], enum: AMENITIES, default: [] },
    parking: { type: String, enum: PARKING_OPTIONS, default: 'none' },
    preferredTenants: { type: [String], enum: PREFERRED_TENANTS, default: [] },
    suitableFor: { type: [String], default: [] },

    images: { type: [imageSchema], default: [] },
    coverImageIndex: { type: Number, default: 0, min: 0 },

    availableFrom: { type: Date, default: null },
    featured: { type: Boolean, default: false },
    /** Demo listings are labelled on the site and removable with one command. */
    isDemo: { type: Boolean, default: false },

    /** Private: never returned by public endpoints. */
    ownerReference: { type: String, maxlength: 200 },
    internalNotes: { type: String, maxlength: 4000 },

    seoTitle: { type: String, maxlength: 70 },
    seoDescription: { type: String, maxlength: 170 },

    publishedAt: { type: Date, default: null },
    rentedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, minimize: false },
);

propertySchema.index({ slug: 1 }, { unique: true });
// Primary search path: visible listings filtered by category/location, sorted by rent or recency.
propertySchema.index({ status: 1, listingVisibility: 1, category: 1, citySlug: 1, localitySlug: 1, monthlyRent: 1 });
propertySchema.index({ status: 1, listingVisibility: 1, category: 1, publishedAt: -1 });
propertySchema.index({ status: 1, listingVisibility: 1, citySlug: 1, publishedAt: -1 });
propertySchema.index({ status: 1, listingVisibility: 1, propertyType: 1, monthlyRent: 1 });
propertySchema.index({ status: 1, featured: 1, publishedAt: -1 });
propertySchema.index({ isDemo: 1 });
propertySchema.index({ updatedAt: -1 });
propertySchema.index(
  { title: 'text', localityName: 'text', description: 'text' },
  { weights: { title: 10, localityName: 6, description: 1 }, name: 'property_text' },
);

export type PropertyAttrs = InferSchemaType<typeof propertySchema>;
export type PropertyDoc = HydratedDocument<PropertyAttrs>;
export const Property = model('Property', propertySchema);
