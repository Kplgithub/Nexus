'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  type AdminWebsiteUser,
  type Payment,
  type PaymentStatus,
  type PaymentSummary,
  type Plan,
  type UserRole,
} from '@nexus/shared';
import {
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

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const STATUS_LABELS: Record<PaymentStatus, string> = {
  created: 'Not finished',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

function Inner() {
  const [planForm, setPlanForm] = useState<Plan | 'new' | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<'' | PaymentStatus>('');
  const [page, setPage] = useState(1);
  const plans = useApi<Plan[]>('/admin/plans');
  const summary = useApi<PaymentSummary>('/admin/payments/summary');
  const q = new URLSearchParams({ page: String(page), ...(status && { status }) });
  const payments = useApi<Payment[]>(`/admin/payments?${q}`);
  const reloadAll = () => {
    payments.reload();
    summary.reload();
  };

  const s = summary.data;
  return (
    <>
      <PageTitle
        title="Plans & payments"
        sub="Paid plans for agents and builders, and every payment received."
      >
        <button
          type="button"
          className="btn btn-outline gap-1.5"
          onClick={() => setRecording(true)}
        >
          <A.rupee width={16} height={16} />
          Record payment
        </button>
      </PageTitle>

      {s && !s.onlineEnabled && (
        <p className="mb-4 rounded-lg bg-warn-50 p-3 text-sm text-warn">
          Online payment is not switched on yet, so people cannot pay on the website. You can still
          record cash, UPI or bank payments here with “Record payment”.
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['This month', s ? rupees(s.thisMonth) : null],
          ['Last month', s ? rupees(s.lastMonth) : null],
          ['Active plans', s ? String(s.activeSubscriptions) : null],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-sm text-ink-muted">{l}</p>
            {v === null ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-extrabold">{v}</p>
            )}
          </div>
        ))}
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-sans text-lg font-bold">Plans</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1"
            onClick={() => setPlanForm('new')}
          >
            <A.plus width={15} height={15} /> New plan
          </button>
        </div>
        {plans.error && (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
            {plans.error}
          </p>
        )}
        {plans.loading && !plans.data && <Skeleton className="h-32 w-full" />}
        {plans.data?.length === 0 && (
          <p className="card p-6 text-center text-sm text-ink-muted">
            No plans yet. Everyone gets the free listing limit until you add one.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data?.map((p) => (
            <article
              key={p.id}
              className={`card flex flex-col p-4 ${p.active ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-sans text-base font-bold">{p.name}</h3>
                {!p.active && <StatusPill status="inactive" label="Hidden" />}
              </div>
              <p className="mt-1 text-2xl font-extrabold text-brand">
                {rupees(p.price)}
                <span className="text-sm font-semibold text-ink-muted">
                  {' '}
                  / {p.durationDays} days
                </span>
              </p>
              {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
              <ul className="mt-3 space-y-1 text-sm">
                <li>Up to {p.listingLimit} live listings</li>
                {p.featuredListings > 0 && <li>{p.featuredListings} featured listings</li>}
                <li className="text-ink-muted">
                  For: {p.roles.map((r) => USER_ROLE_LABELS[r]).join(', ')}
                </li>
              </ul>
              <div className="mt-auto pt-3 text-right">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPlanForm(p)}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-lg font-bold">Payments</h2>
          <div role="tablist" className="adm-seg">
            {(['', 'paid', 'refunded', 'failed'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={status === k}
                onClick={() => {
                  setStatus(k);
                  setPage(1);
                }}
              >
                {k ? STATUS_LABELS[k] : 'All'}
              </button>
            ))}
          </div>
        </div>
        {payments.error && (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
            {payments.error}
          </p>
        )}
        {payments.loading && !payments.data && <Skeleton className="h-48 w-full" />}
        {payments.data && (
          <div className="card overflow-x-auto">
            <table className="adm-table min-w-[44rem]">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>How</th>
                  <th>Valid till</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted">
                      No payments yet.
                    </td>
                  </tr>
                )}
                {payments.data.map((p) => (
                  <PaymentRow key={p.id} p={p} onDone={reloadAll} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payments.meta && payments.meta.totalPages > 1 && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((x) => x - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= payments.meta.totalPages}
              onClick={() => setPage((x) => x + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {planForm && (
        <PlanForm
          plan={planForm === 'new' ? null : planForm}
          onClose={() => setPlanForm(null)}
          onDone={plans.reload}
        />
      )}
      {recording && (
        <RecordPayment
          plans={plans.data ?? []}
          onClose={() => setRecording(false)}
          onDone={reloadAll}
        />
      )}
    </>
  );
}

function PaymentRow({ p, onDone }: { p: Payment; onDone: () => void }) {
  const { toast } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <tr>
      <td>
        {p.user ? (
          <Link href={`/admin/users/${p.user.id}`} className="font-semibold hover:text-brand">
            {p.user.name}
          </Link>
        ) : (
          <span className="text-ink-muted">Deleted user</span>
        )}
        <span className="block text-xs text-ink-muted">{date(p.paidAt ?? p.createdAt)}</span>
      </td>
      <td>{p.plan.name}</td>
      <td className="font-semibold whitespace-nowrap">{rupees(p.amount)}</td>
      <td>
        {p.method === 'online' ? 'Online' : 'Recorded'}
        {(p.reference || p.paymentId) && (
          <span className="block max-w-[10rem] truncate text-xs text-ink-muted">
            {p.reference || p.paymentId}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap">{p.status === 'paid' ? date(p.endsAt) : '—'}</td>
      <td>
        <StatusPill status={p.status} label={STATUS_LABELS[p.status]} />
      </td>
      <td className="text-right">
        {p.status === 'paid' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-danger"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  `Mark ${rupees(p.amount)} as refunded? Their plan stops today. Send the money back yourself.`,
                )
              )
                return;
              setBusy(true);
              try {
                await apiFetch(`/admin/payments/${p.id}/refund`, { method: 'POST' });
                toast('Marked as refunded. Their plan has ended.');
                onDone();
              } catch (err) {
                toast(errMsg(err), 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            Refund
          </button>
        )}
      </td>
    </tr>
  );
}

function PlanForm({
  plan,
  onClose,
  onDone,
}: {
  plan: Plan | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useAdmin();
  const [f, setF] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: String(plan?.price ?? ''),
    durationDays: String(plan?.durationDays ?? 30),
    listingLimit: String(plan?.listingLimit ?? 25),
    featuredListings: String(plan?.featuredListings ?? 0),
    roles: plan?.roles ?? (['agent', 'builder'] as UserRole[]),
    active: plan?.active ?? true,
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = {
      name: f.name.trim(),
      description: f.description.trim(),
      price: Number(f.price),
      durationDays: Number(f.durationDays),
      listingLimit: Number(f.listingLimit),
      featuredListings: Number(f.featuredListings),
      roles: f.roles,
      active: f.active,
    };
    try {
      await apiFetch(plan ? `/admin/plans/${plan.id}` : '/admin/plans', {
        method: plan ? 'PATCH' : 'POST',
        body,
      });
      toast(plan ? 'Plan saved' : 'Plan added');
      onDone();
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const num = (
    k: 'price' | 'durationDays' | 'listingLimit' | 'featuredListings',
    label: string,
    min: number,
  ) => (
    <div>
      <label htmlFor={`pl-${k}`} className="field-label">
        {label}
      </label>
      <input
        id={`pl-${k}`}
        type="number"
        inputMode="numeric"
        className="field"
        required
        min={min}
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <Modal title={plan ? `Edit plan: ${plan.name}` : 'New plan'} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="pl-name" className="field-label">
            Plan name
          </label>
          <input
            id="pl-name"
            className="field"
            required
            minLength={2}
            maxLength={60}
            placeholder="Agent Gold"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="pl-desc" className="field-label">
            Short line (optional)
          </label>
          <input
            id="pl-desc"
            className="field"
            maxLength={300}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {num('price', 'Price in ₹ (with GST)', 1)}
          {num('durationDays', 'Valid for (days)', 1)}
          {num('listingLimit', 'Live listings allowed', 1)}
          {num('featuredListings', 'Featured listings', 0)}
        </div>
        <fieldset>
          <legend className="field-label">Who can buy it</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {USER_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={f.roles.includes(r)}
                  onChange={(e) =>
                    setF({
                      ...f,
                      roles: e.target.checked ? [...f.roles, r] : f.roles.filter((x) => x !== r),
                    })
                  }
                />
                {USER_ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => setF({ ...f, active: e.target.checked })}
          />
          Show this plan on the website
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || f.roles.length === 0}>
            {busy ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RecordPayment({
  plans,
  onClose,
  onDone,
}: {
  plans: Plan[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useAdmin();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<AdminWebsiteUser | null>(null);
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const found = useApi<AdminWebsiteUser[]>(
    query ? `/admin/users?limit=6&q=${encodeURIComponent(query)}` : null,
  );
  const usable = plans.filter((p) => !user || p.roles.includes(user.role));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await apiFetch('/admin/payments/manual', {
        method: 'POST',
        body: { userId: user.id, planId, amount: Number(amount), reference: reference.trim() },
      });
      toast(`Payment recorded. ${user.name}'s plan is now on.`);
      onDone();
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Record a payment" onClose={onClose}>
      <p className="mb-4 text-sm text-ink-muted">
        For cash, UPI or bank transfer you received outside the website. Their plan starts right
        away.
      </p>
      {!user ? (
        <div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
            }}
          >
            <label htmlFor="rp-q" className="sr-only">
              Find the person
            </label>
            <input
              id="rp-q"
              className="field"
              placeholder="Name, phone or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-outline">
              Find
            </button>
          </form>
          {found.loading && <Skeleton className="mt-3 h-14 w-full" />}
          {found.data?.length === 0 && <p className="mt-3 text-sm text-ink-muted">Nobody found.</p>}
          <ul className="mt-2 divide-y divide-line">
            {found.data?.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full py-2.5 text-left text-sm hover:text-brand"
                  onClick={() => {
                    setUser(u);
                    setPlanId('');
                  }}
                >
                  <b>{u.companyName || u.name}</b>
                  <span className="block text-xs text-ink-muted">
                    {USER_ROLE_LABELS[u.role]} · {u.phone}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <p className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
            <span>
              <b>{user.companyName || user.name}</b> · {USER_ROLE_LABELS[user.role]}
            </span>
            <button type="button" className="text-brand underline" onClick={() => setUser(null)}>
              Change
            </button>
          </p>
          <div>
            <label htmlFor="rp-plan" className="field-label">
              Plan
            </label>
            <select
              id="rp-plan"
              className="field"
              required
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const p = plans.find((x) => x.id === e.target.value);
                if (p) setAmount(String(p.price));
              }}
            >
              <option value="">Choose a plan</option>
              {usable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {rupees(p.price)} · {p.durationDays} days
                </option>
              ))}
            </select>
            {usable.length === 0 && (
              <p className="mt-1 text-xs text-warn">
                No plan is open to {USER_ROLE_LABELS[user.role]}. Add one first.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rp-amt" className="field-label">
                Amount received (₹)
              </label>
              <input
                id="rp-amt"
                type="number"
                inputMode="numeric"
                min={0}
                required
                className="field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rp-ref" className="field-label">
                UPI / receipt no.
              </label>
              <input
                id="rp-ref"
                className="field"
                maxLength={120}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !planId}>
              {busy ? 'Saving…' : 'Record payment'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function PaymentsPage() {
  return (
    <SuperOnly>
      <Inner />
    </SuperOnly>
  );
}
