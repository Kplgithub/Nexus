import Image from 'next/image';
import Link from 'next/link';
import {
  FURNISHING_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatRent,
  type PropertyCard as Card,
} from '@nexus/shared';
import { AreaIcon, BathIcon, BedIcon, ImageIcon, MapPinIcon, SofaIcon } from '../icons';
import { DemoBadge } from '../ui';

export function PropertyCard({
  p,
  priority = false,
  headingLevel = 'h3',
}: {
  p: Card;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const H = headingLevel;
  const href = `/properties/${p.slug}`;
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">
            <ImageIcon size={36} />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-brand-800 shadow-sm">
            {p.category === 'residential'
              ? 'Residential'
              : p.category === 'commercial'
                ? 'Commercial'
                : 'Industrial'}
          </span>
          {p.featured && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-ink shadow-sm">
              Featured
            </span>
          )}
          {p.status === 'rented' && (
            <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">
              Rented
            </span>
          )}
        </div>
        {p.isDemo && <DemoBadge className="absolute bottom-3 left-3" />}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xl font-bold text-brand-800">{formatRent(p.monthlyRent)}</p>
        <H className="mt-1.5 line-clamp-2 text-[1.0625rem] font-semibold leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.title}
          </Link>
        </H>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPinIcon size={16} className="shrink-0" />
          <span className="truncate">
            {p.locality.name}, {p.city.name}
          </span>
        </p>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm text-ink-soft">
          <li className="font-medium text-ink">{PROPERTY_TYPE_LABELS[p.propertyType]}</li>
          {p.bedrooms !== null && p.bedrooms > 0 && (
            <li className="flex items-center gap-1.5">
              <BedIcon size={17} /> {p.bedrooms} BHK
            </li>
          )}
          {p.bathrooms !== null && p.bathrooms > 0 && (
            <li className="flex items-center gap-1.5">
              <BathIcon size={17} /> {p.bathrooms} Bath
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <AreaIcon size={17} /> {formatArea(p.areaValue, p.areaUnit)}
          </li>
          <li className="flex items-center gap-1.5">
            <SofaIcon size={17} /> {FURNISHING_LABELS[p.furnishingStatus]}
          </li>
        </ul>
      </div>
    </article>
  );
}

export function PropertyGrid({
  items,
  headingLevel = 'h3',
  priorityCount = 0,
}: {
  items: Card[];
  headingLevel?: 'h2' | 'h3';
  priorityCount?: number;
}) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <PropertyCard p={p} priority={i < priorityCount} headingLevel={headingLevel} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton mt-4 h-4 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
