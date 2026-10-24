import { describe, expect, it } from 'vitest';
import { parseSmartQuery } from './smart-search';

const ctx = {
  city: 'jaipur',
  localities: [
    { slug: 'malviya-nagar', name: 'Malviya Nagar' },
    { slug: 'c-scheme', name: 'C-Scheme' },
    { slug: 'vaishali-nagar', name: 'Vaishali Nagar' },
    { slug: 'ajmer-road', name: 'Ajmer Road' },
    { slug: 'jagatpura', name: 'Jagatpura' },
  ],
};

describe('parseSmartQuery', () => {
  it('reads a rental search with BHK, budget and locality', () => {
    const r = parseSmartQuery('2 BHK flat for rent under 25k in Malviya Nagar', ctx);
    expect(r.path).toBe(
      '/rent/jaipur/malviya-nagar?category=residential&propertyType=apartment&maxPrice=25000&bedrooms=2',
    );
    expect(r.understood).toEqual(['2 BHK', 'Apartment', 'For rent', 'Malviya Nagar', 'Up to ₹25k']);
  });

  it('reads crore budgets for sale', () => {
    const r = parseSmartQuery('3 bhk villa to buy under 1.5 cr in vaishali nagar', ctx);
    expect(r.path).toBe(
      '/buy/jaipur/vaishali-nagar?category=residential&propertyType=villa&maxPrice=15000000&bedrooms=3',
    );
  });

  it('treats a small bare budget as monthly rent', () => {
    expect(parseSmartQuery('1 bhk under 12000', ctx).path).toMatch(/^\/rent\/jaipur\?/);
  });

  it('applies the shared unit to a range', () => {
    const r = parseSmartQuery('office for rent in C-Scheme between 50k and 1 lakh', ctx);
    expect(r.path).toBe(
      '/commercial?listingType=rent&propertyType=office&city=jaipur&locality=c-scheme&minPrice=50000&maxPrice=100000',
    );
  });

  it('understands PG and plot filters', () => {
    expect(parseSmartQuery('girls pg with meals', ctx).path).toBe(
      '/rent/jaipur?category=residential&propertyType=pg&pgGender=female&pgFood=true',
    );
    expect(parseSmartQuery('JDA approved plot under 60 lakh on Ajmer Road', ctx).path).toBe(
      '/buy/jaipur/ajmer-road?category=residential&propertyType=plot&maxPrice=6000000&plotApproval=jda',
    );
  });

  it('sends new-project searches to /projects', () => {
    expect(parseSmartQuery('new projects in Jagatpura under 80 lakh', ctx).path).toBe(
      '/projects?city=jaipur&locality=jagatpura&maxPrice=8000000',
    );
  });

  it('falls back to a plain sale search', () => {
    expect(parseSmartQuery('something nice', ctx).path).toBe('/buy/jaipur?category=residential');
  });
});
