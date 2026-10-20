'use client';

import { useState } from 'react';
import {
  PROPERTY_TYPE_LABELS,
  SUBMISSION_STATUSES,
  formatINR,
  type PropertySubmission,
} from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

export default function SubmissionsPage() {
  const { toast } = useAdmin();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), ...(status && { status }) });
  const { data, meta, error, loading, reload } = useApi<PropertySubmission[]>(
    `/admin/submissions?${qs}`,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function patch(id: string, body: Record<string, unknown>, msg: string) {
    try {
      await apiFetch(`/admin/submissions/${id}`, { method: 'PATCH', body });
      toast(msg);
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  return (
    <>
      <PageTitle title="Owner submissions">
        <label className="sr-only" htmlFor="sub-status">
          Status
        </label>
        <select
          id="sub-status"
          className="field w-48"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All (except spam)</option>
          {SUBMISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </PageTitle>
      <p className="mb-4 text-sm text-ink-muted">
        Requests from the “List your property” form. Call the owner, then create the listing under
        Properties and mark the request converted.
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data?.length === 0 && (
        <p className="card p-8 text-center text-ink-muted">No submissions yet.</p>
      )}
      <ul className="space-y-4">
        {data?.map((s) => (
          <li key={s.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {s.ownerName}{' '}
                  <span className="font-normal text-ink-muted">({s.relationship})</span>
                </p>
                <p className="text-sm">
                  <a className="text-brand underline" href={`tel:${s.phone}`}>
                    {s.phone}
                  </a>
                  {s.email && (
                    <>
                      {' '}
                      ·{' '}
                      <a className="text-brand underline" href={`mailto:${s.email}`}>
                        {s.email}
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {s.leadId} · {new Date(s.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={s.status} />
                <select
                  aria-label="Change status"
                  className="field w-40 text-sm"
                  value={s.status}
                  onChange={(e) => patch(s.id, { status: e.target.value }, 'Status updated')}
                >
                  {SUBMISSION_STATUSES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="inline text-ink-muted">Type: </dt>
                <dd className="inline">
                  {PROPERTY_TYPE_LABELS[s.propertyType]} ({s.category})
                </dd>
              </div>
              <div>
                <dt className="inline text-ink-muted">Location: </dt>
                <dd className="inline">
                  {s.locality}, {s.city}
                </dd>
              </div>
              {s.expectedRent !== null && (
                <div>
                  <dt className="inline text-ink-muted">Expected rent: </dt>
                  <dd className="inline">{formatINR(s.expectedRent)}</dd>
                </div>
              )}
              {s.areaValue !== null && (
                <div>
                  <dt className="inline text-ink-muted">Area: </dt>
                  <dd className="inline">
                    {s.areaValue} {s.areaUnit}
                  </dd>
                </div>
              )}
              {s.bedrooms !== null && (
                <div>
                  <dt className="inline text-ink-muted">Bedrooms: </dt>
                  <dd className="inline">{s.bedrooms}</dd>
                </div>
              )}
              {s.furnishingStatus && (
                <div>
                  <dt className="inline text-ink-muted">Furnishing: </dt>
                  <dd className="inline">{s.furnishingStatus}</dd>
                </div>
              )}
              {s.availableFrom && (
                <div>
                  <dt className="inline text-ink-muted">Available: </dt>
                  <dd className="inline">
                    {new Date(s.availableFrom).toLocaleDateString('en-IN')}
                  </dd>
                </div>
              )}
            </dl>
            {s.description && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-surface p-3 text-sm">
                {s.description}
              </p>
            )}
            {s.notes.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {s.notes.map((n, i) => (
                  <li key={i} className="text-ink-soft">
                    “{n.text}” — {n.by}, {new Date(n.at).toLocaleDateString('en-IN')}
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = notes[s.id]?.trim();
                if (text)
                  void patch(s.id, { note: text }, 'Note added').then(() =>
                    setNotes((n) => ({ ...n, [s.id]: '' })),
                  );
              }}
            >
              <label className="sr-only" htmlFor={`note-${s.id}`}>
                Note
              </label>
              <input
                id={`note-${s.id}`}
                className="field text-sm"
                placeholder="Add a private note"
                value={notes[s.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              />
              <button type="submit" className="btn btn-outline btn-sm">
                Add
              </button>
            </form>
          </li>
        ))}
      </ul>
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
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
      )}
    </>
  );
}
