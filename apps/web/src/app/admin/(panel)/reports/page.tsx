'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  type ListingReport,
  type ReportStatus,
} from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { useApi } from '@/components/admin/useApi';
import { ApiClientError, apiFetch } from '@/lib/client-api';

/** Visitors' reports about listings (already rented, fake, broker posing as owner…). */
export default function ReportsPage() {
  const { toast } = useAdmin();
  const [status, setStatus] = useState<ReportStatus | ''>('open');
  const { data, loading, error, reload } = useApi<ListingReport[]>(
    `/admin/reports?limit=50${status ? `&status=${status}` : ''}`,
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(r: ListingReport, next: ReportStatus) {
    const note =
      next === 'open' ? undefined : (window.prompt('Note for the record (optional)') ?? undefined);
    setBusy(r.id);
    try {
      await apiFetch(`/admin/reports/${r.id}`, { method: 'PATCH', body: { status: next, note } });
      toast(
        next === 'resolved' ? 'Marked resolved' : next === 'dismissed' ? 'Dismissed' : 'Reopened',
      );
      reload();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : 'Could not update', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle title="Listing reports" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-muted">
        Check the listing and call the poster. If the report is right, edit or close the listing,
        then mark the report resolved.
      </p>
      <div role="tablist" aria-label="Status" className="mb-6 flex gap-1">
        {(['', ...REPORT_STATUSES] as const).map((s) => (
          <button
            key={s || 'all'}
            type="button"
            role="tab"
            aria-selected={status === s}
            className={`chip capitalize ${status === s ? 'chip-active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s || 'All'}
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
        <div className="card p-10 text-center text-ink-muted">No reports here.</div>
      )}
      <ul className="space-y-3">
        {(data ?? []).map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusPill status={r.status} />
                  <span className="font-semibold">{REPORT_REASON_LABELS[r.reason]}</span>
                </div>
                {r.property ? (
                  <p className="mt-1 text-sm">
                    <Link
                      href={`/admin/properties/${r.property.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {r.property.title}
                    </Link>{' '}
                    ·{' '}
                    <Link
                      href={`/properties/${r.property.slug}`}
                      target="_blank"
                      className="text-ink-muted hover:underline"
                    >
                      public page
                    </Link>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-muted">Listing deleted</p>
                )}
                {r.details && (
                  <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{r.details}</p>
                )}
                <p className="mt-2 text-xs text-ink-muted">
                  {r.reporter.name ? `By ${r.reporter.name} · ` : 'Anonymous · '}
                  {new Date(r.createdAt).toLocaleString('en-IN')}
                  {r.note ? ` · Note: ${r.note}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status === 'open' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy === r.id}
                      onClick={() => void decide(r, 'dismissed')}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy === r.id}
                      onClick={() => void decide(r, 'resolved')}
                    >
                      Resolved
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy === r.id}
                    onClick={() => void decide(r, 'open')}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
