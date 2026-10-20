import type {
  AdminRole,
  Amenity,
  AreaType,
  AreaUnit,
  Category,
  EnquiryStatus,
  EnquiryType,
  FurnishingStatus,
  ParkingOption,
  PreferredTenant,
  PropertyStatus,
  PropertyType,
  SortOption,
  SubmissionStatus,
} from './constants.js';

/** Envelope used by every API response. */
export type ApiSuccess<T> = { ok: true; data: T; meta?: PaginationMeta };
export type ApiError = {
  ok: false;
  error: { code: string; message: string; details?: Record<string, string[]> };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PropertyImage = {
  url: string;
  publicId?: string;
  alt: string;
  width?: number;
  height?: number;
  isDemo?: boolean;
};

/** Public-safe projection of a property. Never contains owner details or internal notes. */
export type PublicProperty = {
  id: string;
  slug: string;
  title: string;
  description: string;
  highlights: string[];
  category: Category;
  propertyType: PropertyType;
  status: Extract<PropertyStatus, 'published' | 'rented'>;
  city: { slug: string; name: string };
  locality: { slug: string; name: string };
  state: string;
  approvedAddress: string;
  monthlyRent: number;
  rentNegotiable: boolean;
  securityDeposit: number | null;
  maintenanceCharges: number | null;
  maintenanceIncluded: boolean;
  brokerage: string | null;
  lockInMonths: number | null;
  rentalTerms: string | null;
  areaValue: number;
  areaUnit: AreaUnit;
  areaType: AreaType;
  areaSqft: number;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  washrooms: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  facing: string | null;
  ageOfPropertyYears: number | null;
  furnishingStatus: FurnishingStatus;
  amenities: Amenity[];
  parking: ParkingOption;
  preferredTenants: PreferredTenant[];
  suitableFor: string[];
  images: PropertyImage[];
  coverImage: PropertyImage | null;
  availableFrom: string | null;
  featured: boolean;
  isDemo: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type PropertyCard = Pick<
  PublicProperty,
  | 'id'
  | 'slug'
  | 'title'
  | 'category'
  | 'propertyType'
  | 'status'
  | 'city'
  | 'locality'
  | 'monthlyRent'
  | 'areaValue'
  | 'areaUnit'
  | 'bedrooms'
  | 'bathrooms'
  | 'furnishingStatus'
  | 'coverImage'
  | 'featured'
  | 'isDemo'
  | 'availableFrom'
  | 'publishedAt'
>;

export type AdminProperty = Omit<PublicProperty, 'status'> & {
  status: PropertyStatus;
  listingVisibility: 'public' | 'unlisted';
  citySlug: string;
  localitySlug: string;
  pincode: string | null;
  coverImageIndex: number;
  ownerReference: string | null;
  internalNotes: string | null;
  createdAt: string;
  enquiryCount?: number;
};

export type Locality = {
  name: string;
  slug: string;
  active: boolean;
  intro: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedCount?: number;
};

export type City = {
  id: string;
  name: string;
  slug: string;
  state: string;
  active: boolean;
  sortOrder: number;
  intro: string;
  seoTitle?: string;
  seoDescription?: string;
  localities: Locality[];
  publishedCount?: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'tenants' | 'owners' | 'commercial';
  sortOrder: number;
  published: boolean;
  showOnHome: boolean;
};

export type SiteSettings = {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  showAddress: boolean;
  businessHours: string;
  social: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    x?: string;
  };
  home: {
    heroHeadline: string;
    heroSubheadline: string;
    heroImageUrl?: string;
    showRecent: boolean;
    showFeatured: boolean;
  };
  allowInternationalEnquiries: boolean;
  /** Admin only. */
  enquiryNotificationEmail?: string;
};

export type EnquiryNote = { text: string; by: string; at: string };

export type Enquiry = {
  id: string;
  leadId: string;
  type: EnquiryType;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  property: { id: string; title: string; slug: string } | null;
  sourcePage: string | null;
  preferredContactTime: string | null;
  status: EnquiryStatus;
  followUpAt: string | null;
  assignedTo: string | null;
  notes: EnquiryNote[];
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertySubmission = {
  id: string;
  leadId: string;
  ownerName: string;
  phone: string;
  email: string | null;
  relationship: string;
  category: Category;
  propertyType: PropertyType;
  city: string;
  locality: string;
  expectedRent: number | null;
  areaValue: number | null;
  areaUnit: AreaUnit;
  bedrooms: number | null;
  furnishingStatus: FurnishingStatus | null;
  availableFrom: string | null;
  description: string;
  status: SubmissionStatus;
  notes: EnquiryNote[];
  createdAt: string;
};

export type AdminUser = { id: string; email: string; name: string; role: AdminRole };

export type DashboardStats = {
  properties: {
    total: number;
    published: number;
    draft: number;
    rented: number;
    inactive: number;
    archived: number;
    demo: number;
  };
  enquiries: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    followUpsDue: number;
  };
  submissions: { new: number };
  recentProperties: Pick<
    AdminProperty,
    'id' | 'title' | 'slug' | 'status' | 'monthlyRent' | 'createdAt'
  >[];
  recentEnquiries: Pick<Enquiry, 'id' | 'leadId' | 'name' | 'status' | 'createdAt' | 'property'>[];
};

export type CategoryInfo = {
  category: Category;
  label: string;
  enabled: boolean;
  types: { value: PropertyType; label: string }[];
};

export type { SortOption };
