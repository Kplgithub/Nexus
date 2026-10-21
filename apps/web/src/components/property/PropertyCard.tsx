import Image from 'next/image';
import Link from 'next/link';
import {
  FURNISHING_LABELS,
  POSSESSION_LABELS,
  POSTER_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatINR,
  formatPrice,
  type PropertyCard as Card,
} from '@nexus/shared';
import { BadgeCheckIcon, ImageIcon, MapPinIcon } from '../icons';
import { DemoBadge } from '../ui';
import { SaveButton } from './SaveButton';

/** One listing in a grid: photo first, then price, then the facts people scan for. */
export function PropertyCard({
  p,
  priority = false,
  headingLevel = 'h3',
  preview = false,
}: {
  p: Card;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
  /** Editor preview: no link, no save button. */
  preview?: boolean;
}) {
  const H = headingLevel;
  const href = `/properties/${p.slug}`;
  const closed = p.status !== 'published';
  const facts = [
    p.bedrooms ? `${p.bedrooms} BHK` : PROPERTY_TYPE_LABELS[p.propertyType],
    formatArea(p.areaValue, p.areaUnit),
    p.listingType === 'sale' && p.possessionStatus
      ? POSSESSION_LABELS[p.possessionStatus]
      : FURNISHING_LABELS[p.furnishingStatus],
  ];

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-transform duration-700 group-hover:scale-[1.04] ${closed ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">
            <ImageIcon size={36} />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm">
              {p.listingType === 'rent' ? 'For rent' : 'For sale'}
            </span>
            {p.featured && !closed && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand-900 shadow-sm">
                Featured
              </span>
            )}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          {p.isDemo ? <DemoBadge /> : <span />}
          {p.imageCount > 1 && (
            <span className="rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
              {p.imageCount} photos
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
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
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-focus-within:underline"
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
        <ul className="mt-3 flex flex-wrap gap-1.5 text-[0.8125rem] text-ink-soft">
          {facts.map((f) => (
            <li key={f} className="rounded-md bg-surface px-2 py-1">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-auto flex items-center gap-1 pt-3 text-xs text-ink-muted">
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
    <ul className={`grid gap-x-6 gap-y-10 ${cols}`}>
      {items.map((p, i) => (
        <li key={p.id}>
          <PropertyCard p={p} priority={i < priorityCount} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="skeleton aspect-[4/3] rounded-xl" />
          <div className="space-y-3 pt-4">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}
