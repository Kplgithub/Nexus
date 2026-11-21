import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Offline India IP → city lookup for the home page (built by scripts/build-geo.mjs from
 * DB-IP's free "IP to City Lite" data). No outside service is called and nothing is stored
 * except the visitor's own cookie. IP location is a best guess (mobile networks often show
 * a big hub city), so the header city menu always lets the visitor change it.
 */
export type Place = { name: string; state: string; lat: number; lon: number };

type Table = { starts: Uint32Array; ends: Uint32Array; idx: Uint16Array; places: Place[] };

let table: Table | null | undefined;

function load(): Table | null {
  if (table !== undefined) return table;
  try {
    // `next start` may run from the app folder or the repo root.
    const dir = [
      join(process.cwd(), 'data', 'geo'),
      join(process.cwd(), 'apps', 'web', 'data', 'geo'),
    ].find((d) => existsSync(join(d, 'in-ipv4.bin')));
    if (!dir) throw new Error('no geo data');
    const buf = readFileSync(join(dir, 'in-ipv4.bin'));
    const n = buf.readUInt32LE(0);
    // Copy into aligned buffers: the file's byte offsets are not always 4-aligned.
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const starts = new Uint32Array(bytes.slice(4, 4 + n * 4).buffer);
    const ends = new Uint32Array(bytes.slice(4 + n * 4, 4 + n * 8).buffer);
    const idx = new Uint16Array(bytes.slice(4 + n * 8, 4 + n * 10).buffer);
    const raw = JSON.parse(readFileSync(join(dir, 'in-cities.json'), 'utf8')) as [
      string,
      string,
      number,
      number,
    ][];
    const places = raw.map(([name, state, lat, lon]) => ({ name, state, lat, lon }));
    table = { starts, ends, idx, places };
  } catch {
    table = null; // No data file: everyone simply gets the default city.
  }
  return table;
}

export function ipv4ToInt(ip: string): number | null {
  const m = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i.exec(ip.trim());
  if (!m) return null;
  const p = m.slice(1).map(Number);
  if (p.some((x) => x > 255)) return null;
  return ((p[0]! << 24) >>> 0) + (p[1]! << 16) + (p[2]! << 8) + p[3]!;
}

/** Index of the Indian place this IPv4 address belongs to, or null (not India / unknown). */
export function placeIndexForIp(ip: string): number | null {
  const t = load();
  const n = ipv4ToInt(ip);
  if (!t || n === null) return null;
  let lo = 0;
  let hi = t.starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t.starts[mid]! <= n) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi >= 0 && n <= t.ends[hi]! ? t.idx[hi]! : null;
}

export function placeAt(i: number): Place | null {
  return load()?.places[i] ?? null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // "Jaipur (Sanganer)" → "Jaipur"
    .normalize('NFKD')
    .replace(/[^a-z]/g, '');

/** Common old/alternate names, so an admin city like "Gurugram" still matches "Gurgaon". */
const ALIASES: Record<string, string[]> = {
  gurugram: ['gurgaon'],
  gurgaon: ['gurugram'],
  bengaluru: ['bangalore'],
  bangalore: ['bengaluru'],
  mumbai: ['bombay'],
  kolkata: ['calcutta'],
  chennai: ['madras'],
  prayagraj: ['allahabad'],
  newdelhi: ['delhi'],
  delhi: ['newdelhi'],
  vadodara: ['baroda'],
  mysuru: ['mysore'],
  thiruvananthapuram: ['trivandrum'],
  kochi: ['cochin'],
};

const km = (a: Place, b: Place) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

/** Suburbs within this distance of a city count as that city (e.g. Sanganer → Jaipur). */
const NEAR_KM = 40;

/**
 * The site city (from admin → Locations) that a detected place belongs to, by name first
 * and then by distance to the nearest site city. Null when the visitor's city isn't served yet.
 */
export function siteCityForPlace(
  i: number,
  cities: { slug: string; name: string; state?: string }[],
): string | null {
  const t = load();
  const place = t?.places[i];
  if (!t || !place) return null;
  const pn = norm(place.name);
  for (const c of cities) {
    const names = [norm(c.name), norm(c.slug), ...(ALIASES[norm(c.name)] ?? [])];
    if (names.includes(pn)) return c.slug;
  }
  let best: { slug: string; d: number } | null = null;
  for (const c of cities) {
    const centre = centreOf(t, c);
    if (!centre) continue;
    const d = km(place, centre);
    if (d <= NEAR_KM && (!best || d < best.d)) best = { slug: c.slug, d };
  }
  return best?.slug ?? null;
}

const centres = new Map<string, Place | null>();

/** Where a site city is, taken from the same data (biggest place with that name). */
function centreOf(t: Table, c: { slug: string; name: string; state?: string }): Place | null {
  const key = `${c.slug}|${c.name}|${c.state ?? ''}`;
  if (centres.has(key)) return centres.get(key)!;
  const names = [norm(c.name), norm(c.slug), ...(ALIASES[norm(c.name)] ?? [])];
  const matches = t.places.filter((p) => names.includes(norm(p.name)));
  const inState = matches.filter((p) => c.state && norm(p.state) === norm(c.state));
  const found = (inState[0] ?? matches[0]) || null;
  centres.set(key, found);
  return found;
}
