'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ADMIN_PATH,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  formatIndianPhone,
  formatPriceRange,
  type AdminProject,
} from '@nexus/shared';
import { PageTitle, StatusPill } from '@/components/admin/AdminShell';
import { ModerationBar } from '@/components/admin/PropertyEditor';
import { useApi } from '@/components/admin/useApi';

/** Builders' projects. Pending ones show approve / reject right in the list. */
export default function AdminProjectsPage() {
  const [status, setStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) qs.set('status', status);
  const { data, meta, loading, error, reload } = useApi<AdminProject[]>(`/admin/projects?${qs}`);

  return (
    <>
      <PageTitle title="Projects" />
      <div role="tablist" aria-label="Status" className="mb-6 flex flex-wrap gap-1">
        {['', ...PROJECT_STATUSES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            role="tab"
            aria-selected={status === s}
            className={`chip ${status === s ? 'chip-active' : ''}`}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s ? PROJECT_STATUS_LABELS[s as keyof typeof PROJECT_STATUS_LABELS] : 'All'}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card p-10 text-center text-ink-muted">No projects here.</div>
      )}
      <ul className="space-y-4">
        {(data ?? []).map((p) => (
          <li key={p.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusPill status={p.status} />
                  <span className="text-sm text-ink-muted">
                    {p.locality.name}, {p.city.name}
                  </span>
                </div>
                <h2 className="mt-1 font-sans text-lg font-semibold">
                  <Link href={`${ADMIN_PATH}/projects/${p.id}`} className="hover:text-brand">
                    {p.name}
                  </Link>
                </h2>
                <p className="text-sm text-ink-soft">
                  {formatPriceRange(p.priceRange.min, p.priceRange.max)} ·{' '}
                  {p.configurations.map((c) => c.label).join(', ')} · {p.images.length} photos
                  {p.reraId ? ` · RERA ${p.reraId}` : ' · No RERA number'}
                </p>
                {p.builder && (
                  <p className="mt-1 text-sm">
                    <Link
                      href={`${ADMIN_PATH}/users/${p.builder.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {p.builder.name}
                    </Link>{' '}
                    <span className="text-ink-muted">
                      {formatIndianPhone(p.builder.phone)} · {p.builder.email}
                    </span>
                  </p>
                )}
              </div>
              <Link href={`${ADMIN_PATH}/projects/${p.id}`} className="btn btn-outline btn-sm">
                Open
              </Link>
            </div>
            {p.status === 'pending' && (
              <div className="border-t border-line p-4">
                <ModerationBar
                  property={{ id: p.id, title: p.name }}
                  basePath="/admin/projects"
                  onDone={reload}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {meta.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
