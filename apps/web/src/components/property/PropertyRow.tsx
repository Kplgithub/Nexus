import Image from 'next/image';
import Link from 'next/link';
import {
  FURNISHING_LABELS,
  PG_GENDER_LABELS,
  PLOT_APPROVAL_LABELS,
  POSSESSION_LABELS,
  POSTER_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatINR,
  formatPrice,
  whatsappLink,
  type PropertyCard as Card,
} from '@nexus/shared';
import { absoluteUrl } from '@/lib/site';
import { BadgeCheckIcon, ImageIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '../icons';
import { DemoBadge } from '../ui';
import { SaveButton } from './SaveButton';

function postedAgo(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Posted ${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/**
 * One listing as a wide row (photo left, facts middle, price and contact
 * right), the way the big portals show search results on desktop.
 */
export function PropertyRow({
  p,
  index = 0,
  priority = false,
  whatsapp,
}: {
  p: Card;
  index?: number;
  priority?: boolean;
  whatsapp?: string;
}) {
  const href = `/properties/${p.slug}`;
  const closed = p.status !== 'published';
  const isSale = p.listingType === 'sale';
  const facts: [string, string][] = [
    [p.propertyType === 'plot' ? 'Plot area' : 'Area', formatArea(p.areaValue, p.areaUnit)],
  ];
  if (p.bedrooms) facts.push(['Bedrooms', `${p.bedrooms} BHK`]);
  if (p.bathrooms) facts.push(['Bathrooms', String(p.bathrooms)]);
  if (p.propertyType !== 'plot') facts.push(['Furnishing', FURNISHING_LABELS[p.furnishingStatus]]);
  if (isSale && p.possessionStatus) facts.push(['Status', POSSESSION_LABELS[p.possessionStatus]]);
  if (p.plotApproval && p.plotApproval !== 'none')
    facts.push(['Approval', PLOT_APPROVAL_LABELS[p.plotApproval]]);
  if (p.pgGender) facts.push(['For', PG_GENDER_LABELS[p.pgGender]]);
  const poster =
    p.posterType === 'nexus' ? 'NEXUS Estate' : POSTER_LABELS[p.posterType].toLowerCase();

  return (
    <article
      className="nx-rise nx-lift group relative grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-[17rem_1fr] xl:grid-cols-[18rem_1fr_13rem]"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="nx-shine relative aspect-[4/3] overflow-hidden bg-surface sm:aspect-auto sm:min-h-[14rem]">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.title}
            fill
            priority={priority}
            sizes="(min-width: 640px) 288px, 100vw"
            className={`object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08] ${closed ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">
            <ImageIcon size={36} />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {p.featured && !closed && (
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm">
                Featured
              </span>
            )}
            {closed && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                {p.status === 'sold' ? 'Sold' : 'Rented out'}
              </span>
            )}
          </div>
          <div className="pointer-events-auto relative z-10">
            <SaveButton propertyId={p.id} title={p.title} />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-3 pt-10">
          {p.isDemo ? <DemoBadge /> : <span />}
          {p.imageCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
              <ImageIcon size={13} /> {p.imageCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-brand">
            {PROPERTY_TYPE_LABELS[p.propertyType]} · For {isSale ? 'sale' : 'rent'}
          </span>
          {p.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700">
              <BadgeCheckIcon size={13} /> Verified
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-ink">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-hover:text-brand"
          >
            {p.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPinIcon size={15} className="shrink-0" />
          <span className="truncate">
            {p.projectName ? `${p.projectName}, ` : ''}
            {p.locality.name}, {p.city.name}
          </span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface/70 p-3 sm:grid-cols-3">
          {facts.slice(0, 6).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[0.7rem] uppercase tracking-wide text-ink-muted">{k}</dt>
              <dd className="truncate text-sm font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-auto pt-3 text-xs text-ink-muted">
          {[postedAgo(p.publishedAt), `By ${poster}`].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="relative flex flex-row items-center justify-between gap-3 border-t border-line p-4 sm:col-span-2 xl:col-span-1 xl:flex-col xl:items-stretch xl:justify-center xl:border-l xl:border-t-0 xl:bg-gradient-to-b xl:from-brand-50/60 xl:to-white">
        <div>
          <p className="tabular text-2xl font-bold leading-none tracking-tight text-ink">
            {formatPrice(p.price, p.listingType)}
          </p>
          {p.pricePerSqft ? (
            <p className="tabular mt-1 text-xs text-ink-muted">
              {formatINR(p.pricePerSqft)} per sq ft
            </p>
          ) : null}
        </div>
        {!closed && (
          <div className="relative z-10 flex gap-2 xl:mt-4 xl:flex-col">
            <Link href={`${href}#contact`} className="btn btn-primary btn-sm">
              <PhoneIcon size={15} /> Contact {p.posterType === 'nexus' ? 'us' : poster}
            </Link>
            {whatsapp && (
              <a
                href={whatsappLink(
                  whatsapp,
                  `Hi, I'm interested in "${p.title}" (${absoluteUrl(href)})`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                aria-label="WhatsApp us about this property"
              >
                <WhatsAppIcon size={15} /> <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function PropertyList({
  items,
  priorityCount = 0,
  whatsapp,
}: {
  items: Card[];
  priorityCount?: number;
  whatsapp?: string;
}) {
  return (
    <ul className="space-y-4">
      {items.map((p, i) => (
        <li key={p.id}>
          <PropertyRow p={p} index={i} priority={i < priorityCount} whatsapp={whatsapp} />
        </li>
      ))}
    </ul>
  );
}
