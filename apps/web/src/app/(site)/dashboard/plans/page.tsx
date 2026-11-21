'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  FEATURE_ADDONS,
  FREE_LEADS_PER_MONTH,
  LISTING_LIMITS,
  formatPrice,
  type CheckoutOrder,
  type FeatureAddonDays,
  type MySubscription,
  type OwnListing,
  type Payment,
  type Plan,
  type PlanUsage,
} from '@nexus/shared';
import { errMsg, useApi } from '@/components/admin/useApi';
import { Pill, SectionTitle } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/components/session/SessionProvider';
import { apiFetch } from '@/lib/client-api';

type Res = {
  plans: Plan[];
  subscription: MySubscription;
  payments: Payment[];
  usage: PlanUsage;
  featureAddons: typeof FEATURE_ADDONS;
  onlineEnabled: boolean;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayCtor = new (o: Record<string, unknown>) => {
  open: () => void;
  on: (e: string, cb: () => void) => void;
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const period = (days: number) =>
  days === 30 ? 'month' : days % 30 === 0 ? `${days / 30} months` : `${days} days`;

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () =>
      w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Payment window did not load'));
    s.onerror = () =>
      reject(new Error('Payment window did not load. Check your internet and try again.'));
    document.body.appendChild(s);
  });
}

const PAY_LABEL: Record<Payment['status'], string> = {
  created: 'Not finished',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};
const PAY_TONE: Record<Payment['status'], string> = {
  created: 'archived',
  paid: 'published',
  failed: 'rejected',
  refunded: 'archived',
};

function Tick({ on = true }: { on?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-success-50 text-success' : 'bg-surface text-ink-muted'}`}
    >
      {on ? '✓' : '–'}
    </span>
  );
}

