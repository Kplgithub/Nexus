import { formatINR, formatINRShort, formatPrice, type PropertyCard } from '@nexus/shared';
import { BadgeCheckIcon, MapPinIcon, SparklesIcon, TrendingUpIcon } from '../icons';

/**
 * A short read-out of the listings on screen: price spread, typical price per
 * sq ft, how many are verified and where most of them are. Computed from the
 * results themselves, so it is always true for what the visitor sees.
 */
export function QuickInsights({ items, total }: { items: PropertyCard[]; total: number }) {
  if (items.length < 2) return null;
  const deal = items.every((p) => p.listingType === 'rent')
    ? 'rent'
    : items.every((p) => p.listingType === 'sale')
      ? 'sale'
      : null;
  const prices = items
    .map((p) => p.price)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  const perSqft = items
    .map((p) => p.pricePerSqft)
    .filter((n): n is number => typeof n === 'number' && n > 0)
    .sort((a, b) => a - b);
  const verified = items.filter((p) => p.verified).length;
  const byLocality = new Map<string, number>();
  for (const p of items)
    byLocality.set(p.locality.name, (byLocality.get(p.locality.name) ?? 0) + 1);
  const [topLocality, topCount] = [...byLocality.entries()].sort((a, b) => b[1] - a[1])[0]!;

  const facts = [
    deal &&
      prices.length > 0 && {
        Icon: TrendingUpIcon,
        label: 'Price range',
        value: `${formatINRShort(prices[0]!)} – ${formatINRShort(prices.at(-1)!)}${deal === 'rent' ? ' /mo' : ''}`,
        hint: `Typical ${formatPrice(median, deal)}`,
      },
    deal === 'sale' &&
      perSqft.length > 0 && {
        Icon: SparklesIcon,
        label: 'Typical price / sq ft',
        value: `${formatINR(perSqft[Math.floor(perSqft.length / 2)]!)}`,
        hint: `From ${formatINR(perSqft[0]!)}`,
      },
    {
      Icon: MapPinIcon,
      label: 'Most listings in',
      value: topLocality,
      hint: `${topCount} of ${items.length} shown`,
    },
    verified > 0 && {
      Icon: BadgeCheckIcon,
      label: 'Verified',
      value: `${verified} of ${items.length}`,
      hint: 'Checked by our team',
    },
  ].filter(Boolean) as {
    Icon: typeof SparklesIcon;
    label: string;
    value: string;
    hint: string;
  }[];

  return (
    <section
      aria-label="Quick insights"
      className="relative mb-6 overflow-hidden rounded-2xl border border-accent-100 bg-gradient-to-r from-accent-50 via-white to-brand-50 p-4 sm:p-5"
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-accent-700">
        <span className="nx-pulse inline-block size-2 rounded-full text-accent" aria-hidden>
          <span className="block size-2 rounded-full bg-accent" />
        </span>
        AI quick insights
        <span className="font-normal text-ink-muted">
          · based on the {items.length} {items.length === 1 ? 'listing' : 'listings'} shown
          {total > items.length ? ` of ${total}` : ''}
        </span>
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {facts.map(({ Icon, label, value, hint }, i) => (
          <div
            key={label}
            className="nx-rise rounded-xl bg-white/80 p-3 ring-1 ring-line backdrop-blur"
            style={{ '--i': i } as React.CSSProperties}
          >
            <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Icon size={14} className="text-brand" /> {label}
            </dt>
            <dd className="tabular mt-1 truncate font-semibold text-ink">{value}</dd>
            <dd className="text-xs text-ink-muted">{hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
