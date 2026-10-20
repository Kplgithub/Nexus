import { describe, expect, it } from 'vitest';
import {
  enquiryCreateSchema,
  formatRent,
  normalizePhone,
  propertyCreateSchema,
  propertySearchSchema,
  slugify,
  toSqft,
  whatsappLink,
} from './index.js';

describe('normalizePhone', () => {
  it.each([
    ['9521750202', '+919521750202'],
    ['09521750202', '+919521750202'],
    ['+91 95217 50202', '+919521750202'],
    ['91-9521750202', '+919521750202'],
    ['0091 9521750202', '+919521750202'],
  ])('accepts Indian mobile %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['12345', '5521750202', '+91 1234567890', 'abcdefghij', ''])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('accepts international numbers only when enabled', () => {
    expect(normalizePhone('+44 7911 123456')).toBeNull();
    expect(normalizePhone('+44 7911 123456', true)).toBe('+447911123456');
  });
});

describe('whatsappLink', () => {
  it('uses digits with country code', () => {
    expect(whatsappLink('+919521750202', 'Hi')).toBe('https://wa.me/919521750202?text=Hi');
  });
});

describe('slugify', () => {
  it('produces clean slugs', () => {
    expect(slugify('2 BHK Flat in Vaishali Nagar, Jaipur!')).toBe(
      '2-bhk-flat-in-vaishali-nagar-jaipur',
    );
    expect(slugify('Shop & Showroom')).toBe('shop-and-showroom');
  });
});

describe('formatting', () => {
  it('formats rent', () => {
    expect(formatRent(25000)).toBe('₹25,000/month');
    expect(formatRent(150000)).toBe('₹1.5 L/month');
  });
  it('converts area', () => {
    expect(toSqft(100, 'sqyd')).toBe(900);
  });
});

describe('propertySearchSchema', () => {
  it('drops invalid values instead of failing', () => {
    const q = propertySearchSchema.parse({
      category: 'castle',
      minRent: 'abc',
      page: '-4',
      sort: 'x',
    });
    expect(q.category).toBeUndefined();
    expect(q.minRent).toBeUndefined();
    expect(q.page).toBe(1);
    expect(q.sort).toBe('newest');
  });
  it('swaps inverted rent range', () => {
    const q = propertySearchSchema.parse({ minRent: '30000', maxRent: '10000' });
    expect(q.minRent).toBe(10000);
    expect(q.maxRent).toBe(30000);
  });
  it('drops property types outside the category', () => {
    const q = propertySearchSchema.parse({
      category: 'commercial',
      propertyType: 'office,apartment',
    });
    expect(q.propertyType).toEqual(['office']);
  });
  it('ignores locality without city', () => {
    expect(propertySearchSchema.parse({ locality: 'c-scheme' }).locality).toBeUndefined();
  });
});

const baseProperty = {
  title: 'Spacious office near Ashok Marg',
  description: 'A bright, ready-to-move office suitable for a team of fifteen people.',
  category: 'commercial',
  propertyType: 'office',
  citySlug: 'jaipur',
  localitySlug: 'c-scheme',
  monthlyRent: 60000,
  areaValue: 1200,
  areaUnit: 'sqft',
  furnishingStatus: 'furnished',
} as const;

describe('propertyCreateSchema', () => {
  it('does not require bedrooms for offices', () => {
    expect(propertyCreateSchema.safeParse(baseProperty).success).toBe(true);
  });
  it('requires bedrooms and bathrooms for apartments', () => {
    const r = propertyCreateSchema.safeParse({
      ...baseProperty,
      category: 'residential',
      propertyType: 'apartment',
    });
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('bedrooms');
    expect(paths).toContain('bathrooms');
  });
  it('rejects negative rent', () => {
    expect(propertyCreateSchema.safeParse({ ...baseProperty, monthlyRent: -1 }).success).toBe(
      false,
    );
  });
  it('rejects a type from another category', () => {
    expect(propertyCreateSchema.safeParse({ ...baseProperty, propertyType: 'villa' }).success).toBe(
      false,
    );
  });
  it('rejects publishing without photos', () => {
    expect(propertyCreateSchema.safeParse({ ...baseProperty, status: 'published' }).success).toBe(
      false,
    );
  });
  it('strips markup characters', () => {
    const r = propertyCreateSchema.parse({
      ...baseProperty,
      title: 'Office <script>near</script> park',
    });
    expect(r.title).not.toMatch(/[<>]/);
  });
});

describe('enquiryCreateSchema', () => {
  it('requires consent', () => {
    expect(enquiryCreateSchema.safeParse({ name: 'Asha', phone: '9521750202' }).success).toBe(
      false,
    );
    expect(
      enquiryCreateSchema.safeParse({ name: 'Asha', phone: '9521750202', consent: true }).success,
    ).toBe(true);
  });
  it('treats empty email as absent', () => {
    const r = enquiryCreateSchema.parse({
      name: 'Asha',
      phone: '9521750202',
      email: '',
      consent: true,
    });
    expect(r.email).toBeUndefined();
  });
});
