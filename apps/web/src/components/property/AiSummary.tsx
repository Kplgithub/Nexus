import { formatINRShort, type LocalityInsights, type PublicProperty } from '@nexus/shared';
import { BadgeCheckIcon, SparklesIcon, TrendingUpIcon } from '../icons';

/**
 * "AI summary": a price check against live listings in the same locality, plus a
 * few plain points read from the listing. Rule-based, from real data only; if
 * there is nothing to compare against, the price check is left out.
 */
export function AiSummary({
  p,
  insights,
}: {
  p: PublicProperty;
  insights: LocalityInsights | null;
}) {
  const isSale = p.listingType === 'sale';
  let check: { tone: 'good' | 'fair' | 'high'; text: string; detail: string } | null = null;

  if (insights && isSale && p.pricePerSqft && insights.sale.medianPricePerSqft) {
    const median = insights.sale.medianPricePerSqft;
    const diff = Math.round(((p.pricePerSqft - median) / median) * 100);
    check = {
      tone: diff <= -5 ? 'good' : diff >= 10 ? 'high' : 'fair',
      text:
        Math.abs(diff) < 5
          ? `In line with ${p.locality.name}`
          : `${Math.abs(diff)}% ${diff < 0 ? 'below' : 'above'} the ${p.locality.name} typical`,
      detail: `${formatINRShort(p.pricePerSqft)}/sq ft here vs ${formatINRShort(median)}/sq ft typical, from ${insights.sale.count} live listings.`,
    };
  } else if (insights && !isSale && p.bedrooms) {
    const same = insights.rent.medianRentByBhk.find((r) => r.bedrooms === p.bedrooms);
    if (same && insights.rent.count >= 2) {
      const diff = Math.round(((p.price - same.rent) / same.rent) * 100);
      check = {
        tone: diff <= -5 ? 'good' : diff >= 10 ? 'high' : 'fair',
        text:
          Math.abs(diff) < 5
            ? `Typical rent for a ${p.bedrooms} BHK here`
            : `${Math.abs(diff)}% ${diff < 0 ? 'below' : 'above'} typical ${p.bedrooms} BHK rent`,
        detail: `${formatINRShort(p.price)}/month here vs ${formatINRShort(same.rent)}/month typical in ${p.locality.name}.`,
      };
    }
  }

  const points = [
    p.verified && 'Details checked by the NEXUS team',
    p.images.length >= 5 && `${p.images.length} photos to look through`,
    p.location && 'Map pin added',
    p.priceNegotiable && 'Price is negotiable',
    !isSale && p.securityDeposit === 0 && 'No security deposit',
    p.amenities.length >= 5 && `${p.amenities.length} amenities listed`,
    p.videoUrl && 'Has a video tour',
  ].filter(Boolean) as string[];

  if (!check && points.length === 0) return null;

  const tone = {
    good: 'bg-success-50 text-success ring-success/20',
    fair: 'bg-brand-50 text-brand-800 ring-brand/20',
    high: 'bg-warn-50 text-warn ring-warn/20',
  };

  return (
    <section
      aria-labelledby="ai-summary"
      className="nx-rise relative mt-8 overflow-hidden rounded-2xl border border-accent-100 bg-gradient-to-br from-accent-50 via-white to-brand-50 p-5"
    >
      <h2 id="ai-summary" className="flex items-center gap-2 text-sm font-semibold text-accent-700">
        <span className="nx-pulse inline-block size-2 rounded-full text-accent" aria-hidden>
          <span className="block size-2 rounded-full bg-accent" />
        </span>
        <SparklesIcon size={16} /> AI summary
      </h2>
      {check && (
        <div className="mt-3 flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${tone[check.tone]}`}
          >
            <TrendingUpIcon size={18} />
          </span>
          <div>
            <p className="font-semibold text-ink">{check.text}</p>
            <p className="text-sm text-ink-muted">{check.detail}</p>
          </div>
        </div>
      )}
      {points.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {points.map((t, i) => (
            <li
              key={t}
              className="nx-rise inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-sm text-ink-soft ring-1 ring-line"
              style={{ '--i': i + 1 } as React.CSSProperties}
            >
              <BadgeCheckIcon size={14} className="text-accent-700" /> {t}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-muted">
        Worked out from this listing and live listings nearby. Always confirm before you decide.
      </p>
    </section>
  );
}
