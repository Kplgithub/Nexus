import type { ListingType, PropertyCard, PropertySearch } from '@nexus/shared';

/** What GET /api/v1/smart-search returns (see the backend smart-search service). */
export type MatchReason = { label: string; level: 'yes' | 'near' | 'no' };
export type SmartMatch = { score: number; exact: boolean; reasons: MatchReason[] };
export type SmartChip = { key: string; label: string; removable: boolean };
export type SmartSearchResult = {
  query: string;
  understood: boolean;
  hinglish: boolean;
  summary: string;
  chips: SmartChip[];
  filters: Partial<PropertySearch>;
  listingType: ListingType;
  city: string;
  exactCount: number;
  total: number;
  page: number;
  pages: number;
  items: (PropertyCard & { match: SmartMatch })[];
  budgetSuggestion: { maxPrice: number; extra: number; label: string } | null;
  projectsPath: string | null;
};

export type SmartParams = {
  q: string;
  deal?: ListingType;
  locality?: string;
  drop?: string;
  maxPrice?: string;
  page?: string;
};

/** The /search URL for a set of params; empty values are left out. */
export function smartSearchHref(p: SmartParams) {
  const qs = new URLSearchParams();
  qs.set('q', p.q);
  if (p.deal) qs.set('deal', p.deal);
  if (p.locality) qs.set('locality', p.locality);
  if (p.drop) qs.set('drop', p.drop);
  if (p.maxPrice) qs.set('maxPrice', p.maxPrice);
  if (p.page && p.page !== '1') qs.set('page', p.page);
  return `/search?${qs}`;
}
