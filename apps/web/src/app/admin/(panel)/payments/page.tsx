'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ADMIN_PATH,
  AUTO_REFRESH_DAYS,
  LISTING_ROLES,
  MAX_COMPARE_PLANS,
  SEARCH_RANKS,
  USER_ROLE_LABELS,
  type AdminWebsiteUser,
  type AutoRefreshDays,
  type Payment,
  type PaymentStatus,
  type PaymentSummary,
  type Plan,
  type SiteSettings,
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
const planPrice = (n: number) => (n === 0 ? 'Free' : rupees(n));
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
            No plans yet. Agents and builders get 5 free listings; owners need a plan to list.
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
                {p.active && p.recommended && (
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">
                    Most chosen
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-extrabold text-brand">
                {planPrice(p.price)}
                <span className="text-sm font-semibold text-ink-muted">
                  {' '}
                  {p.price === 0 ? '· on by itself' : `/ ${p.durationDays} days`}
                </span>
              </p>
              {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
              <ul className="mt-3 space-y-1 text-sm">
                <li>{p.listingLimit} listings live at a time</li>
                <li>{p.leadLimit > 0 ? `${p.leadLimit} leads` : 'Unlimited leads'}</li>
                <li>
                  Search: {SEARCH_RANKS[p.searchRank] ?? 'Normal'}
                  {p.partnerBadge ? ' · Partner badge' : ''}
                  {p.autoRefreshDays ? ` · Refresh ${p.autoRefreshDays}d` : ''}
                </li>
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

      <FeaturedPrices />
      <InvoiceDetails />

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
        {payments.data && payments.data.length === 0 && (
          <div className="card px-4 py-8 text-center text-ink-muted">No payments yet.</div>
        )}
        {payments.data && payments.data.length > 0 && (
          <ul className="space-y-3 md:hidden">
            {payments.data.map((p) => (
              <PaymentCard key={p.id} p={p} onDone={reloadAll} />
            ))}
          </ul>
        )}
        {payments.data && payments.data.length > 0 && (
          <div className="card hidden overflow-x-auto md:block">
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

/** The paid Featured prices (7 days and 1 month) that owners, agents and builders pay. */
function FeaturedPrices() {
  const { toast } = useAdmin();
  const settings = useApi<SiteSettings>('/admin/settings');
  const [p7, setP7] = useState<string | null>(null);
  const [p30, setP30] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = settings.data?.featurePrices;
  const v7 = p7 ?? String(cur?.days7 ?? '');
  const v30 = p30 ?? String(cur?.days30 ?? '');
  const changed = !!cur && (Number(v7) !== cur.days7 || Number(v30) !== cur.days30);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: { featurePrices: { days7: Number(v7), days30: Number(v30) } },
      });
      toast('Featured prices saved. The website shows them within a minute.');
      setP7(null);
      setP30(null);
      settings.reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-sans text-lg font-bold">Featured prices</h2>
      <form className="card flex flex-wrap items-end gap-4 p-4" onSubmit={save}>
        <div>
          <label htmlFor="fp-7" className="field-label">
            7 days (₹, with GST)
          </label>
          <input
            id="fp-7"
            type="number"
            inputMode="numeric"
            min={1}
            required
            className="field w-40"
            value={v7}
            onChange={(e) => setP7(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fp-30" className="field-label">
            1 month (₹, with GST)
          </label>
          <input
            id="fp-30"
            type="number"
            inputMode="numeric"
            min={1}
            required
            className="field w-40"
            value={v30}
            onChange={(e) => setP30(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !changed}>
          {busy ? 'Saving…' : 'Save prices'}
        </button>
        <p className="basis-full text-sm text-ink-muted">
          Anyone can pay this to feature one live listing. Listings already featured are not
          changed.
        </p>
      </form>
    </section>
  );
}

/** Business details printed on every invoice. With a GSTIN the invoice shows GST. */
function InvoiceDetails() {
  const { toast } = useAdmin();
  const settings = useApi<SiteSettings>('/admin/settings');
  const cur = settings.data?.invoice;
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const v = form ?? {
    legalName: cur?.legalName ?? '',
    gstin: cur?.gstin ?? '',
    address: cur?.address ?? '',
    state: cur?.state ?? 'Rajasthan',
    sacCode: cur?.sacCode ?? '',
  };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...v, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/admin/settings', { method: 'PATCH', body: { invoice: v } });
      toast('Invoice details saved. New and old invoices show them now.');
      setForm(null);
      settings.reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!cur) return <Skeleton className="mb-8 h-40" />;
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-sans text-lg font-bold">Invoice details</h2>
      <form className="card grid gap-4 p-4 md:grid-cols-2" onSubmit={save}>
        <div>
          <label htmlFor="inv-name" className="field-label">
            Registered business name
          </label>
          <input
            id="inv-name"
            className="field"
            maxLength={120}
            placeholder="As on your GST certificate"
            value={v.legalName}
            onChange={set('legalName')}
          />
        </div>
        <div>
          <label htmlFor="inv-gstin" className="field-label">
            GSTIN
          </label>
          <input
            id="inv-gstin"
            className="field uppercase"
            maxLength={15}
            placeholder="15 characters, e.g. 08ABCDE1234F1Z5"
            value={v.gstin}
            onChange={set('gstin')}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="inv-address" className="field-label">
            Business address
          </label>
          <textarea
            id="inv-address"
            className="field"
            rows={2}
            maxLength={300}
            placeholder="Full address as on your GST certificate"
            value={v.address}
            onChange={set('address')}
          />
        </div>
        <div>
          <label htmlFor="inv-state" className="field-label">
            GST state
          </label>
          <input
            id="inv-state"
            className="field"
            maxLength={60}
            value={v.state}
            onChange={set('state')}
          />
        </div>
        <div>
          <label htmlFor="inv-sac" className="field-label">
            SAC code (optional)
          </label>
          <input
            id="inv-sac"
            className="field"
            inputMode="numeric"
            maxLength={8}
            placeholder="Ask your CA"
            value={v.sacCode}
            onChange={set('sacCode')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={busy || !form}>
            {busy ? 'Saving…' : 'Save invoice details'}
          </button>
          <p className="text-sm text-ink-muted">
            {cur.gstin
              ? 'Invoices are GST tax invoices. Prices include 18% GST.'
              : 'Without a GSTIN, users get a payment receipt with no GST.'}
          </p>
        </div>
      </form>
    </section>
  );
}

function PaymentRow({ p, onDone }: { p: Payment; onDone: () => void }) {
  return (
    <tr>
      <td>
        {p.user ? (
          <Link
            href={`${ADMIN_PATH}/users/${p.user.id}`}
            className="font-semibold hover:text-brand"
          >
            {p.user.name}
          </Link>
        ) : (
          <span className="text-ink-muted">Deleted user</span>
        )}
        <span className="block text-xs text-ink-muted">{date(p.paidAt ?? p.createdAt)}</span>
      </td>
      <td>
        {p.plan.name}
        {p.property && <span className="block text-xs text-ink-muted">{p.property.title}</span>}
      </td>
      <td className="font-semibold whitespace-nowrap">{rupees(p.amount)}</td>
      <td>
        {p.autopay ? 'Auto-renew' : p.method === 'online' ? 'Online' : 'Recorded'}
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
      <td className="whitespace-nowrap text-right">
        <PaymentActions p={p} onDone={onDone} />
      </td>
    </tr>
  );
}

/** Phone layout: one card per payment, so nothing hides behind a sideways scroll. */
function PaymentCard({ p, onDone }: { p: Payment; onDone: () => void }) {
  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {p.user ? (
            <Link
              href={`${ADMIN_PATH}/users/${p.user.id}`}
              className="block truncate font-semibold hover:text-brand"
            >
              {p.user.name}
            </Link>
          ) : (
            <span className="text-ink-muted">Deleted user</span>
          )}
          <span className="block text-xs text-ink-muted">{date(p.paidAt ?? p.createdAt)}</span>
        </div>
        <StatusPill status={p.status} label={STATUS_LABELS[p.status]} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-ink-muted">Plan</dt>
          <dd>
            {p.plan.name}
            {p.property && (
              <span className="block truncate text-xs text-ink-muted">{p.property.title}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Amount</dt>
          <dd className="font-semibold">{rupees(p.amount)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-muted">How</dt>
          <dd>
            {p.autopay ? 'Auto-renew' : p.method === 'online' ? 'Online' : 'Recorded'}
            {(p.reference || p.paymentId) && (
              <span className="block truncate text-xs text-ink-muted">
                {p.reference || p.paymentId}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Valid till</dt>
          <dd>{p.status === 'paid' ? date(p.endsAt) : '—'}</dd>
        </div>
      </dl>
      {(p.status === 'paid' || p.status === 'refunded') && (
        <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2">
          <PaymentActions p={p} onDone={onDone} />
        </div>
      )}
    </li>
  );
}

function PaymentActions({ p, onDone }: { p: Payment; onDone: () => void }) {
  const { toast } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <>
      {(p.status === 'paid' || p.status === 'refunded') && (
        <a
          href={`/invoice/${p.id}?admin=1`}
          target="_blank"
          rel="noopener"
          className="btn btn-ghost btn-sm"
        >
          Invoice
        </a>
      )}
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
      {p.status === 'paid' && p.autopay && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                'Stop auto-renew for this user? No more automatic payments; the days they paid for stay.',
              )
            )
              return;
            setBusy(true);
            try {
              await apiFetch(`/admin/payments/${p.id}/stop-autopay`, { method: 'POST' });
              toast('Auto-renew stopped.');
              onDone();
            } catch (err) {
              toast(errMsg(err), 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          Stop auto-renew
        </button>
      )}
    </>
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
    leadLimit: String(plan?.leadLimit ?? 0),
    mrp: String(plan?.mrp ?? 0),
    sortOrder: String(plan?.sortOrder ?? 0),
    searchRank: plan?.searchRank ?? 0,
    partnerBadge: plan?.partnerBadge ?? false,
    autoRefreshDays: (plan?.autoRefreshDays ?? 0) as AutoRefreshDays,
    recommended: plan?.recommended ?? false,
    roles: plan?.roles ?? ([...LISTING_ROLES] as UserRole[]),
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
      leadLimit: Number(f.leadLimit),
      mrp: Number(f.mrp) || 0,
      sortOrder: Number(f.sortOrder) || 0,
      searchRank: f.searchRank,
      partnerBadge: f.partnerBadge,
      autoRefreshDays: f.autoRefreshDays,
      recommended: f.recommended,
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
    k: 'price' | 'durationDays' | 'listingLimit' | 'leadLimit' | 'mrp' | 'sortOrder',
    label: string,
    min: number,
    required = true,
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
        required={required}
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
          {num('price', 'Price in ₹ (with GST, 0 = Free)', 0)}
          {num('durationDays', 'Valid for (days)', 1)}
          {num('listingLimit', 'Live listings at a time', 1)}
          {num('leadLimit', 'Leads (0 = unlimited)', 0)}
          {num('mrp', 'Cut price ₹ (0 = none)', 0, false)}
          {num('sortOrder', 'Order in popup (1 first)', 0, false)}
        </div>
        {f.price.trim() === '0' && (
          <p className="rounded-xl bg-accent-50 p-3 text-sm text-accent-700">
            Free plan: it turns on by itself for the account types ticked below when they have no
            paid plan. Only the live listings and leads limits apply. Validity, search position,
            badge and auto refresh are for paid plans.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pl-rank" className="field-label">
              Position on search
            </label>
            <select
              id="pl-rank"
              className="field"
              value={f.searchRank}
              onChange={(e) => setF({ ...f, searchRank: Number(e.target.value) })}
            >
              {SEARCH_RANKS.map((r, i) => (
                <option key={r} value={i}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pl-refresh" className="field-label">
              Auto refresh
            </label>
            <select
              id="pl-refresh"
              className="field"
              value={f.autoRefreshDays}
              onChange={(e) =>
                setF({ ...f, autoRefreshDays: Number(e.target.value) as AutoRefreshDays })
              }
            >
              {AUTO_REFRESH_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? 'Off' : `Every ${d} days`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.partnerBadge}
              onChange={(e) => setF({ ...f, partnerBadge: e.target.checked })}
            />
            Premium Partner badge on listing cards
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.recommended}
              onChange={(e) => setF({ ...f, recommended: e.target.checked })}
            />
            Mark as &ldquo;Most chosen&rdquo; (only one plan)
          </label>
        </div>
        <p className="rounded-lg bg-surface p-3 text-xs text-ink-muted">
          The plans popup on Post Property shows the first {MAX_COMPARE_PLANS} plans that are on, by
          order. Search order: Featured, then Top, Higher, High, Normal.
        </p>
        <fieldset>
          <legend className="field-label">Who can buy it</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {LISTING_ROLES.map((r) => (
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
  // A free plan is on by itself; there is nothing to record.
  const usable = plans.filter((p) => p.price > 0 && (!user || p.roles.includes(user.role)));

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
