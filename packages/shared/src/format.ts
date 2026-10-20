import { AREA_TO_SQFT, AREA_UNIT_LABELS, type AreaUnit } from './constants.js';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹25,000 — Indian digit grouping, no paise. */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** Compact rent label: ₹25,000/month, or ₹1.2 L/month for large values. */
export function formatRent(amount: number): string {
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    const shown = lakhs >= 100 ? `${(lakhs / 100).toFixed(2).replace(/\.?0+$/, '')} Cr` : `${lakhs.toFixed(2).replace(/\.?0+$/, '')} L`;
    return `₹${shown}/month`;
  }
  return `${formatINR(amount)}/month`;
}

export function formatArea(value: number, unit: AreaUnit): string {
  return `${new Intl.NumberFormat('en-IN').format(value)} ${AREA_UNIT_LABELS[unit]}`;
}

export function toSqft(value: number, unit: AreaUnit): number {
  return Math.round(value * AREA_TO_SQFT[unit]);
}

export function floorLabel(floor: number | null | undefined, total?: number | null): string | null {
  if (floor === null || floor === undefined) return null;
  const name =
    floor === 0 ? 'Ground floor' : floor < 0 ? `Basement ${Math.abs(floor)}` : `${ordinal(floor)} floor`;
  return total ? `${name} of ${total}` : name;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
