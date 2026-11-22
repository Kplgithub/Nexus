// Builds the small India IP → city table the home page uses to show each visitor their city.
//
//   node apps/web/scripts/build-geo.mjs [path/to/dbip-city-lite-YYYY-MM.csv.gz]
//
// Without a path it downloads this month's free "IP to City Lite" file from DB-IP
// (CC BY 4.0, attribution is on the privacy page). Only Indian IPv4 ranges are kept,
// and neighbouring ranges in the same city are merged, so the output stays ~2 MB.
// Re-run it every month or two; cities drift slowly, so an older table still works.
//
// Mobile networks (Jio, Airtel mobile, Vi, BSNL, ...) hand out IPs from national pools that
// DB-IP places in a hub city (Jio → Navi Mumbai, Airtel → Delhi/Patna...), so a phone in Jaipur
// would look like Mumbai. Those ranges are left out using DB-IP's free "IP to ASN Lite" file:
// such visitors count as "unknown" and get the main city with no "coming soon" note.
//
//   node apps/web/scripts/build-geo.mjs [city-lite.csv.gz] [asn-lite.csv.gz]
import { createReadStream, createWriteStream, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'geo');

/** Networks whose IP location is a national pool, not the visitor's city. */
const POOLED_ASNS = new Set([
  '55836', // Reliance Jio (mobile + JioFiber)
  '45609', // Bharti Airtel mobile
  '38266', // Vodafone Idea
  '55410', // Vodafone Idea
  '45271', // Vodafone Idea
  '9829', // BSNL
  '45820', // Tata Teleservices
  '18101', // Reliance Communications
]);

async function source(kind, arg) {
  if (arg) return arg;
  const month = new Date().toISOString().slice(0, 7);
  const file = join(tmpdir(), `dbip-${kind}-lite-${month}.csv.gz`);
  if (!existsSync(file)) {
    const res = await fetch(`https://download.db-ip.com/free/dbip-${kind}-lite-${month}.csv.gz`);
    if (!res.ok || !res.body) throw new Error(`DB-IP download failed: ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  }
  return file;
}

const ipv4 = (s) => {
  const p = s.split('.');
  if (p.length !== 4) return null;
  return ((+p[0] << 24) >>> 0) + (+p[1] << 16) + (+p[2] << 8) + +p[3];
};

/** Minimal CSV split: DB-IP quotes fields that contain commas. */
function fields(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// Pooled mobile ranges, sorted, to cut out of the city ranges below.
const pooled = [];
const asnLines = createInterface({
  input: createReadStream(await source('asn', process.argv[3])).pipe(createGunzip()),
});
for await (const line of asnLines) {
  const [start, end, asn] = fields(line);
  if (!POOLED_ASNS.has(asn)) continue;
  const a = ipv4(start);
  const b = ipv4(end);
  if (a !== null && b !== null) pooled.push([a, b]);
}
pooled.sort((x, y) => x[0] - y[0]);

/** Parts of [a, b] not covered by a pooled mobile range. */
function unpooled(a, b) {
  let lo = 0;
  let hi = pooled.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pooled[mid][1] < a) lo = mid + 1;
    else hi = mid - 1;
  }
  const out = [];
  let cur = a;
  for (let k = lo; k < pooled.length && pooled[k][0] <= b && cur <= b; k++) {
    const [pa, pb] = pooled[k];
    if (pb < cur) continue;
    if (pa > cur) out.push([cur, pa - 1]);
    cur = pb + 1;
  }
  if (cur <= b) out.push([cur, b]);
  return out;
}

const file = await source('city', process.argv[2]);
const rl = createInterface({ input: createReadStream(file).pipe(createGunzip()) });
const cityIndex = new Map(); // "city|state" -> index
const cities = []; // { name, state, lat, lon, n }
const ranges = []; // [start, end, idx]
for await (const line of rl) {
  const [start, end, , country, state, city, lat, lon] = fields(line);
  if (country !== 'IN' || !city) continue;
  const a0 = ipv4(start);
  const b0 = ipv4(end);
  if (a0 === null || b0 === null) continue; // IPv6
  const parts = unpooled(a0, b0);
  if (parts.length === 0) continue;
  const key = `${city}|${state}`;
  let idx = cityIndex.get(key);
  if (idx === undefined) {
    idx = cities.length;
    cityIndex.set(key, idx);
    cities.push({ name: city, state, lat: 0, lon: 0, n: 0 });
  }
  const c = cities[idx];
  c.lat += +lat;
  c.lon += +lon;
  c.n += 1;
  for (const [a, b] of parts) {
    const last = ranges[ranges.length - 1];
    if (last && last[2] === idx && last[1] + 1 === a) last[1] = b;
    else ranges.push([a, b, idx]);
  }
}
ranges.sort((x, y) => x[0] - y[0]);
if (cities.length > 65535) throw new Error('Too many cities for a 16-bit index');

const n = ranges.length;
const buf = Buffer.alloc(4 + n * 10);
buf.writeUInt32LE(n, 0);
ranges.forEach(([a, b, i], k) => {
  buf.writeUInt32LE(a, 4 + k * 4);
  buf.writeUInt32LE(b, 4 + n * 4 + k * 4);
  buf.writeUInt16LE(i, 4 + n * 8 + k * 2);
});
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'in-ipv4.bin'), buf);
writeFileSync(
  join(outDir, 'in-cities.json'),
  JSON.stringify(
    cities.map((c) => [c.name, c.state, +(c.lat / c.n).toFixed(3), +(c.lon / c.n).toFixed(3)]),
  ),
);
console.log(`${n} ranges, ${cities.length} places → ${outDir}`);
