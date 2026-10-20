'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ENQUIRY_STATUSES, type Enquiry } from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

const fmt = (d: string) =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function EnquiriesInner() {
  const params = useSearchParams();
  const { can } = useAdmin();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [followUpDue, setFollowUpDue] = useState(params.get('followUpDue') === 'true');
  const propertyId = params.get('propertyId') ?? '';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(params.get('open'));

  const filters = new URLSearchParams({
    ...(status && { status }),
    ...(followUpDue && { followUpDue: 'true' }),
    ...(propertyId && { propertyId }),
    ...(query && { q: query }),
  });
  const list = new URLSearchParams(filters);
  list.set('page', String(page));
  const { data, meta, loading, error, reload } = useApi<Enquiry[]>(`/admin/enquiries?${list}`);

  return (
    <>
      <PageTitle title="Enquiries">
        {can('admin') && (
          <a className="btn btn-outline" href={`/api/v1/admin/enquiries/export.csv?${filters}`}>
            Export CSV
          </a>
        )}
      </PageTitle>

      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_10rem_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <label className="sr-only" htmlFor="eq-q">
          Search
        </label>
        <input
          id="eq-q"
          className="field"
          placeholder="Name, phone, email, lead ID or property"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sr-only" htmlFor="eq-status">
          Status
        </label>
        <select
          id="eq-status"
          className="field"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All (except spam)</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand)]"
            checked={followUpDue}
            onChange={(e) => {
              setFollowUpDue(e.target.checked);
              setPage(1);
            }}
          />
          Follow-ups due
        </label>
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>
      {propertyId && (
        <p className="mb-3 text-sm text-ink-muted">
          Showing enquiries for one property.{' '}
          <Link href="/admin/enquiries" className="text-brand underline">
            Show all
          </Link>
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3">Received</th>
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
                  No enquiries match.
                </td>
              </tr>
            )}
            {data?.map((e) => (
              <tr
                key={e.id}
                className="cursor-pointer hover:bg-surface"
                onClick={() => setOpenId(e.id)}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-semibold text-brand hover:underline"
                    onClick={() => setOpenId(e.id)}
                  >
                    {e.leadId}
                  </button>
                  <div className="text-xs text-ink-muted">{e.type}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-ink-muted">{e.phone}</div>
                </td>
                <td className="max-w-56 truncate px-4 py-3">
                  {e.property?.title ?? <span className="text-ink-muted">General</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={e.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {e.followUpAt ? (
                    <span
                      className={
                        new Date(e.followUpAt) <= new Date() ? 'font-semibold text-warn' : ''
                      }
                    >
                      {fmt(e.followUpAt)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{fmt(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Page {meta.page} of {meta.totalPages} · {meta.total} enquiries
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

      {openId && <EnquiryDrawer id={openId} onClose={() => setOpenId(null)} onSaved={reload} />}
    </>
  );
}

function EnquiryDrawer({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useAdmin();
  const { data: e, error, reload } = useApi<Enquiry>(`/admin/enquiries/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      await apiFetch(`/admin/enquiries/${id}`, { method: 'PATCH', body });
      toast(msg);
      reload();
      onSaved();
      return true;
    } catch (err) {
      toast(errMsg(err), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Enquiry details"
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-lift"
        onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => ev.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{e?.leadId ?? 'Enquiry'}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-danger">
            {error}
          </p>
        )}
        {e && (
          <div className="mt-4 space-y-6 text-sm">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2">
              <dt className="text-ink-muted">Name</dt>
              <dd className="font-medium">{e.name}</dd>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="flex flex-wrap gap-3">
                <a className="text-brand underline" href={`tel:${e.phone}`}>
                  {e.phone}
                </a>
                <a
                  className="text-brand underline"
                  href={`https://wa.me/${e.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </dd>
              {e.email && (
                <>
                  <dt className="text-ink-muted">Email</dt>
                  <dd>
                    <a className="text-brand underline" href={`mailto:${e.email}`}>
                      {e.email}
                    </a>
                  </dd>
                </>
              )}
              <dt className="text-ink-muted">Property</dt>
              <dd>
                {e.property ? (
                  <a
                    className="text-brand underline"
                    href={`/properties/${e.property.slug}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {e.property.title}
                  </a>
                ) : (
                  'General enquiry'
                )}
              </dd>
              <dt className="text-ink-muted">Source page</dt>
              <dd>{e.sourcePage ?? '—'}</dd>
              <dt className="text-ink-muted">Received</dt>
              <dd>{fmt(e.createdAt)}</dd>
              <dt className="text-ink-muted">Consent</dt>
              <dd>Given {fmt(e.consentAt)}</dd>
            </dl>
            {e.message && (
              <blockquote className="whitespace-pre-line rounded-lg bg-surface p-4">
                {e.message}
              </blockquote>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ed-status" className="field-label">
                  Status
                </label>
                <select
                  id="ed-status"
                  className="field"
                  value={e.status}
                  disabled={busy}
                  onChange={(ev) => patch({ status: ev.target.value }, `Marked ${ev.target.value}`)}
                >
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ed-follow" className="field-label">
                  Follow-up
                </label>
                <input
                  id="ed-follow"
                  type="datetime-local"
                  className="field"
                  disabled={busy}
                  defaultValue={e.followUpAt ? toLocalInput(e.followUpAt) : ''}
                  onBlur={(ev) => {
                    const v = ev.target.value;
                    const current = e.followUpAt ? toLocalInput(e.followUpAt) : '';
                    if (v !== current)
                      void patch(
                        { followUpAt: v ? new Date(v).toISOString() : null },
                        v ? 'Follow-up scheduled' : 'Follow-up cleared',
                      );
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-assign" className="field-label">
                  Assigned to
                </label>
                <input
                  id="ed-assign"
                  className="field"
                  maxLength={80}
                  defaultValue={e.assignedTo ?? ''}
                  disabled={busy}
                  onBlur={(ev) =>
                    ev.target.value !== (e.assignedTo ?? '') &&
                    void patch({ assignedTo: ev.target.value }, 'Assignment updated')
                  }
                />
              </div>
            </div>

            <form
              onSubmit={async (ev) => {
                ev.preventDefault();
                if (!note.trim()) return;
                if (await patch({ note: note.trim() }, 'Note added')) setNote('');
              }}
            >
              <label htmlFor="ed-note" className="field-label">
                Add private note
              </label>
              <textarea
                id="ed-note"
                className="field min-h-20"
                maxLength={2000}
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm mt-2"
                disabled={busy || !note.trim()}
              >
                Add note
              </button>
            </form>

            {e.notes.length > 0 && (
              <section>
                <h3 className="font-semibold">Notes</h3>
                <ol className="mt-2 space-y-3">
                  {[...e.notes].reverse().map((n, i) => (
                    <li key={i} className="rounded-lg border border-line p-3">
                      <p className="whitespace-pre-line">{n.text}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {n.by} · {fmt(n.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EnquiriesPage() {
  return (
    <Suspense>
      <EnquiriesInner />
    </Suspense>
  );
}
