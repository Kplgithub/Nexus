// Builds the small India IP → city table the home page uses to show each visitor their city.
//
//   node apps/web/scripts/build-geo.mjs [path/to/dbip-city-lite-YYYY-MM.csv.gz]
//
// Without a path it downloads this month's free "IP to City Lite" file from DB-IP
// (CC BY 4.0, attribution is on the privacy page). Only Indian IPv4 ranges are kept,
// and neighbouring ranges in the same city are merged, so the output stays ~2 MB.
// Re-run it every month or two; cities drift slowly, so an older table still works.
import { createReadStream, createWriteStream, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'geo');

async function source() {
  if (process.argv[2]) return process.argv[2];
  const month = new Date().toISOString().slice(0, 7);
  const file = join(tmpdir(), `dbip-city-lite-${month}.csv.gz`);
  if (!existsSync(file)) {
    const res = await fetch(`https://download.db-ip.com/free/dbip-city-lite-${month}.csv.gz`);
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

const file = await source();
const rl = createInterface({ input: createReadStream(file).pipe(createGunzip()) });
const cityIndex = new Map(); // "city|state" -> index
const cities = []; // { name, state, lat, lon, n }
const ranges = []; // [start, end, idx]
for await (const line of rl) {
  const [start, end, , country, state, city, lat, lon] = fields(line);
  if (country !== 'IN' || !city) continue;
  const a = ipv4(start);
  const b = ipv4(end);
  if (a === null || b === null) continue; // IPv6
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
  const last = ranges[ranges.length - 1];
  if (last && last[2] === idx && last[1] + 1 === a) last[1] = b;
  else ranges.push([a, b, idx]);
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
