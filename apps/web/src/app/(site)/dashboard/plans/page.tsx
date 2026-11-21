'use client';

import { useState } from 'react';
import type { CheckoutOrder, MySubscription, Payment, Plan } from '@nexus/shared';
import { errMsg, useApi } from '@/components/admin/useApi';
import { Pill, SectionTitle } from '@/components/dashboard/DashboardShell';
import { apiFetch } from '@/lib/client-api';

type Res = {
  plans: Plan[];
  subscription: MySubscription;
  payments: Payment[];
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

export default function MyPlanPage() {
  const { data, error, reload } = useApi<Res>('/me/plans');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function buy(plan: Plan) {
    setBusy(plan.id);
    setMsg(null);
    try {
      const [{ data: order }, Razorpay] = await Promise.all([
        apiFetch<CheckoutOrder>(`/me/plans/${plan.id}/checkout`, { method: 'POST' }),
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
            setMsg({ ok: true, text: `Payment received. ${plan.name} is now active.` });
            reload();
          } catch (err) {
            setMsg({
              ok: false,
              text: `${errMsg(err)} If money was taken, it will be checked and your plan switched on.`,
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
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="My plan"
          text="A paid plan lets you keep more listings live and feature some of them."
        />
        {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
        {msg && (
          <p
            role="status"
            className={`mb-4 rounded-lg p-3 text-sm ${msg.ok ? 'bg-success-50 text-success' : 'bg-danger-50 text-danger'}`}
          >
            {msg.text}
          </p>
        )}
        {!data && !error && <div className="skeleton h-24 rounded-2xl" />}
        {data &&
          (sub ? (
            <div className="rounded-2xl bg-brand-900 p-6 text-white">
              <p className="text-sm text-white/70">Current plan</p>
              <p className="mt-1 text-2xl font-bold">{sub.plan.name}</p>
              <p className="mt-2 text-sm text-white/80">
                Up to {sub.plan.listingLimit} live listings
                {sub.plan.featuredListings > 0 && ` · ${sub.plan.featuredListings} featured`} ·
                valid till <b className="text-white">{date(sub.endsAt)}</b>
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-ink-muted">
              You are on the free plan.
            </p>
          ))}
      </section>

      {data && data.plans.length > 0 && (
        <section>
          <SectionTitle title={sub ? 'Renew or upgrade' : 'Choose a plan'} />
          {!data.onlineEnabled && (
            <p className="mb-4 rounded-lg bg-warn-50 p-3 text-sm text-warn">
              Online payment is not open yet. Call or WhatsApp us to buy a plan and we will switch
              it on for you.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((p) => (
              <article key={p.id} className="flex flex-col rounded-2xl border border-line p-5">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-[1.8rem] font-bold text-brand-900">
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
                  <li className="text-ink-muted">Price includes GST</li>
                </ul>
                <button
                  type="button"
                  className="btn btn-primary mt-5"
                  disabled={!data.onlineEnabled || busy !== null}
                  onClick={() => buy(p)}
                >
                  {busy === p.id ? 'Opening…' : `Pay ${rupees(p.price)}`}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

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
