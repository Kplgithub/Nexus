import type {
  FurnishingStatus,
  ListingType,
  PgGender,
  PlotApproval,
  PropertyType,
} from '@nexus/shared';
import { toQueryString } from './search-params';

/**
 * Turns a plain-language query ("2 bhk flat for rent under 25k in Malviya Nagar")
 * into a search URL. Rule-based and instant: it runs in the browser and never
 * sends the text anywhere.
 */

export type SmartLocality = { slug: string; name: string };

export type SmartQuery = {
  /** Where the search goes: a listing route or /projects. */
  path: string;
  /** What was understood, as short chips for the UI. */
  understood: string[];
};

const TYPE_WORDS: [RegExp, PropertyType, string][] = [
  [/\b(flat|flats|apartment|apartments)\b/, 'apartment', 'Apartment'],
  [/\b(villa|villas|bungalow|bungalows)\b/, 'villa', 'Villa'],
  [/\b(independent house|house|houses|kothi|makaan|makan|ghar)\b/, 'independent-house', 'House'],
  [/\bbuilder floor\b/, 'builder-floor', 'Builder floor'],
  [/\bstudio\b/, 'studio', 'Studio'],
  [/\b(plot|plots|land|zameen|jameen)\b/, 'plot', 'Plot'],
  [/\b(pg|paying guest|hostel)\b/, 'pg', 'PG'],
  [/\b(co-?working)\b/, 'coworking', 'Co-working'],
  [/\b(office|offices)\b/, 'office', 'Office'],
  [/\b(showroom|showrooms)\b/, 'showroom', 'Showroom'],
  [/\b(shop|shops|dukaan|dukan)\b/, 'shop', 'Shop'],
  [/\b(warehouse|godown|godam)\b/, 'warehouse', 'Warehouse'],
];

const COMMERCIAL_TYPES = new Set<PropertyType>([
  'office',
  'shop',
  'showroom',
  'coworking',
  'warehouse',
]);

const LAKH = 100_000;
const CRORE = 10_000_000;

/** "25k", "25,000", "50 lakh", "1.2 cr" → rupees. */
function parseAmount(num: string, unit = ''): number | undefined {
  const n = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const u = unit.toLowerCase();
  if (/^(k|thousand|hazaar|hazar)$/.test(u)) return Math.round(n * 1000);
  if (/^(l|lac|lacs|lakh|lakhs)$/.test(u)) return Math.round(n * LAKH);
  if (/^(cr|crore|crores)$/.test(u)) return Math.round(n * CRORE);
  return Math.round(n);
}

const AMOUNT = String.raw`(\d+(?:[.,]\d+)*)\s*(k|thousand|hazaar|hazar|l|lac|lacs|lakh|lakhs|cr|crore|crores)?\b`;

