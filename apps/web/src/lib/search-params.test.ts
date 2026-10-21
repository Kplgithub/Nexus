import { describe, expect, it } from 'vitest';
import { hasUserFilters, parseSearch, toApiQuery, toQueryString } from './search-params';

describe('search params', () => {
  it('round-trips a typical search into a clean URL', () => {
    const s = parseSearch({
      category: 'residential',
      city: 'jaipur',
      minPrice: '10000',
      maxPrice: '25000',
      sort: 'newest',
      page: '1',
    });
    expect(toQueryString(s)).toBe('category=residential&city=jaipur&minPrice=10000&maxPrice=25000');
  });

  it('drops junk and keeps valid values', () => {
    const s = parseSearch({
      category: 'spaceship',
      bedrooms: 'two',
      furnishing: ['furnished', 'nope'],
    });
    expect(toQueryString(s)).toBe('furnishing=furnished');
  });

  it('forces scope on category pages', () => {
    const s = parseSearch({ category: 'commercial' }, { category: 'residential' });
    expect(s.category).toBe('residential');
  });

  it('adds limit and page for the API', () => {
    const s = parseSearch({ page: '3' });
    expect(toApiQuery(s, 12)).toBe('page=3&limit=12');
  });

  it('detects user filters', () => {
    expect(hasUserFilters({})).toBe(false);
    expect(hasUserFilters({ utm_source: 'x' })).toBe(false);
    expect(hasUserFilters({ minPrice: '5000' })).toBe(true);
  });
});
