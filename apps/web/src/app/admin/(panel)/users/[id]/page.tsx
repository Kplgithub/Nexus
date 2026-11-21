'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  USER_ROLE_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatIndianPhone,
  isBusinessRole,
  type AdminWebsiteUser,
} from '@nexus/shared';
import { PageTitle, Skeleton, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, can, isSuper } = useAdmin();
  const [pw, setPw] = useState('');
  const { data: u, error, reload } = useApi<AdminWebsiteUser>(`/admin/users/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function update(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'PATCH', body });
      toast(done);
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>;
  if (!u) return <Skeleton className="h-64 w-full" />;

  const facts: [string, React.ReactNode][] = [
    ['Account type', USER_ROLE_LABELS[u.role]],
    ['Email', u.email],
    [
      'Mobile',
      `${formatIndianPhone(u.phone)}${u.phoneVerified ? ' (verified)' : ' (not verified)'}`,
    ],
    ...(u.companyName ? [['Company', u.companyName] as [string, string]] : []),
    ...(u.reraNumber ? [['RERA number', u.reraNumber] as [string, string]] : []),
    ['Phone on listings', u.showPhone ? 'Shown to signed-in visitors' : 'Hidden'],
    ['Joined', new Date(u.createdAt).toLocaleString('en-IN')],
    ['Last login', u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN') : '—'],
  ];

  return (
    <>
      <PageTitle title={u.companyName || u.name}>
        <Link href="/admin/users" className="btn btn-ghost">
          Back
        </Link>
        <Link href={`/admin/properties?userId=${u.id}`} className="btn btn-outline">
          Listings ({u.listingCount})
        </Link>
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <StatusPill status={u.status} />
            {isBusinessRole(u.role) && (
              <StatusPill
                status={u.verificationStatus === 'pending' ? 'unverified' : u.verificationStatus}
                label={VERIFICATION_STATUS_LABELS[u.verificationStatus]}
              />
            )}
          </div>
          <dl className="divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {u.about && <p className="mt-4 whitespace-pre-line text-sm text-ink-soft">{u.about}</p>}
        </section>

        <aside className="space-y-4">
          {can('editor') && (
            <section className="card space-y-3 p-5">
              <h2 className="font-sans font-semibold">Actions</h2>
              {isBusinessRole(u.role) && (
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  disabled={busy}
                  onClick={() =>
                    update(
                      { verified: !u.verified },
                      u.verified ? 'Verification removed' : 'Marked as verified',
                    )
                  }
                >
                  {u.verified ? 'Remove verified badge' : 'Mark as verified'}
                </button>
              )}
              {u.status === 'active' ? (
                <button
                  type="button"
                  className="btn btn-danger w-full"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Block this user? They will be signed out and their live listings taken down.',
                      )
                    )
                      void update({ status: 'blocked' }, 'User blocked');
                  }}
                >
                  Block user
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  disabled={busy}
                  onClick={() => update({ status: 'active' }, 'User unblocked')}
                >
                  Unblock user
                </button>
              )}
              <p className="text-xs text-ink-muted">
                Verify agents and builders only after checking their RERA registration or company
                documents.
              </p>
            </section>
          )}
          {isSuper && (
            <section className="card p-5">
              <h2 className="font-sans font-semibold">Set a new password</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Only Super Admins can do this. The user is signed out everywhere and uses the new
                password next time.
              </p>
              <form
                className="mt-3 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await apiFetch(`/admin/users/${id}/password`, {
                      method: 'POST',
                      body: { password: pw },
                    });
                    toast('Password changed. Share it with the user privately.');
                    setPw('');
                  } catch (err) {
                    toast(errMsg(err), 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor="u-pw" className="sr-only">
                  New password
                </label>
                <input
                  id="u-pw"
                  className="field"
                  type="text"
                  autoComplete="off"
                  minLength={8}
                  placeholder="At least 8 characters, with a number"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-outline btn-sm"
                  disabled={busy || pw.length < 8}
                >
                  Set password
                </button>
              </form>
            </section>
          )}
          <section className="card p-5">
            <h2 className="font-sans font-semibold">Internal notes</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {u.notes.length === 0 && <li className="text-ink-muted">No notes yet.</li>}
              {u.notes.map((n, i) => (
                <li key={i} className="rounded-lg bg-surface p-3">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(n.at).toLocaleString('en-IN')}
                  </p>
                </li>
              ))}
            </ul>
            {can('editor') && (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  void update({ note: note.trim() }, 'Note added').then(() => setNote(''));
                }}
              >
                <label htmlFor="u-note" className="sr-only">
                  Add note
                </label>
                <textarea
                  id="u-note"
                  className="field min-h-20"
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the team"
                />
                <button
                  type="submit"
                  className="btn btn-outline btn-sm"
                  disabled={busy || !note.trim()}
                >
                  Add note
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
