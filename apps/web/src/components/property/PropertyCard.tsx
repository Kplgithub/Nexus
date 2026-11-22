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
  type PropertyCard as Card,
} from '@nexus/shared';
import { BadgeCheckIcon, ChevronRight, ImageIcon, MapPinIcon } from '../icons';
import { DemoBadge } from '../ui';
import { SaveButton } from './SaveButton';
import { PartnerBadge, RefreshedChip, refreshedLabel } from './plan-perks';

/** One listing in a grid: photo first, then price, then the facts people scan for. */
export function PropertyCard({
  p,
  priority = false,
  headingLevel = 'h3',
  preview = false,
  index,
}: {
  p: Card;
  /** Position in a grid; staggers the entrance animation. */
  index?: number;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
  /** Editor preview: no link, no save button. */
  preview?: boolean;
}) {
  const H = headingLevel;
  const href = `/properties/${p.slug}`;
  const closed = p.status !== 'published';
  const updated = closed ? null : refreshedLabel(p.refreshedAt, p.publishedAt);
  const facts = [
    p.bedrooms ? `${p.bedrooms} BHK` : PROPERTY_TYPE_LABELS[p.propertyType],
    formatArea(p.areaValue, p.areaUnit),
    p.plotApproval && p.plotApproval !== 'none'
      ? PLOT_APPROVAL_LABELS[p.plotApproval]
      : p.pgGender
        ? PG_GENDER_LABELS[p.pgGender]
        : p.listingType === 'sale' && p.possessionStatus
          ? POSSESSION_LABELS[p.possessionStatus]
          : p.propertyType === 'plot'
            ? null
            : FURNISHING_LABELS[p.furnishingStatus],
  ].filter((x): x is string => Boolean(x));

  return (
    <article
      className={`nx-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white ${p.featured && !closed ? 'border-2 border-accent shadow-[0_10px_30px_rgba(249,115,22,0.18)]' : 'border-line'} ${index === undefined ? '' : 'nx-rise'}`}
      style={index === undefined ? undefined : ({ '--i': index } as React.CSSProperties)}
    >
      <div className="nx-shine relative aspect-[4/3] overflow-hidden bg-surface">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
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
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm backdrop-blur">
              {p.listingType === 'rent' ? 'For rent' : 'For sale'}
            </span>
            {p.featured && !closed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-orange-400 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
                  <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
                </svg>
                Featured
              </span>
            )}
            {p.partnerBadge && !closed && <PartnerBadge />}
            {closed && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                {p.status === 'sold' ? 'Sold' : 'Rented out'}
              </span>
            )}
          </div>
          {!preview && (
            <div className="pointer-events-auto">
              <SaveButton propertyId={p.id} title={p.title} />
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          {p.isDemo ? <DemoBadge /> : <span />}
          <span className="flex items-center gap-1.5">
            {p.imageCount > 1 && (
              <span className="rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur transition-opacity group-hover:opacity-0">
                {p.imageCount} photos
              </span>
            )}
            {!preview && (
              <span className="absolute bottom-3 right-3 inline-flex translate-y-3 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800 opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                View details <ChevronRight size={14} />
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular text-[1.375rem] font-bold leading-none tracking-tight text-ink">
            {formatPrice(p.price, p.listingType)}
          </p>
          {p.pricePerSqft && (
            <p className="tabular shrink-0 text-xs text-ink-muted">
              {formatINR(p.pricePerSqft)}/sq ft
            </p>
          )}
        </div>
        <H className="mt-2 line-clamp-2 text-[1.0625rem] font-semibold leading-snug text-ink">
          {preview ? (
            p.title
          ) : (
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-focus-within:underline group-hover:text-brand"
            >
              {p.title}
            </Link>
          )}
        </H>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPinIcon size={15} className="shrink-0" />
          <span className="truncate">
            {p.projectName ? `${p.projectName}, ` : ''}
            {p.locality.name}, {p.city.name}
          </span>
        </p>
        {updated && (
          <p className="mt-2">
            <RefreshedChip label={updated} />
          </p>
        )}
        <ul className="mb-3 mt-3 flex flex-wrap gap-1.5 text-[0.8125rem] text-ink-soft">
          {facts.map((f) => (
            <li key={f} className="rounded-md bg-brand-50/70 px-2 py-1">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-auto flex items-center gap-1 border-t border-line pt-3 text-xs text-ink-muted">
          {p.verified && (
            <span className="inline-flex items-center gap-1 font-semibold text-accent-700">
              <BadgeCheckIcon size={14} /> Verified
            </span>
          )}
          <span className={p.verified ? 'ml-1.5 border-l border-line pl-1.5' : ''}>
            {p.posterType === 'nexus'
              ? 'Listed by NEXUS Estate'
              : `Posted by ${POSTER_LABELS[p.posterType].toLowerCase()}`}
          </span>
        </p>
      </div>
    </article>
  );
}

export function PropertyGrid({
  items,
  headingLevel = 'h3',
  priorityCount = 0,
  columns = 3,
}: {
  items: Card[];
  headingLevel?: 'h2' | 'h3';
  priorityCount?: number;
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : columns === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 xl:grid-cols-3';
  return (
    <ul className={`grid gap-5 ${cols}`}>
      {items.map((p, i) => (
        <li key={p.id}>
          <PropertyCard p={p} priority={i < priorityCount} headingLevel={headingLevel} index={i} />
        </li>
      ))}
    </ul>
  );
}

export function PropertyGridSkeleton({
  count = 6,
  className = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={className} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-line">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}