function priceRange(text: string): { min?: number; max?: number } {
  const between = new RegExp(String.raw`(?:between|from)\s+${AMOUNT}\s*(?:and|to|-)\s*${AMOUNT}`);
  const b = text.match(between);
  if (b) {
    // "20 to 30 lakh": the unit on the second number applies to both.
    const max = parseAmount(b[3]!, b[4]);
    const min = parseAmount(b[1]!, b[2] ?? b[4]);
    return { min, max };
  }
  const under = text.match(
    new RegExp(
      String.raw`(?:under|below|upto|up to|within|max|less than|tak|budget)\s*(?:rs\.?|₹|inr)?\s*${AMOUNT}`,
    ),
  );
  const over = text.match(
    new RegExp(
      String.raw`(?:above|over|more than|min|minimum|starting)\s*(?:rs\.?|₹|inr)?\s*${AMOUNT}`,
    ),
  );
  return {
    max: under ? parseAmount(under[1]!, under[2]) : undefined,
    min: over ? parseAmount(over[1]!, over[2]) : undefined,
  };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Longest locality name that appears in the text wins ("C-Scheme" over "Scheme"). */
function findLocality(text: string, localities: SmartLocality[]) {
  const t = ` ${norm(text).replace(/-/g, ' ')} `;
  let best: SmartLocality | undefined;
  for (const l of localities) {
    const n = norm(l.name).replace(/-/g, ' ');
    if (n && t.includes(` ${n} `) && (!best || n.length > best.name.length)) best = l;
  }
  return best;
}

export function formatRupees(n: number) {
  if (n >= CRORE) return `₹${+(n / CRORE).toFixed(2)} Cr`;
  if (n >= LAKH) return `₹${+(n / LAKH).toFixed(2)} L`;
  if (n >= 1000) return `₹${+(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export function parseSmartQuery(
  input: string,
  { city, localities }: { city?: string; localities: SmartLocality[] },
): SmartQuery {
  const text = ` ${input.toLowerCase()} `;
  const understood: string[] = [];

  let type: PropertyType | undefined;
  for (const [re, t, label] of TYPE_WORDS) {
    if (re.test(text)) {
      type = t;
      understood.push(label);
      break;
    }
  }

  const wantsProject = /\b(new project|new projects|under construction|launch|pre-?launch)\b/.test(
    text,
  );
  const rentWords = /\b(rent|rental|lease|kiraye|kiraya|kiraaye|to let|tolet)\b/.test(text);
  const buyWords = /\b(buy|sale|purchase|kharid|khareed|resale)\b/.test(text);
  let listingType: ListingType = type === 'pg' || (rentWords && !buyWords) ? 'rent' : 'sale';

  const bhk = text.match(/\b(\d)\s*(?:bhk|bed|beds|bedroom|bedrooms|rk)\b/);
  const bedrooms = bhk ? Number(bhk[1]) : undefined;
  if (bedrooms) understood.unshift(`${bedrooms} BHK`);

  let { min, max } = priceRange(text);
  // A bare "25k" on a sale search is almost always monthly rent.
  if (!rentWords && !buyWords && max && max < 2 * LAKH && type !== 'plot') listingType = 'rent';
  if (min && max && min > max) [min, max] = [max, min];

  const furnishing: FurnishingStatus | undefined = /\bsemi[- ]?furnished\b/.test(text)
    ? 'semi-furnished'
    : /\bunfurnished\b/.test(text)
      ? 'unfurnished'
      : /\b(fully )?furnished\b/.test(text)
        ? 'furnished'
        : undefined;

  const locality = findLocality(input, localities);
  const verified = /\bverified\b/.test(text) || undefined;
  const withPhotos = /\b(with photos|photos)\b/.test(text) || undefined;
  const pgGender: PgGender | undefined =
    type !== 'pg'
      ? undefined
      : /\b(girls?|ladies|women|female)\b/.test(text)
        ? 'female'
        : /\b(boys?|gents|men|male)\b/.test(text)
          ? 'male'
          : undefined;
  const pgFood = (type === 'pg' && /\b(meals?|food|khana|tiffin)\b/.test(text)) || undefined;
  const plotApproval: PlotApproval | undefined =
    type === 'plot' && /\bjda\b/.test(text)
      ? 'jda'
      : type === 'plot' && /\brhb\b/.test(text)
        ? 'rhb'
        : undefined;

  understood.push(listingType === 'rent' ? 'For rent' : 'For sale');
  if (locality) understood.push(locality.name);
  if (min && max) understood.push(`${formatRupees(min)} – ${formatRupees(max)}`);
  else if (max) understood.push(`Up to ${formatRupees(max)}`);
  else if (min) understood.push(`From ${formatRupees(min)}`);
  if (furnishing)
    understood.push(
      furnishing === 'semi-furnished'
        ? 'Semi-furnished'
        : furnishing === 'furnished'
          ? 'Furnished'
          : 'Unfurnished',
    );
  if (verified) understood.push('Verified');
  if (pgGender) understood.push(pgGender === 'female' ? 'For girls' : 'For boys');
  if (pgFood) understood.push('With meals');
  if (plotApproval) understood.push(`${plotApproval.toUpperCase()} approved`);

  if (wantsProject && listingType === 'sale') {
    const qs = new URLSearchParams();
    if (city) qs.set('city', city);
    if (locality) qs.set('locality', locality.slug);
    if (max) qs.set('maxPrice', String(max));
    return {
      path: `/projects${qs.size ? `?${qs}` : ''}`,
      understood: ['New projects', ...understood.filter((u) => u !== 'For sale')],
    };
  }

  const commercial = type ? COMMERCIAL_TYPES.has(type) : /\bcommercial\b/.test(text);
  if (commercial) {
    const qs = toQueryString({
      listingType,
      city,
      locality: locality?.slug,
      propertyType: type ? [type] : undefined,
      minPrice: min,
      maxPrice: max,
      verified,
    });
    return { path: `/commercial${qs ? `?${qs}` : ''}`, understood };
  }

  const root = listingType === 'rent' ? '/rent' : '/buy';
  const path = city ? (locality ? `${root}/${city}/${locality.slug}` : `${root}/${city}`) : root;
  const qs = toQueryString({
    category: 'residential',
    propertyType: type ? [type] : undefined,
    bedrooms,
    minPrice: min,
    maxPrice: max,
    furnishing: furnishing ? [furnishing] : undefined,
    verified,
    withPhotos,
    pgGender,
    pgFood,
    plotApproval: plotApproval ? [plotApproval] : undefined,
  });
  return { path: `${path}${qs ? `?${qs}` : ''}`, understood };
}

/** Rotating examples shown in the box. */
export const SMART_EXAMPLES = [
  '2 BHK flat for rent under 25k in Malviya Nagar',
  '3 BHK villa to buy under 1.5 cr in Vaishali Nagar',
  'JDA approved plot under 60 lakh on Ajmer Road',
  'Girls PG with meals in Mansarovar',
  'Office for rent in C-Scheme between 50k and 1 lakh',
  'New projects in Jagatpura under 80 lakh',
];
