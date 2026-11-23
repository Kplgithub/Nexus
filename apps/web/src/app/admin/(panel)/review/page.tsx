'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ADMIN_PATH,
  POSTER_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatIndianPhone,
  formatPrice,
  type AdminProperty,
} from '@nexus/shared';
import { PageTitle } from '@/components/admin/AdminShell';
import { ModerationBar } from '@/components/admin/PropertyEditor';
import { useApi } from '@/components/admin/useApi';

/** Listings submitted by owners, agents and builders, oldest first. */
export default function ReviewQueuePage() {
  const { data, loading, error, reload } = useApi<AdminProperty[]>(
    '/admin/properties?status=pending&postedBy=users&limit=50',
  );
  const items = data ? [...data].reverse() : [];

  return (
    <>
      <PageTitle title="Review queue" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-muted">
        Check each listing for accurate price, photos, location and contact details before
        approving. Rejected listings go back to the poster with your note.
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data && items.length === 0 && (
        <div className="card p-10 text-center text-ink-muted">Nothing waiting for review.</div>
      )}
      <ul className="space-y-5">
        {items.map((p) => (
          <li key={p.id} id={p.id} className="card overflow-hidden">
            <div className="grid gap-5 p-5 md:grid-cols-[14rem_1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface">
                {p.coverImage && (
                  <Image
                    src={p.coverImage.url}
                    alt=""
                    fill
                    sizes="224px"
                    className="object-cover"
                  />
                )}
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 text-xs text-white">
                  {p.images.length} {p.images.length === 1 ? 'photo' : 'photos'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">
                  {p.listingType === 'sale' ? 'For sale' : 'For rent'} ·{' '}
                  {PROPERTY_TYPE_LABELS[p.propertyType]} · {p.locality.name}, {p.city.name}
                </p>
                <h2 className="mt-1 font-sans text-lg font-semibold">
                  <Link href={`${ADMIN_PATH}/properties/${p.id}`} className="hover:text-brand">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-1 font-semibold text-brand-900">
                  {formatPrice(p.price, p.listingType)}{' '}
                  <span className="font-normal text-ink-muted">
                    · {formatArea(p.areaValue, p.areaUnit)}
                    {p.bedrooms !== null ? ` · ${p.bedrooms} BHK` : ''}
                  </span>
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{p.description}</p>
                {p.postedBy && (
                  <p className="mt-3 text-sm">
                    <span className="text-ink-muted">{POSTER_LABELS[p.poster.type]}:</span>{' '}
                    <Link
                      href={`${ADMIN_PATH}/users/${p.postedBy.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {p.poster.companyName
                        ? `${p.poster.companyName} (${p.postedBy.name})`
                        : p.postedBy.name}
                    </Link>{' '}
                    <span className="text-ink-muted">{formatIndianPhone(p.postedBy.phone)}</span>
                  </p>
                )}
                {p.reraId && <p className="mt-1 text-sm text-ink-muted">RERA: {p.reraId}</p>}
                <p className="mt-1 text-xs text-ink-muted">
                  Submitted {new Date(p.updatedAt).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="border-t border-line p-4">
              <ModerationBar property={p} onDone={reload} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
