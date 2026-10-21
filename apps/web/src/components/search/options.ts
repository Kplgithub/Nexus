import { formatINRShort, type ListingType } from '@nexus/shared';

export const RENT_STEPS = [
  5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000,
  500000,
];

export const SALE_STEPS = [
  1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7500000, 10000000, 15000000, 20000000,
  30000000, 50000000, 100000000,
];

export const priceSteps = (t?: ListingType) =>
  t === 'sale'
    ? SALE_STEPS
    : t === 'rent'
      ? RENT_STEPS
      : [...RENT_STEPS, ...SALE_STEPS.filter((s) => s > 500000)];

export const priceLabel = (n: number) => formatINRShort(n);

/** @deprecated kept for older imports */
export const rentLabel = priceLabel;

export const AREA_STEPS = [250, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000];
