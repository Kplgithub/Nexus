'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  ADMIN_PATH,
  POSTER_LABELS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  formatPrice,
  type AdminProperty,
} from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

function PropertiesList() {
  const params = useSearchParams();
  const { toast, can } = useAdmin();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [category, setCategory] = useState('');
  const [listingType, setListingType] = useState(params.get('listingType') ?? '');
  const [postedBy, setPostedBy] = useState(params.get('postedBy') ?? '');
  const userId = params.get('userId') ?? '';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(status && { status }),
    ...(category && { category }),
    ...(listingType && { listingType }),
    ...(postedBy && { postedBy }),
    ...(userId && { userId }),
    ...(query && { q: query }),
  });
  const { data, meta, loading, error, reload } = useApi<AdminProperty[]>(`/admin/properties?${qs}`);

  async function setPropertyStatus(p: AdminProperty, next: string) {
    try {
      await apiFetch(`/admin/properties/${p.id}/status`, {
        method: 'POST',
        body: { status: next },
      });
      toast(
        `“${p.title}” is now ${PROPERTY_STATUS_LABELS[next as AdminProperty['status']].toLowerCase()}`,
      );
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  async function toggleFeatured(p: AdminProperty) {
    try {
      await apiFetch(`/admin/properties/${p.id}`, {
        method: 'PATCH',
        body: { featured: !p.featured },
      });
      toast(p.featured ? 'Removed from featured' : 'Marked as featured');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  async function remove(p: AdminProperty) {
    if (
      !window.confirm(
        `Delete “${p.title}” permanently? This cannot be undone. Consider archiving instead.`,
      )
    )
      return;
    try {
      await apiFetch(`/admin/properties/${p.id}`, { method: 'DELETE' });
      toast('Property deleted');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  return (
    <>
      <PageTitle title="Properties">
        <Link href={`${ADMIN_PATH}/properties/import`} className="btn btn-outline">
          Import from sheet
        </Link>
        <Link href={`${ADMIN_PATH}/properties/new`} className="btn btn-primary">
          Add property
        </Link>
      </PageTitle>

      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_9rem_9rem_9rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <label className="sr-only" htmlFor="ap-q">
          Search
        </label>
        <input
          id="ap-q"
          className="field"
          placeholder="Search title, slug, locality or owner ref"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sr-only" htmlFor="ap-status">
          Status
        </label>
        <select
          id="ap-status"
          className="field"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {PROPERTY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROPERTY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="ap-deal">
          Deal
        </label>
        <select
          id="ap-deal"
          className="field"
          value={listingType}
          onChange={(e) => {
            setListingType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Sale and rent</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
        </select>
        <label className="sr-only" htmlFor="ap-poster">
          Posted by
        </label>
        <select
          id="ap-poster"
          className="field"
          value={postedBy}
          onChange={(e) => {
            setPostedBy(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Anyone</option>
          <option value="nexus">NEXUS team</option>
          <option value="users">Owners, agents, builders</option>
        </select>
        <label className="sr-only" htmlFor="ap-cat">
          Category
        </label>
        <select
          id="ap-cat"
          className="field"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </select>
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !data && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  No properties match.
                </td>
              </tr>
            )}
            {data?.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`${ADMIN_PATH}/properties/${p.id}`}
                    className="font-semibold hover:text-brand"
                  >
                    {p.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {p.locality.name}, {p.city.name} · {p.listingType === 'sale' ? 'Sale' : 'Rent'}{' '}
                    ·{' '}
                    {p.poster.type === 'nexus'
                      ? 'NEXUS'
                      : `${POSTER_LABELS[p.poster.type]}: ${p.poster.companyName || p.poster.name}`}
                    {p.featured && (
                      <span className="ml-2 rounded bg-accent-50 px-1.5 text-accent-700">
                        Featured
                      </span>
                    )}
                    {p.isDemo && (
                      <span className="ml-2 rounded bg-warn-50 px-1.5 text-warn">Demo</span>
                    )}
                    {p.listingVisibility === 'unlisted' && (
                      <span className="ml-2 rounded bg-surface px-1.5">Unlisted</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatPrice(p.price, p.listingType)}
                </td>
                <td className="px-4 py-3">
                  {p.enquiryCount ? (
                    <Link
                      className="text-brand hover:underline"
                      href={`${ADMIN_PATH}/enquiries?propertyId=${p.id}`}
                    >
                      {p.enquiryCount}
                    </Link>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {new Date(p.updatedAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link
                      href={`${ADMIN_PATH}/properties/${p.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </Link>
                    {p.status === 'pending' && (
                      <Link
                        href={`${ADMIN_PATH}/review#${p.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Review
                      </Link>
                    )}
                    {['published', 'rented', 'sold'].includes(p.status) && (
                      <a
                        href={`/properties/${p.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="btn btn-ghost btn-sm"
                      >
                        View
                      </a>
                    )}
                    {!['published', 'archived', 'pending'].includes(p.status) && !p.postedBy && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-success"
                        onClick={() => setPropertyStatus(p, 'published')}
                      >
                        Publish
                      </button>
                    )}
                    {p.status === 'published' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPropertyStatus(p, p.postedBy ? 'inactive' : 'draft')}
                        >
                          Unpublish
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setPropertyStatus(p, p.listingType === 'sale' ? 'sold' : 'rented')
                          }
                        >
                          {p.listingType === 'sale' ? 'Mark sold' : 'Mark rented'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleFeatured(p)}
                        >
                          {p.featured ? 'Unfeature' : 'Feature'}
                        </button>
                      </>
                    )}
                    {p.status !== 'archived' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPropertyStatus(p, 'archived')}
                      >
                        Archive
                      </button>
                    )}
                    {can('admin') && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => remove(p)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Page {meta.page} of {meta.totalPages} · {meta.total} properties
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense>
      <PropertiesList />
    </Suspense>
  );
}
