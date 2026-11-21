'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { CheckoutOrder } from '@nexus/shared';
import { errMsg } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayCtor = new (o: Record<string, unknown>) => {
  open: () => void;
  on: (e: string, cb: () => void) => void;
};

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const longDate = (iso: string) =>
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

/** Opens Razorpay for a plan or a featured listing and verifies the payment afterwards. */
export function useCheckout(onPaid: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
            onPaid();
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

  return { pay, busy, msg };
}

export function PayMessage({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p
      role="status"
      className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-success-50 text-success' : 'bg-danger-50 text-danger'}`}
    >
      {msg.text}
    </p>
  );
}

const TABS = [
  { href: '/dashboard/plans', label: 'Plan & usage' },
  { href: '/dashboard/feature', label: 'Feature a listing' },
  { href: '/dashboard/payments', label: 'Payments' },
];

/** Page title plus the three Membership tabs. */
export function MembershipHeader({ title, text }: { title: string; text?: string }) {
  const path = usePathname();
  return (
    <header className="mb-5">
      <p className="text-[13px] text-ink-muted">Membership</p>
      <h1 className="text-[1.8rem] leading-tight sm:text-[2.1rem]">{title}</h1>
      {text && <p className="mt-1 text-sm text-ink-muted sm:text-[15px]">{text}</p>}
      <nav aria-label="Membership" className="mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const on = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? 'page' : undefined}
              className={`shrink-0 rounded-[11px] px-4 py-2 text-[13.5px] font-bold ${
                on
                  ? 'bg-brand-900 text-white'
                  : 'border border-[#e6eaf2] bg-white text-ink-soft hover:border-brand/40'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
