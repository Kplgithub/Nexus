import type { SiteSettings } from '@nexus/shared';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
export const SITE_NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === 'true';
export const REVALIDATE_SECONDS = Number(process.env.REVALIDATE_SECONDS ?? 60);

/** Fallback used only if the API is unreachable, so the header/footer still render. */
export const FALLBACK_SETTINGS: SiteSettings = {
  businessName: 'NEXUS Estate',
  tagline: 'Rentals | Properties',
  phone: '+919521750202',
  whatsapp: '+919521750202',
  address: { line1: '', line2: '', city: '', state: '', pincode: '' },
  showAddress: false,
  businessHours: '',
  social: {},
  home: {
    heroHeadline: 'Find the Right Space for Your Next Chapter',
    heroSubheadline:
      'Explore residential homes and commercial spaces that fit your needs, lifestyle, and business goals.',
    showRecent: true,
    showFeatured: true,
  },
  allowInternationalEnquiries: false,
};

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const NAV_LINKS = [
  { href: '/buy', label: 'Buy' },
  { href: '/rent', label: 'Rent' },
  { href: '/projects', label: 'New projects' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/agents', label: 'Agents' },
  { href: '/locations', label: 'Locations' },
] as const;

/** Where the "Post property" button leads: sign-up for visitors, the form for members. */
export const POST_PROPERTY_PATH = '/dashboard/listings/new';
