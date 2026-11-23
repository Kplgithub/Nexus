'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ADMIN_PATH,
  USER_ROLE_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatIndianPhone,
  type PaginationMeta,
  type VerificationItem,
} from '@nexus/shared';
import { Avatar, PageTitle, Skeleton, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { Modal } from '@/components/admin/Modal';
import { errMsg } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

type Counts = { waiting: number; verified: number; rejected: number };
const TABS = [
  ['pending', 'Waiting'],
  ['verified', 'Verified'],
  ['rejected', 'Rejected'],
] as const;

export default function VerificationPage() {
  const { toast, refreshBadges } = useAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('pending');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{
    items?: VerificationItem[];
    meta?: PaginationMeta;
    counts?: Counts;
    error?: string;
  }>({});
  const [rejecting, setRejecting] = useState<VerificationItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams({ status: tab, page: String(page), ...(query && { q: query }) });
    // This endpoint also returns tab counts beside the page, so read the raw response.
    fetch(`/api/v1/admin/verification?${p}`, {
      credentials: 'same-origin',
      signal: ctrl.signal,
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) =>
        j.ok
          ? setState({ items: j.data, meta: j.meta, counts: j.counts })
          : setState({ error: j.error?.message ?? 'Failed to load' }),
      )
      .catch(() => !ctrl.signal.aborted && setState({ error: 'Failed to load' }));
    return () => ctrl.abort();
  }, [tab, page, query, nonce]);

  async function decide(
    u: VerificationItem,
    decision: 'verified' | 'rejected' | 'unverified',
    note?: string,
  ) {
    setBusy(u.id);
    try {
      await apiFetch(`/admin/users/${u.id}/verification`, {
        method: 'POST',
        body: { decision, ...(note && { note }) },
      });
      toast(
        decision === 'verified'
          ? `${u.companyName || u.name} now shows the Verified badge`
          : decision === 'rejected'
            ? 'Rejected. They got an email with your reason.'
            : 'Moved back to waiting',
      );
      setNonce((n) => n + 1);
      refreshBadges();
      return true;
    } catch (err) {
      toast(errMsg(err), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const c = state.counts;
  return (
    <>
      <PageTitle
        title="Verification"
        sub="Check each agent and builder before they get the Verified badge: RERA number, company name, phone."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" className="adm-seg">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              {c && ` (${k === 'pending' ? c.waiting : c[k]})`}
            </button>
          ))}
        </div>
        <form
          className="flex flex-1 gap-2 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <label htmlFor="vf-q" className="sr-only">
            Search
          </label>
          <input
            id="vf-q"
            className="field"
            placeholder="Name, company, phone or RERA"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            Search
          </button>
        </form>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
          {state.error}
        </p>
      )}
      {!state.items && !state.error && <Skeleton className="h-64 w-full" />}
      {state.items?.length === 0 && (
        <p className="card p-8 text-center text-ink-muted">
          {tab === 'pending' ? 'Nobody is waiting. Nice.' : 'No one here yet.'}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {state.items?.map((u) => (
          <article key={u.id} className="card flex flex-col p-4">
            <div className="flex items-start gap-3">
              <Avatar
                name={u.companyName || u.name}
                tone={u.role === 'builder' ? 'navy' : 'brand'}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <Link href={`${ADMIN_PATH}/users/${u.id}`} className="font-bold hover:text-brand">
                  {u.companyName || u.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  {USER_ROLE_LABELS[u.role]} · {u.name} · joined{' '}
                  {new Date(u.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <StatusPill
                status={u.verificationStatus === 'pending' ? 'unverified' : u.verificationStatus}
                label={VERIFICATION_STATUS_LABELS[u.verificationStatus]}
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-ink-muted">RERA no.</dt>
              <dd className={u.reraNumber ? 'font-semibold' : 'font-semibold text-warn'}>
                {u.reraNumber ?? 'Not given'}
              </dd>
              <dt className="text-ink-muted">Mobile</dt>
              <dd>
                <a className="text-brand underline" href={`tel:${u.phone}`}>
                  {formatIndianPhone(u.phone)}
                </a>
                {u.phoneVerified ? ' ✓' : ''}
              </dd>
              <dt className="text-ink-muted">Email</dt>
              <dd className="truncate">{u.email}</dd>
              <dt className="text-ink-muted">Listings</dt>
              <dd>{u.listingCount}</dd>
              {u.website && (
                <>
                  <dt className="text-ink-muted">Website</dt>
                  <dd className="truncate">
                    <a
                      className="text-brand underline"
                      href={u.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {u.website.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </>
              )}
            </dl>
            {u.verificationNote && (
              <p className="mt-3 rounded-lg bg-surface p-2.5 text-xs">
                <b>Note:</b> {u.verificationNote}
                {u.verifiedBy && <span className="text-ink-muted"> — {u.verifiedBy}</span>}
              </p>
            )}
            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
              {u.reraNumber && (
                <a
                  className="btn btn-ghost btn-sm mr-auto"
                  href="https://rera.rajasthan.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check on RERA site
                </a>
              )}
              {u.verificationStatus !== 'verified' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy === u.id}
                  onClick={() => decide(u, 'verified')}
                >
                  Verify
                </button>
              )}
              {u.verificationStatus !== 'rejected' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy === u.id}
                  onClick={() => setRejecting(u)}
                >
                  {u.verificationStatus === 'verified' ? 'Remove badge' : 'Reject'}
                </button>
              )}
              {u.verificationStatus === 'rejected' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy === u.id}
                  onClick={() => decide(u, 'unverified')}
                >
                  Check again
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {state.meta && state.meta.totalPages > 1 && (
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
            disabled={page >= state.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {rejecting && (
        <RejectForm
          user={rejecting}
          onClose={() => setRejecting(null)}
          onSubmit={(note) => decide(rejecting, 'rejected', note)}
        />
      )}
    </>
  );
}

function RejectForm({
  user,
  onClose,
  onSubmit,
}: {
  user: VerificationItem;
  onClose: () => void;
  onSubmit: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal title={`Not verified: ${user.companyName || user.name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSubmit(note.trim())) onClose();
        }}
      >
        <div>
          <label htmlFor="rj-note" className="field-label">
            Reason (they will see this in an email)
          </label>
          <textarea
            id="rj-note"
            className="field min-h-24"
            required
            maxLength={1000}
            placeholder="RERA number does not match the company name. Please send your registration certificate."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={!note.trim()}>
            Send and reject
          </button>
        </div>
      </form>
    </Modal>
  );
}