function Feature({ on = true, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2.5 ${on ? '' : 'text-ink-muted'}`}>
      <Tick on={on} />
      <span>{children}</span>
    </li>
  );
}

function UsageBar({
  label,
  used,
  limit,
  note,
}: {
  label: string;
  used: number;
  limit: number | null;
  note?: React.ReactNode;
}) {
  const full = limit !== null && used >= limit;
  const pct = limit === null ? 100 : limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-1">
        <b className="text-2xl">{used}</b>{' '}
        <span className="text-sm text-ink-muted">
          {limit === null ? 'no limit' : `of ${limit}`}
        </span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <i
          className={`block h-full rounded-full ${full ? 'bg-accent' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {note && <p className="mt-2 text-sm">{note}</p>}
    </div>
  );
}

function MyPlan() {
  const params = useSearchParams();
  const savedId = params.get('saved');
  const { user } = useSession();
  const { data, error, reload } = useApi<Res>('/me/plans');
  const live = useApi<OwnListing[]>('/me/properties?status=published');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [featureId, setFeatureId] = useState<string | null>(params.get('feature'));
  const [featureDays, setFeatureDays] = useState<FeatureAddonDays>(7);

  async function pay(key: string, path: string, body: object | undefined, done: string) {
    setBusy(key);
    setMsg(null);
    try {
      const [{ data: order }, Razorpay] = await Promise.all([
        apiFetch<CheckoutOrder>(path, { method: 'POST', body }),
        loadCheckout(),
      ]);
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'NEXUS Estate',
        description: order.planName,
        prefill: order.prefill,
        theme: { color: '#1E40AF' },
        modal: { ondismiss: () => setBusy(null) },
        handler: async (r: RazorpayResponse) => {
          try {
            await apiFetch('/me/payments/verify', {
              method: 'POST',
              body: {
                orderId: r.razorpay_order_id,
                paymentId: r.razorpay_payment_id,
                signature: r.razorpay_signature,
              },
            });
            setMsg({ ok: true, text: done });
            reload();
            live.reload();
          } catch (err) {
            setMsg({
              ok: false,
              text: `${errMsg(err)} If money was taken, it will be checked and switched on for you.`,
            });
          } finally {
            setBusy(null);
          }
        },
      });
      rzp.on('payment.failed', () => {
        setMsg({
          ok: false,
          text: 'Payment did not go through. No money was taken. Please try again.',
        });
        setBusy(null);
      });
      rzp.open();
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
      setBusy(null);
    }
  }

  const sub = data?.subscription;
  const usage = data?.usage;
  const role = user?.role ?? 'individual';
  const freeListings = LISTING_LIMITS[role];
  const freeLeads = FREE_LEADS_PER_MONTH[role];
  const premium = data?.plans[0];
  const others = data?.plans.slice(1) ?? [];
  const savedListing = savedId ? usage && usage.awaitingPlan > 0 : false;
  const liveListings = live.data ?? [];
  const chosen = liveListings.find((l) => l.id === featureId) ?? null;
  const addon = FEATURE_ADDONS.find((a) => a.days === featureDays)!;

  return (
    <div className="space-y-10">
      {savedListing && (
        <div className="flex items-center gap-4 rounded-2xl border border-success/30 bg-success-50 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success text-lg font-bold text-white">
            ✓
          </span>
          <div>
            <h2 className="text-xl">Your listing is saved</h2>
            <p className="text-sm text-ink-soft">
              Take Premium to send it for review. It goes live after our team checks it.
            </p>
          </div>
        </div>
      )}

      {msg && (
        <p
          role="status"
          className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-success-50 text-success' : 'bg-danger-50 text-danger'}`}
        >
          {msg.text}
        </p>
      )}
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}

      <section>
        <div className="text-left sm:text-center">
          <h2 className="text-[2rem] leading-tight">{sub ? 'Your plan' : 'Choose your plan'}</h2>
          <p className="text-ink-muted">
            {sub
              ? `${sub.plan.name} is active till ${date(sub.endsAt)}.`
              : 'Start free. Go Premium when you need more.'}
          </p>
        </div>

        {!data && !error && <div className="skeleton mx-auto mt-6 h-96 max-w-3xl rounded-2xl" />}

        {data && !data.onlineEnabled && (
          <p className="mx-auto mt-5 max-w-3xl rounded-lg bg-warn-50 p-3 text-sm text-warn">
            Online payment is not open yet. Call or WhatsApp us to buy a plan and we will switch it
            on for you.
          </p>
        )}

        {data && (
          <div className="mx-auto mt-6 grid max-w-3xl items-stretch gap-5 sm:grid-cols-2">
            <article
              className={`order-2 flex flex-col rounded-3xl border border-line bg-white p-6 sm:order-1 ${sub ? 'opacity-70' : ''}`}
            >
              <p className="text-xs font-bold tracking-[0.08em] text-ink-muted">FREE</p>
              <p className="mt-2 font-display text-5xl leading-none text-brand-900">₹0</p>
              <p className="mt-1 text-sm text-ink-muted">
                {freeListings > 0 ? 'Agents and builders' : 'Not for owners'}
              </p>
              <ul className="mt-5 space-y-3 text-[0.95rem]">
                <Feature on={freeListings > 0}>{freeListings} properties</Feature>
                <Feature on={freeLeads > 0}>{freeLeads} leads a month with number</Feature>
                <Feature on={false}>Premium badge</Feature>
                <Feature on={false}>WhatsApp lead alert</Feature>
                {role === 'individual' && <Feature on={false}>Owners cannot list on Free</Feature>}
              </ul>
              <span className="btn btn-outline mt-auto w-full cursor-default pt-3">
                {sub ? 'Free plan' : 'Your current plan'}
              </span>
            </article>

            {premium ? (
              <article className="relative order-1 flex flex-col rounded-3xl border-2 border-brand bg-gradient-to-b from-brand-50 to-white to-40% p-6 sm:order-2">
                <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-accent to-orange-400 px-3 py-1 text-xs font-bold text-white">
                  ★ {sub ? 'Active' : 'Recommended'}
                </span>
                <p className="text-xs font-bold tracking-[0.08em] text-brand">
                  {premium.name.toUpperCase()}
                </p>
                <p className="mt-2 flex items-end gap-1.5">
                  <span className="font-display text-5xl leading-none text-brand-900">
                    {rupees(premium.price)}
                  </span>
                  <span className="pb-1 font-semibold text-ink-muted">
                    / {period(premium.durationDays)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {premium.description || 'Owners, agents and builders'}
                </p>
                <ul className="mt-5 space-y-3 text-[0.95rem]">
                  <Feature>
                    <b>{premium.listingLimit}</b> properties in the plan
                  </Feature>
                  <Feature>
                    <b>{premium.leadLimit > 0 ? premium.leadLimit : 'Unlimited'}</b> leads with
                    number
                  </Feature>
                  {premium.featuredListings > 0 && (
                    <Feature>
                      <b>{premium.featuredListings}</b> featured listings for {premium.featuredDays}{' '}
                      days
                    </Feature>
                  )}
                  <Feature>Premium badge</Feature>
                  <Feature>Email and WhatsApp lead alert</Feature>
                  <Feature>Views and leads per listing</Feature>
                </ul>
                <button
                  type="button"
                  className="btn btn-accent mt-6 w-full py-3.5"
                  disabled={!data.onlineEnabled || busy !== null}
                  onClick={() =>
                    void pay(
                      premium.id,
                      `/me/plans/${premium.id}/checkout`,
                      undefined,
                      `Payment received. ${premium.name} is now active.`,
                    )
                  }
                >
                  {busy === premium.id
                    ? 'Opening…'
                    : sub
                      ? `Renew for ${rupees(premium.price)}`
                      : `Upgrade for ${rupees(premium.price)}`}
                </button>
              </article>
            ) : (
              <p className="order-1 rounded-3xl border border-dashed border-line-strong p-6 text-sm text-ink-muted">
                Plans will show here soon.
              </p>
            )}
          </div>
        )}

        {others.length > 0 && (
          <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
            {others.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4"
              >
                <div>
                  <b>{p.name}</b>
                  <p className="text-sm text-ink-muted">
                    {p.listingLimit} properties ·{' '}
                    {p.leadLimit > 0 ? `${p.leadLimit} leads` : 'unlimited leads'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={!data?.onlineEnabled || busy !== null}
                  onClick={() =>
                    void pay(
                      p.id,
                      `/me/plans/${p.id}/checkout`,
                      undefined,
                      `Payment received. ${p.name} is now active.`,
                    )
                  }
                >
                  {busy === p.id ? 'Opening…' : `${rupees(p.price)} / ${period(p.durationDays)}`}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-sm text-ink-muted">
          Prices include GST. Secure payment by Razorpay.
        </p>
      </section>

      {usage && (
        <section>
          <SectionTitle title="What you have used" />
          <div className="grid gap-3 sm:grid-cols-3">
            <UsageBar
              label={sub ? 'Listings posted in this plan' : 'Free listings posted'}
              used={usage.listings.used}
              limit={usage.listings.limit}
              note={
                usage.awaitingPlan > 0 ? (
                  <span className="font-semibold text-warn">
                    {usage.awaitingPlan} waiting for a plan
                  </span>
                ) : (
                  <span className="text-ink-muted">Deleting a listing does not free a slot</span>
                )
              }
            />
            <UsageBar
              label={sub ? 'Leads in this plan' : 'Leads this month'}
              used={usage.leads.used}
              limit={usage.leads.limit}
              note={
                usage.leads.locked > 0 ? (
                  <Link href="/dashboard/leads" className="font-semibold text-accent-700">
                    {usage.leads.locked} leads hidden
                  </Link>
                ) : (
                  <span className="text-ink-muted">All your leads are visible</span>
                )
              }
            />
            <UsageBar
              label="Live listings featured"
              used={
                liveListings.filter(
                  (l) => l.featuredUntil && new Date(l.featuredUntil) > new Date(),
                ).length
              }
              limit={liveListings.length}
              note={<span className="text-ink-muted">₹49 for 7 days · ₹99 for 1 month</span>}
            />
          </div>
        </section>
      )}

      <section id="feature">
        <SectionTitle
          title="Feature a listing"
          text="Pick one of your live listings. It shows at the top of search and on the home page."
        />
        {live.loading && <div className="skeleton h-24 rounded-2xl" />}
        {!live.loading && liveListings.length === 0 && (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-ink-muted">
            You have no live listings yet. Listings can be featured once our team puts them live.
          </p>
        )}
        {liveListings.length > 0 && (
          <div className="space-y-5 rounded-2xl border border-line bg-white p-5">
            <fieldset>
              <legend className="mb-3 font-semibold">1. Choose listing</legend>
              <div className="grid gap-2">
                {liveListings.map((l) => {
                  const on = l.id === featureId;
                  const until =
                    l.featuredUntil && new Date(l.featuredUntil) > new Date()
                      ? l.featuredUntil
                      : null;
                  return (
                    <label
                      key={l.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${on ? 'border-2 border-brand bg-brand-50' : 'border-line'}`}
                    >
                      <input
                        type="radio"
                        name="feature-listing"
                        className="h-4 w-4 accent-[var(--color-brand)]"
                        checked={on}
                        onChange={() => setFeatureId(l.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{l.title}</b>
                        <span className="text-sm text-ink-muted">
                          {formatPrice(l.price, l.listingType)} · {l.views ?? 0} views ·{' '}
                          {l.enquiryCount} leads
                        </span>
                      </span>
                      {until && (
                        <span className="shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700">
                          Featured till {date(until)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 font-semibold">2. Choose time</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {FEATURE_ADDONS.map((a) => (
                  <label
                    key={a.days}
                    className={`cursor-pointer rounded-2xl border p-4 ${featureDays === a.days ? 'border-2 border-brand bg-brand-50' : 'border-line'}`}
                  >
                    <input
                      type="radio"
                      name="feature-days"
                      className="sr-only"
                      checked={featureDays === a.days}
                      onChange={() => setFeatureDays(a.days)}
                    />
                    <b>{a.label}</b>
                    <span className="block text-sm text-ink-muted">Any plan</span>
                    <span className="mt-1 block font-display text-2xl">{rupees(a.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-muted">
                {chosen
                  ? `Featured for ${addon.label} from ${chosen.featuredUntil && new Date(chosen.featuredUntil) > new Date() ? 'when the current one ends' : 'today'}`
                  : 'Pick a listing first'}
              </span>
              <button
                type="button"
                className="btn btn-accent w-full sm:w-auto"
                disabled={!chosen || !data?.onlineEnabled || busy !== null}
                onClick={() =>
                  chosen &&
                  void pay(
                    `feature-${chosen.id}`,
                    `/me/properties/${chosen.id}/feature-checkout`,
                    { days: featureDays },
                    `Payment received. “${chosen.title}” is featured.`,
                  )
                }
              >
                {busy?.startsWith('feature-')
                  ? 'Opening…'
                  : `Pay ${rupees(addon.price)} and feature`}
              </button>
            </div>
          </div>
        )}
      </section>

      {data && data.payments.length > 0 && (
        <section>
          <SectionTitle title="Payment history" />
          <ul className="divide-y divide-line rounded-xl border border-line">
            {data.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
              >
                <span>
                  <b>{p.plan.name}</b> · {rupees(p.amount)}
                  {p.property && <span className="text-ink-muted"> · {p.property.title}</span>}
                  <span className="block text-xs text-ink-muted">
                    {date(p.paidAt ?? p.createdAt)}
                    {p.paymentId && ` · ${p.paymentId}`}
                  </span>
                </span>
                <Pill status={PAY_TONE[p.status]} label={PAY_LABEL[p.status]} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function MyPlanPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <MyPlan />
    </Suspense>
  );
}
