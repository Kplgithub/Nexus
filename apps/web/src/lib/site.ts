import { DEFAULT_SITE_SECTIONS, type SiteSettings } from '@nexus/shared';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
export const SITE_NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === 'true';
/** Google Tag Manager container. Set NEXT_PUBLIC_GTM_ID to an empty string to turn it off. */
export const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-TDXSXMSM').trim();
/**
 * Google Analytics 4, loaded directly (not through GTM). Do NOT also add a GA4
 * "Google tag" for this ID inside the GTM container, or every pageview counts twice.
 * Set NEXT_PUBLIC_GA_ID to an empty string to turn it off.
 */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? 'G-4CWB09V7NM').trim();
/** True when any analytics tool loads on the public site. */
export const ANALYTICS_ON = Boolean(GTM_ID || GA_ID);
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
    banners: [],
  },
  allowInternationalEnquiries: false,
  featurePrices: { days7: 49, days30: 99 },
  homeLoan: { enabled: false, lenders: [], ratesCheckedAt: null, exampleRate: 8.5 },
  sections: { ...DEFAULT_SITE_SECTIONS },
  sectionOffAction: 'redirect',
  invoice: { legalName: '', address: '', state: 'Rajasthan', sacCode: '' },
};

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Locality (area) pages such as /buy/jaipur/mansarovar stay live and in the sitemap for search,
 * but kapil wants only city-level links in the site's menus and sections (21 Nov 2026).
 * Set to true to show locality links in the mega menu, footer, home page and /locations again.
 */
export const SHOW_LOCALITY_LINKS = false;

export const NAV_LINKS = [
  { href: '/buy', label: 'Buy' },
  { href: '/rent', label: 'Rent' },
  { href: '/projects', label: 'New projects' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/home-loan', label: 'Home loan' },
  { href: '/agents', label: 'Agents' },
  { href: '/locations', label: 'Locations' },
  { href: '/blog', label: 'Blog' },
] as const;

/** Where the "Post property" button leads: sign-up for visitors, the form for members. */
export const POST_PROPERTY_PATH = '/dashboard/listings/new';

/** True when the home loan rates have not been checked for a month (or ever). */
export function loanRatesStale(checkedAt: string | null | undefined, staleDays: number): boolean {
  if (!checkedAt) return true;
  return Date.now() - new Date(checkedAt).getTime() > staleDays * 86_400_000;
}
