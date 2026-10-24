import Link from 'next/link';
import { formatINR, formatINRShort, type City } from '@nexus/shared';
import { getLocalityInsights } from '@/lib/api';
import { TrendingUpIcon } from '../icons';

/**
 * "Property rates" table: price per sq ft and typical rent per locality, from
 * live listings. Rows without any numbers are left out.
 */
export async function PriceTable({ city }: { city: City }) {
  const top = [...city.localities]
    .filter((l) => (l.publishedCount ?? 0) > 0)
    .sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
    .slice(0, 8);
  if (!top.length) return null;
  const all = await Promise.all(top.map((l) => getLocalityInsights(city.slug, l.slug)));
  const rows = all
    .filter((r): r is NonNullable<typeof r> => !!r)
    .filter((r) => r.sale.medianPricePerSqft || r.rent.medianRent);
  if (rows.length < 2) return null;
  const cityRate = rows.find((r) => r.cityMedianPricePerSqft)?.cityMedianPricePerSqft ?? null;

  return (
    <section className="py-14 sm:py-16" aria-labelledby="rates-heading">
      <div className="container-page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <TrendingUpIcon size={16} /> Property rates
            </p>
            <h2 id="rates-heading" className="mt-1 text-[1.75rem] leading-tight sm:text-[2.15rem]">
              What homes cost in {city.name}
            </h2>
            <p className="mt-2 text-ink-soft">
              Worked out from live listings on NEXUS
              {cityRate ? `. City typical: ${formatINR(cityRate)} per sq ft.` : '.'}
            </p>
          </div>
          <Link href="/locations" className="font-semibold text-brand hover:underline">
            All localities
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Locality
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Price / sq ft
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  vs city
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Typical rent
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Listings
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Links</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const rate = r.sale.medianPricePerSqft;
                const diff =
                  rate && cityRate ? Math.round(((rate - cityRate) / cityRate) * 100) : null;
                return (
                  <tr key={r.locality.slug} className="transition hover:bg-brand-50/40">
                    <th scope="row" className="px-5 py-3.5 font-semibold text-ink">
                      {r.locality.name}
                    </th>
                    <td className="tabular px-5 py-3.5">{rate ? formatINR(rate) : '—'}</td>
                    <td className="px-5 py-3.5">
                      {diff === null ? (
                        '—'
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${diff > 0 ? 'bg-warn-50 text-warn' : 'bg-success-50 text-success'}`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff}%
                        </span>
                      )}
                    </td>
                    <td className="tabular px-5 py-3.5">
                      {r.rent.medianRent ? `${formatINRShort(r.rent.medianRent)}/mo` : '—'}
                    </td>
                    <td className="tabular px-5 py-3.5 text-ink-soft">
                      {r.sale.count + r.rent.count}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold">
                      <Link
                        href={`/buy/${city.slug}/${r.locality.slug}`}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-brand hover:bg-brand hover:text-white"
                      >
                        Buy
                      </Link>{' '}
                      <Link
                        href={`/rent/${city.slug}/${r.locality.slug}`}
                        className="rounded-full bg-accent-50 px-2.5 py-1 text-accent-700 hover:bg-accent hover:text-ink"
                      >
                        Rent
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
