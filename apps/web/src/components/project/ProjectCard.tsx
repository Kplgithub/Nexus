import Image from 'next/image';
import Link from 'next/link';
import { PROJECT_STAGE_LABELS, formatPriceRange, type ProjectCard as Card } from '@nexus/shared';
import { BadgeCheckIcon, BuildingIcon, MapPinIcon } from '../icons';

/** One new project in a grid: photo, price range, unit mix and builder. */
export function ProjectCard({
  p,
  priority = false,
  headingLevel = 'h3',
}: {
  p: Card;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const H = headingLevel;
  const possession =
    p.stage !== 'ready-to-move' && p.possessionDate
      ? `Possession ${new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
      : null;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={p.coverImage.alt || p.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">
            <BuildingIcon size={36} />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm">
            {PROJECT_STAGE_LABELS[p.stage]}
          </span>
          {p.featured && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand-900 shadow-sm">
              Featured
            </span>
          )}
          {p.reraId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-accent-700 shadow-sm">
              <BadgeCheckIcon size={13} /> RERA
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <p className="tabular text-[1.375rem] font-bold leading-none tracking-tight text-ink">
          {formatPriceRange(p.priceRange.min, p.priceRange.max)}
        </p>
        <H className="mt-2 line-clamp-2 text-[1.0625rem] font-semibold leading-snug text-ink">
          <Link
            href={`/projects/${p.slug}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-focus-within:underline"
          >
            {p.name}
          </Link>
        </H>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPinIcon size={15} className="shrink-0" />
          <span className="truncate">
            {p.locality.name}, {p.city.name}
          </span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-[0.8125rem] text-ink-soft">
          {[p.unitSummary, possession].filter(Boolean).map((f) => (
            <li key={f} className="rounded-md bg-surface px-2 py-1">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-3 text-xs text-ink-muted">By {p.builderName}</p>
      </div>
    </article>
  );
}

export function ProjectGrid({
  items,
  headingLevel = 'h3',
  priorityCount = 0,
}: {
  items: Card[];
  headingLevel?: 'h2' | 'h3';
  priorityCount?: number;
}) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProjectCard p={p} priority={i < priorityCount} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
