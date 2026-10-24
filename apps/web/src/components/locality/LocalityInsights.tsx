import Link from 'next/link';
import {
  LANDMARK_KIND_LABELS,
  PROPERTY_TYPE_LABELS,
  formatINR,
  formatINRShort,
  type LandmarkKind,
  type ListingType,
  type LocalityInsights as Insights,
} from '@nexus/shared';
import { MapView, type MapMarker } from '../map/Map';
import { CheckIcon } from '../icons';

/**
 * "About this locality": live price and rent figures worked out from listings,
 * plus the admin's highlights and nearby places.
 */
export function LocalityInsights({ data, deal }: { data: Insights; deal?: ListingType }) {
  const { city, locality, sale, rent } = data;
  const landmarks = locality.landmarks ?? [];
  const highlights = locality.highlights ?? [];
  const vsCity =
    sale.medianPricePerSqft && data.cityMedianPricePerSqft
      ? Math.round((sale.medianPricePerSqft / data.cityMedianPricePerSqft - 1) * 100)
      : null;

  const stats: { label: string; value: string; note?: string }[] = [];
  if (sale.medianPricePerSqft)
    stats.push({
      label: 'Typical sale price',
      value: `${formatINR(sale.medianPricePerSqft)}/sq ft`,
      note:
        vsCity === null
          ? `${sale.count} listings`
          : `${Math.abs(vsCity)}% ${vsCity >= 0 ? 'above' : 'below'} the ${city.name} average`,
    });
  if (sale.minPrice && sale.maxPrice)
    stats.push({
      label: 'Sale prices',
      value: `${formatINRShort(sale.minPrice)} – ${formatINRShort(sale.maxPrice)}`,
      note: `${sale.count} for sale`,
    });
  if (rent.medianRent)
    stats.push({
      label: 'Typical rent',
      value: `${formatINR(rent.medianRent)}/month`,
      note: `${rent.count} for rent`,
    });
  if (data.projects)
    stats.push({ label: 'New projects', value: String(data.projects), note: 'Live on NEXUS' });

  const byKind = new Map<LandmarkKind, string[]>();
  for (const l of landmarks) byKind.set(l.kind, [...(byKind.get(l.kind) ?? []), l.name]);

  const pins: MapMarker[] = landmarks
    .filter((l) => l.location)
    .map((l) => ({
      ...l.location!,
      title: `${l.name} (${LANDMARK_KIND_LABELS[l.kind]})`,
      kind: 'landmark',
    }));
  const hasAnything =
    stats.length > 0 || highlights.length > 0 || landmarks.length > 0 || locality.center;
  if (!hasAnything) return null;

  return (
    <section aria-labelledby="locality-insights" className="mt-20 border-t border-line pt-12">
      <p className="eyebrow">Locality guide</p>
      <h2 id="locality-insights" className="mt-2 text-[2rem] leading-tight">
        Living in {locality.name}, {city.name}
      </h2>

      {stats.length > 0 && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <dt className="text-sm text-ink-muted">{s.label}</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-brand-900">{s.value}</dd>
              {s.note && <dd className="mt-1 text-xs text-ink-muted">{s.note}</dd>}
            </div>
          ))}
        </dl>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-10">
          {rent.medianRentByBhk.length > 0 && deal !== 'sale' && (
            <div>
              <h3 className="font-sans text-lg font-semibold">Rent by size</h3>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="py-2 font-medium">Home</th>
                    <th className="py-2 text-right font-medium">Typical rent</th>
                  </tr>
                </thead>
                <tbody>
                  {rent.medianRentByBhk.map((r) => (
                    <tr key={r.bedrooms} className="border-b border-line">
                      <td className="py-2.5">
                        {r.bedrooms === 0 ? 'Studio' : `${r.bedrooms} BHK`}
                      </td>
                      <td className="tabular py-2.5 text-right font-medium">
                        {formatINR(r.rent)}/month
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {highlights.length > 0 && (
            <div>
              <h3 className="font-sans text-lg font-semibold">Why people choose {locality.name}</h3>
              <ul className="mt-3 space-y-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-ink-soft">
                    <CheckIcon size={18} className="mt-0.5 shrink-0 text-accent-700" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {byKind.size > 0 && (
            <div>
              <h3 className="font-sans text-lg font-semibold">Nearby</h3>
              <dl className="mt-3 divide-y divide-line border-y border-line">
                {[...byKind].map(([kind, names]) => (
                  <div key={kind} className="flex gap-4 py-2.5 text-sm">
                    <dt className="w-32 shrink-0 text-ink-muted">{LANDMARK_KIND_LABELS[kind]}</dt>
                    <dd>{names.join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {data.byType.length > 0 && (
            <div>
              <h3 className="font-sans text-lg font-semibold">What’s listed here</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.byType.map((t) => (
                  <li key={t.propertyType} className="chip">
                    {PROPERTY_TYPE_LABELS[t.propertyType]} · {t.count}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.projects > 0 && (
            <Link
              href={`/projects?city=${city.slug}&locality=${locality.slug}`}
              className="btn btn-outline"
            >
              See new projects in {locality.name}
            </Link>
          )}
        </div>

        {locality.center && (
          <div>
            <MapView
              center={locality.center}
              markers={[{ ...locality.center, title: locality.name }, ...pins]}
              zoom={14}
              label={`Map of ${locality.name}`}
              className="h-96"
            />
          </div>
        )}
      </div>
      <p className="mt-6 text-xs text-ink-muted">
        Prices are medians of live listings on NEXUS Estate and change as listings come and go. They
        are a guide, not a valuation.
      </p>
    </section>
  );
}
