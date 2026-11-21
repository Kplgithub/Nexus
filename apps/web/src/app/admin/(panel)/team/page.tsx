'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN_ROLE_LABELS, isSuperAdmin, type TeamMember, type TeamRole } from '@nexus/shared';
import {
  Avatar,
  PageTitle,
  Skeleton,
  StatusPill,
  SuperOnly,
  useAdmin,
} from '@/components/admin/AdminShell';
import { A } from '@/components/admin/AdminIcons';
import { Modal } from '@/components/admin/Modal';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

const CAN = {
  super: [
    'Everything a Sub-admin can do',
    'Delete listings, projects and blog posts',
    'Add and manage the team',
    'Set passwords for team and website users',
    'Plans, payments, alerts and site settings',
    'Export leads and see the activity log',
  ],
  sub: [
    'Review, add and edit listings and projects',
    'Work leads, book site visits',
    'Verify agents and builders, feature listings',
    'Edit website users’ details (not passwords)',
    'Write the blog, FAQs',
  ],
};

export default function TeamPage() {
  return (
    <SuperOnly>
      <Team />
    </SuperOnly>
  );
}

function Team() {
  const { admin, toast } = useAdmin();
  const { data, loading, error, reload } = useApi<TeamMember[]>('/admin/team');
  const [adding, setAdding] = useState(false);
  const [pwFor, setPwFor] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(m: TeamMember, body: Record<string, unknown>, msg: string) {
    setBusy(m.id);
    try {
      await apiFetch(`/admin/team/${m.id}`, { method: 'PATCH', body });
      toast(msg);
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  const active = data?.filter((m) => m.active) ?? [];
  const off = data?.filter((m) => !m.active) ?? [];

  return (
    <>
      <PageTitle title="Team" sub="Who can sign in to this admin, and what each person can do.">
        <button type="button" className="btn btn-primary gap-1.5" onClick={() => setAdding(true)}>
          <A.plus width={16} height={16} />
          Add Sub-admin
        </button>
      </PageTitle>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-3">
          {loading && !data && [0, 1].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          {active.map((m) => (
            <article key={m.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={m.name} tone={isSuperAdmin(m.role) ? 'navy' : 'accent'} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {m.name}
                    {m.id === admin.id && (
                      <span className="text-xs font-semibold text-ink-muted">(you)</span>
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${isSuperAdmin(m.role) ? 'bg-brand-50 text-brand' : 'bg-accent-50 text-accent-700'}`}
                    >
                      {ADMIN_ROLE_LABELS[m.role]}
                    </span>
                    {m.lockedUntil && <StatusPill status="blocked" label="Locked for now" />}
                  </p>
                  <p className="truncate text-sm text-ink-muted">{m.email}</p>
                  <p className="mt-1 text-xs text-ink-muted">Last sign-in: {when(m.lastLoginAt)}</p>
                </div>
                {m.id !== admin.id && (
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <label className="sr-only" htmlFor={`role-${m.id}`}>
                      Role
                    </label>
                    <select
                      id={`role-${m.id}`}
                      className="field h-9 w-auto py-1 text-sm"
                      value={isSuperAdmin(m.role) ? 'owner' : 'editor'}
                      disabled={busy === m.id}
                      onChange={(e) =>
                        patch(
                          m,
                          { role: e.target.value as TeamRole },
                          `${m.name} is now ${e.target.value === 'owner' ? 'a Super Admin' : 'a Sub-admin'}`,
                        )
                      }
                    >
                      <option value="editor">Sub-admin</option>
                      <option value="owner">Super Admin</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setPwFor(m)}
                    >
                      <A.key width={15} height={15} /> Password
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      disabled={busy === m.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Switch off ${m.name}? They are signed out now and their open leads go back to unassigned.`,
                          )
                        )
                          void patch(m, { active: false }, `${m.name} switched off`);
                      }}
                    >
                      Switch off
                    </button>
                  </div>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat
                  label="Open leads"
                  value={m.stats.openLeads}
                  href={`/admin/enquiries?assignee=${m.id}`}
                />
                <Stat label="Leads closed" value={m.stats.closedLeads} />
                <Stat label="Upcoming visits" value={m.stats.upcomingVisits} href="/admin/visits" />
                <Stat
                  label="Actions (30 days)"
                  value={m.stats.actions30d}
                  href={`/admin/activity?actor=${m.id}`}
                />
              </dl>
            </article>
          ))}
          {off.length > 0 && (
            <details className="card p-4">
              <summary className="cursor-pointer text-sm font-bold">
                Switched off ({off.length})
              </summary>
              <ul className="mt-3 divide-y divide-line">
                {off.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <b>{m.name}</b> <span className="text-ink-muted">{m.email}</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy === m.id}
                      onClick={() => patch(m, { active: true }, `${m.name} can sign in again`)}
                    >
                      Switch on
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="font-sans text-base font-bold">Super Admin can</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {CAN.super.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-success">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="font-sans text-base font-bold">Sub-admin can</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {CAN.sub.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-success">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              Sign-in locks for 15 minutes after 5 wrong passwords, for everyone.
            </p>
          </section>
        </aside>
      </div>

      {adding && <AddMember onClose={() => setAdding(false)} onDone={reload} />}
      {pwFor && <SetPassword member={pwFor} onClose={() => setPwFor(null)} />}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <dt className="text-[11.5px] font-semibold text-ink-muted">{label}</dt>
      <dd className="tabular text-lg font-extrabold">{value}</dd>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg bg-surface px-3 py-2 hover:bg-brand-50">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg bg-surface px-3 py-2">{body}</div>
  );
}

function AddMember({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useAdmin();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'editor' as TeamRole });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch('/admin/team', { method: 'POST', body: f });
      toast(`${f.name} added. Share the email and password privately.`);
      onDone();
      onClose();
    } catch (err) {
      const d = (err as { details?: Record<string, string[]> }).details;
      if (d) setErrors(d);
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const field = (k: 'name' | 'email' | 'password', label: string, type = 'text', hint?: string) => (
    <div>
      <label htmlFor={`tm-${k}`} className="field-label">
        {label}
      </label>
      <input
        id={`tm-${k}`}
        className="field"
        type={type}
        autoComplete="off"
        required
        value={f[k]}
        aria-invalid={!!errors[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
      {errors[k] ? (
        <p className="field-error">{errors[k][0]}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );

  return (
    <Modal title="Add a team member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {field('name', 'Full name')}
        {field('email', 'Email (used to sign in)', 'email')}
        {field(
          'password',
          'Starting password',
          'text',
          '12+ characters with upper- and lower-case letters and a number',
        )}
        <fieldset>
          <legend className="field-label">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['editor', 'owner'] as const).map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm ${f.role === r ? 'border-brand bg-brand-50' : 'border-line'}`}
              >
                <input
                  type="radio"
                  name="role"
                  className="mt-0.5 accent-[var(--color-brand)]"
                  checked={f.role === r}
                  onChange={() => setF({ ...f, role: r })}
                />
                <span>
                  <b>{ADMIN_ROLE_LABELS[r]}</b>
                  <span className="block text-xs text-ink-muted">
                    {r === 'editor' ? 'Works listings and leads' : 'Full control, like you'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SetPassword({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { toast } = useAdmin();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`New password for ${member.name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await apiFetch(`/admin/team/${member.id}/password`, {
              method: 'POST',
              body: { password: pw },
            });
            toast(`Password changed. ${member.name} is signed out and uses the new one next time.`);
            onClose();
          } catch (err) {
            toast(errMsg(err), 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label htmlFor="tm-newpw" className="field-label">
            New password
          </label>
          <input
            id="tm-newpw"
            className="field"
            autoComplete="off"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <p className="field-hint">
            12+ characters with upper- and lower-case letters and a number. This also unlocks a
            locked account.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || pw.length < 12}>
            Set password
          </button>
        </div>
      </form>
    </Modal>
  );
}
