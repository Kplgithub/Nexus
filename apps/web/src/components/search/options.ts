import { formatINR } from '@nexus/shared';

export const RENT_STEPS = [
  5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000,
  500000,
];

export const rentLabel = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toString().replace(/\.0$/, '')} Lakh` : formatINR(n);

export const AREA_STEPS = [250, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000];
