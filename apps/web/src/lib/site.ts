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
  address: { line1: '', line2: '', city: 'Jaipur', state: 'Rajasthan', pincode: '' },
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
  { href: '/residential', label: 'Residential' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/properties', label: 'All properties' },
  { href: '/rentals', label: 'Locations' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;
