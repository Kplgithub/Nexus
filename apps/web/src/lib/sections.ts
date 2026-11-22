import {
  DEFAULT_SITE_SECTIONS,
  PROPERTY_TYPES,
  type SiteSection,
  type SiteSections,
  type SiteSettings,
} from '@nexus/shared';

/**
 * Admin → Settings → Site sections. Every public link, tab, tile and filter for a
 * section goes through these helpers, so switching a section off removes it everywhere.
 * The Home loan switch (settings.homeLoan.enabled) is included so links can use one check.
 */
export type SectionKey = SiteSection | 'homeLoan';
export type SectionsOn = SiteSections & { homeLoan: boolean };

export const ALL_ON: SectionsOn = { ...DEFAULT_SITE_SECTIONS, homeLoan: false };

export function sectionsOn(
  s?: {
    sections?: Partial<SiteSections>;
    homeLoan?: Pick<SiteSettings['homeLoan'], 'enabled'>;
  } | null,
): SectionsOn {
  return {
    ...DEFAULT_SITE_SECTIONS,
    ...(s?.sections ?? {}),
    homeLoan: s?.homeLoan?.enabled ?? false,
  };
}

const COMMERCIAL_TYPES = new Set<string>(PROPERTY_TYPES.commercial);

/** The section a site path belongs to as a page (/buy, /rent, /commercial, /projects...). */
export function pageSection(pathname: string): SectionKey | null {
  const root = pathname.split('/')[1] ?? '';
  if (root === 'buy') return 'buy';
  if (root === 'rent') return 'rent';
  if (root === 'commercial') return 'commercial';
  if (root === 'projects') return 'projects';
  if (root === 'home-loan') return 'homeLoan';
  return null;
}

/** Sections a filter in the query string depends on (a PG filter needs PG to be on). */
export function filterSections(params: URLSearchParams): SiteSection[] {
  const out = new Set<SiteSection>();
  for (const t of params.getAll('propertyType').flatMap((v) => v.split(','))) {
    if (t === 'pg') out.add('pg');
    else if (t === 'plot') out.add('plot');
    else if (COMMERCIAL_TYPES.has(t)) out.add('commercial');
  }
  if (params.get('category') === 'commercial') out.add('commercial');
  return [...out];
}

/** Every switch a site link needs; the link is shown only while all are on. */
export function hrefSections(href: string): SectionKey[] {
  if (!href.startsWith('/')) return [];
  const u = new URL(href, 'http://local');
  const page = pageSection(u.pathname);
  const out = new Set<SectionKey>(page ? [page] : []);
  for (const s of filterSections(u.searchParams)) out.add(s);
  if (u.pathname === '/search') {
    const deal = u.searchParams.get('listingType') ?? u.searchParams.get('deal');
    if (deal === 'sale') out.add('buy');
    if (deal === 'rent') out.add('rent');
  }
  return [...out];
}

export const hrefOn = (href: string, on: SectionsOn) =>
  hrefSections(href).every((k) => on[k] !== false);

/** Keeps only links whose sections are on. */
export function onlyOn<T>(items: T[], on: SectionsOn, href: (item: T) => string): T[] {
  return items.filter((i) => hrefOn(href(i), on));
}

/** Where a visitor goes when a switched-off section's page is opened (redirect mode). */
export function sectionFallback(section: SectionKey, on: SectionsOn): string {
  if (section === 'pg' && on.rent) return '/rent';
  if (section === 'plot' && on.buy) return '/buy';
  return '/';
}

/** True when nothing a visitor can browse for listings is left on. */
export const noListingSections = (on: SectionsOn) => !on.buy && !on.rent && !on.commercial;
