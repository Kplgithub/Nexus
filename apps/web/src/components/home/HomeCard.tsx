import Image from 'next/image';
import Link from 'next/link';
import {
  POSSESSION_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatPrice,
  type PropertyCard as Card,
} from '@nexus/shared';
import { ArrowRight, BadgeCheckIcon, ImageIcon } from '../icons';
import { DemoBadge } from '../ui';

/** Compact listing card for home page rails: photo, type, price and area, place, status. */
export function HomeCard({ p }: { p: Card }) {
  const type = p.bedrooms
    ? `${p.bedrooms} BHK ${PROPERTY_TYPE_LABELS[p.propertyType]}`
    : PROPERTY_TYPE_LABELS[p.propertyType];
  const status =
    p.listingType === 'rent'
      ? p.availableFrom && new Date(p.availableFrom) > new Date()
        ? `Available ${new Date(p.availableFrom).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}`
        : 'Available now'
      : p.possessionStatus
        ? POSSESSION_LABELS[p.possessionStatus]
        : null;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[16/11] overflow-hidden bg-surface">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.title}
            fill
            sizes="(min-width: 1280px) 240px, (min-width: 640px) 33vw, 70vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full place-items-center text-ink-muted">
            <ImageIcon size={28} />
          </span>
        )}
        <span className="absolute left-2 top-2 flex gap-1">
          {p.featured && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-ink">
              Featured
            </span>
          )}
          {p.isDemo && <DemoBadge />}
        </span>
        {p.imageCount > 0 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[0.7rem] font-medium text-white">
            <ImageIcon size={12} /> {p.imageCount}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-medium text-ink-soft">
          <Link
            href={`/properties/${p.slug}`}
            className="after:absolute after:inset-0 group-hover:text-brand"
          >
            {type}
          </Link>
        </h3>
        <p className="tabular mt-0.5 flex items-baseline gap-2 text-ink">
          <span className="text-base font-bold">{formatPrice(p.price, p.listingType)}</span>
          {p.areaValue ? (
            <span className="truncate border-l border-line pl-2 text-sm font-semibold text-ink-soft">
              {formatArea(p.areaValue, p.areaUnit)}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {p.locality.name}, {p.city.name}
        </p>
        <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs">
          <span className="truncate text-ink-soft">
            {status ?? (p.listingType === 'rent' ? 'For rent' : 'For sale')}
          </span>
          {p.verified ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-accent-700">
              <BadgeCheckIcon size={12} /> Verified
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}

/** Last slide of a rail: a link to the full list, so short rails still look complete. */
export function SeeAllCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-100 bg-brand-50/60 p-4 text-center text-brand transition-colors hover:bg-brand-50"
    >
      <span className="grid size-12 place-items-center rounded-full bg-white shadow-sm transition-transform group-hover:translate-x-0.5">
        <ArrowRight size={20} />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
