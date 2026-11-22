'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  PROPERTY_STATUS_LABELS,
  SITE_SECTION_INFO,
  PROPERTY_TYPE_LABELS,
  formatPrice,
  type OwnListing,
  type PropertyStatus,
} from '@nexus/shared';
import { errMsg, useApi } from '@/components/admin/useApi';
import { Pill, SectionTitle } from '@/components/dashboard/DashboardShell';
import { EditIcon, EyeIcon, ImageIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { apiFetch } from '@/lib/client-api';
import { POST_PROPERTY_PATH } from '@/lib/site';

const TABS: { id: string; label: string; statuses?: PropertyStatus[] }[] = [
  { id: '', label: 'All' },
  { id: 'published', label: 'Live' },
  { id: 'pending', label: 'In review' },
  { id: 'draft', label: 'Drafts' },
  { id: 'rejected', label: 'Needs changes' },
  { id: 'closed', label: 'Closed', statuses: ['rented', 'sold', 'inactive'] },
];

const featuredNow = (p: OwnListing) =>
  p.status === 'published' && !!p.featuredUntil && new Date(p.featuredUntil) > new Date();
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Listings() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('status') ?? '';
  const planFull = params.get('full') === '1';
  const { data, error, loading, reload } = useApi<OwnListing[]>('/me/properties');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const items = (data ?? []).filter((p) =>
    !current.id
      ? true
      : current.statuses
        ? current.statuses.includes(p.status)
        : p.status === current.id,
  );
  const count = (t: (typeof TABS)[number]) =>
    (data ?? []).filter((p) =>
      !t.id ? true : t.statuses ? t.statuses.includes(p.status) : p.status === t.id,
    ).length;

  async function act(p: OwnListing, action: PropertyStatus | 'delete', done: string) {
    if (action === 'delete' && !window.confirm(`Delete “${p.title}”? This cannot be undone.`))
      return;
    setBusy(p.id);
    setMessage(null);
    try {
      if (action === 'delete') await apiFetch(`/me/properties/${p.id}`, { method: 'DELETE' });
      else {
        const { data: next } = await apiFetch<OwnListing>(`/me/properties/${p.id}/status`, {
          method: 'POST',
          body: { status: action },
        });
        // No free listing left and no plan: send them to take one.
        if (next.awaitingPlan) {
          router.push(`/dashboard/plans?saved=${p.id}`);
          return;
        }
      }
      setMessage({ kind: 'ok', text: done });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: errMsg(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionTitle title="My listings" text="Everything you have posted, with its review status.">
        <Link href={POST_PROPERTY_PATH} className="btn btn-outline btn-sm">
          <PlusIcon size={16} /> New listing
        </Link>
      </SectionTitle>

      {planFull && (
        <p role="status" className="mb-5 rounded-xl border border-warn/30 bg-warn-50 p-4 text-sm">
          <b>All the live places in your plan are in use.</b> We saved this listing in Drafts. Mark
          an old listing as sold, rented or inactive, then send this one for review.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Filter listings"
        className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id || 'all'}
            role="tab"
            type="button"
            aria-selected={current.id === t.id}
            onClick={() =>
              router.replace(t.id ? `/dashboard/listings?status=${t.id}` : '/dashboard/listings')
            }
            className={`chip shrink-0 ${current.id === t.id ? 'chip-active' : ''}`}
          >
            {t.label}
            {data && <span className="tabular opacity-70">{count(t)}</span>}
          </button>
        ))}
      </div>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg p-3 text-sm ${message.kind === 'error' ? 'bg-danger-50 text-danger' : 'bg-success-50 text-success'}`}
        >
          {message.text}
        </p>
      )}
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && !data && <div className="skeleton h-40" />}

      {data && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-semibold">
            {data.length ? 'Nothing here' : 'You haven’t posted anything yet'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {data.length ? 'Try another tab.' : 'Post a property for sale or rent — it’s free.'}
          </p>
          {!data.length && (
            <Link href={POST_PROPERTY_PATH} className="btn btn-primary mt-5">
              Post a property
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-4">
        {items.map((p) => {
          const cover = p.images[p.coverImageIndex] ?? p.images[0];
          const live = p.status === 'published';
          const closed = ['rented', 'sold', 'archived'].includes(p.status);
          return (
            <li
              key={p.id}
              className={`overflow-hidden rounded-2xl border bg-white ${featuredNow(p) ? 'border-2 border-accent' : 'border-line'}`}
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                  {cover ? (
                    <Image src={cover.url} alt="" fill sizes="160px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-ink-muted">
                      <ImageIcon size={28} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.awaitingPlan ? (
                      <Pill status="pending" label="Waiting for plan" />
                    ) : (
                      <Pill status={p.status} label={PROPERTY_STATUS_LABELS[p.status]} />
                    )}
                    {featuredNow(p) && (
                      <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-700">
                        ⚡ Featured till {shortDate(p.featuredUntil!)}
                      </span>
                    )}
                    <span className="text-xs text-ink-muted">
                      {p.listingType === 'sale' ? 'For sale' : 'For rent'} ·{' '}
                      {PROPERTY_TYPE_LABELS[p.propertyType]}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate font-sans text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm text-ink-muted">
                    {p.locality.name}, {p.city.name}
                  </p>
                  <p className="tabular mt-1 font-semibold text-brand-900">
                    {formatPrice(p.price, p.listingType)}
                  </p>
                  {live && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {p.views ?? 0} views · {p.enquiryCount}{' '}
                      {p.enquiryCount === 1 ? 'lead' : 'leads'}
                    </p>
                  )}
                </div>
              </div>

              {p.sectionOff && (
                <p className="mx-4 mb-4 rounded-lg bg-surface p-3 text-sm text-ink-soft">
                  <strong>{SITE_SECTION_INFO[p.sectionOff].label} listings are paused</strong> on
                  NEXUS Estate for now, so this listing is hidden from the website. It is not
                  deleted and shows again as soon as the section reopens.
                </p>
              )}
              {p.status === 'rejected' && p.moderationNote && (
                <p className="mx-4 mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
                  <strong>What to fix:</strong> {p.moderationNote}
                </p>
              )}
              {p.awaitingPlan && (
                <p className="mx-4 mb-4 rounded-lg bg-warn-50 p-3 text-sm text-warn">
                  This listing is saved. Take Premium to send it for review.{' '}
                  <Link href={`/dashboard/plans?saved=${p.id}`} className="font-semibold underline">
                    See plan
                  </Link>
                </p>
              )}
              {p.status === 'pending' && (
                <p className="mx-4 mb-4 rounded-lg bg-accent-50 p-3 text-sm text-accent-700">
                  Our team is reviewing this listing. Its status will change here once it has been
                  checked.
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-line bg-surface/60 px-4 py-3">
                {!closed && (
                  <Link href={`/dashboard/listings/${p.id}`} className="btn btn-outline btn-sm">
                    <EditIcon size={15} /> Edit
                  </Link>
                )}
                {live && (
                  <Link href={`/properties/${p.slug}`} className="btn btn-ghost btn-sm">
                    <EyeIcon size={15} /> View
                  </Link>
                )}
                {p.awaitingPlan && (
                  <Link href={`/dashboard/plans?saved=${p.id}`} className="btn btn-accent btn-sm">
                    Take Premium to publish
                  </Link>
                )}
                {live && (
                  <Link
                    href={`/dashboard/feature?listing=${p.id}`}
                    className="btn btn-accent btn-sm"
                  >
                    ⚡ Feature
                  </Link>
                )}
                {!p.awaitingPlan &&
                  (p.status === 'draft' || p.status === 'rejected' || p.status === 'inactive') && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy === p.id}
                      onClick={() => act(p, 'pending', 'Submitted for review')}
                    >
                      Submit for review
                    </button>
                  )}
                {live && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy === p.id}
                      onClick={() =>
                        act(
                          p,
                          p.listingType === 'sale' ? 'sold' : 'rented',
                          p.listingType === 'sale' ? 'Marked as sold' : 'Marked as rented',
                        )
                      }
                    >
                      {p.listingType === 'sale' ? 'Mark as sold' : 'Mark as rented'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy === p.id}
                      onClick={() => act(p, 'inactive', 'Listing hidden')}
                    >
                      Hide
                    </button>
                  </>
                )}
                {p.status === 'rented' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy === p.id}
                    onClick={() => act(p, 'pending', 'Re-submitted for review')}
                  >
                    Available again
                  </button>
                )}
                {p.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy === p.id}
                    onClick={() => act(p, 'draft', 'Moved back to drafts')}
                  >
                    Withdraw
                  </button>
                )}
                {!live && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto text-danger"
                    disabled={busy === p.id}
                    onClick={() => act(p, 'delete', 'Listing deleted')}
                  >
                    <TrashIcon size={15} /> Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense>
      <Listings />
    </Suspense>
  );
}
