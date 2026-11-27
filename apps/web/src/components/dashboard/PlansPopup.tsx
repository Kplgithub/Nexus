'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LISTING_ROLES,
  MAX_COMPARE_PLANS,
  SEARCH_RANKS,
  type ListingRole,
  type MySubscription,
  type Plan,
} from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { useSession } from '@/components/session/SessionProvider';
import { PartnerBadge, RefreshedChip } from '@/components/property/plan-perks';
import { AutoRenewToggle, canAutoRenew, PayMessage, rupees, useCheckout } from './membership';

type Res = { plans: Plan[]; subscription: MySubscription; onlineEnabled: boolean };

/**
 * When the popup opens on Post Property: 25 seconds after the page opens, then 1 minute
 * after the first close, then 2 minutes after the second. After the third close it stays
 * shut for this visit.
 */
export const POPUP_DELAYS_MS = [25_000, 60_000, 120_000];

/* ---------------- Feature rows: one list for the table, the phone list and samples ---------------- */

function Yes() {
  return (
    <span className="inline-grid h-[26px] w-[26px] place-items-center rounded-full bg-success-50 text-success">
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m5 12.5 4.5 4.5L19 7" />
      </svg>
      <span className="sr-only">Yes</span>
    </span>
  );
}
function No() {
  return (
    <span className="inline-grid h-[26px] w-[26px] place-items-center rounded-full bg-surface text-ink-muted">
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
      <span className="sr-only">No</span>
    </span>
  );
}
function Bars({ level }: { level: number }) {
  return (
    <span className="mr-2 inline-flex items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[5px] rounded-sm ${i <= level ? 'bg-brand' : 'bg-[#dbe2f0]'}`}
          style={{ height: 7 + i * 3 }}
        />
      ))}
    </span>
  );
}

export const validity = (days: number) => `${days} days`;

export const PLAN_ROWS: {
  label: string;
  hint?: string;
  value: (p: Plan) => React.ReactNode;
}[] = [
  {
    label: 'Live listings at one time',
    hint: 'Unlist or sold frees a slot',
    value: (p) => <b className="text-[1.05em]">{p.listingLimit}</b>,
  },
  { label: 'Plan validity', value: (p) => validity(p.durationDays) },
  {
    label: 'Buyer leads with contact',
    value: (p) => (p.leadLimit > 0 ? `${p.leadLimit} in plan` : 'Unlimited'),
  },
  {
    label: 'Position on search',
    hint: 'Above listings without a plan',
    value: (p) => (
      <span className="inline-flex items-center">
        <Bars level={p.searchRank} />
        {SEARCH_RANKS[p.searchRank] ?? 'Normal'}
      </span>
    ),
  },
  {
    label: 'Premium Partner badge',
    hint: 'On your listing cards in search',
    value: (p) => (p.partnerBadge ? <Yes /> : <No />),
  },
  {
    label: 'Auto refresh',
    hint: 'Listing moves back to the top',
    value: (p) => (p.autoRefreshDays > 0 ? `Every ${p.autoRefreshDays} days` : <No />),
  },
  { label: 'Instant lead alert on email', value: () => <Yes /> },
  { label: 'Views and leads report', value: () => <Yes /> },
];

/* ---------------- Sample: how a listing looks with and without a plan ---------------- */

function SampleCard({ plan }: { plan: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#c7d2fe] to-[#fde2c8]">
        {plan && <PartnerBadge className="absolute left-3 top-3" />}
      </div>
      <div className="p-4">
        <p className="text-xl font-bold">
          ₹18,000 <span className="text-sm font-semibold text-ink-muted">/ month</span>
        </p>
        <p className="mt-1 font-semibold">2 BHK Flat for rent</p>
        <p className="text-sm text-ink-muted">Vaishali Nagar, Jaipur</p>
        <p className="mt-2">
          {plan ? (
            <RefreshedChip label="Updated today" />
          ) : (
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft">
              Posted 12 days ago
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function Sample({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-5 sm:p-8">
      <button type="button" onClick={onBack} className="text-sm font-bold text-brand">
        ‹ Back to plans
      </button>
      <h2 className="mt-2 text-2xl text-brand-900 sm:text-3xl">How your listing looks</h2>
      <p className="mt-1 text-sm text-ink-muted">Same search, same locality.</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold tracking-wider text-ink-muted">WITHOUT A PLAN</p>
          <SampleCard plan={false} />
          <p className="mt-2 text-sm text-ink-muted">
            Lower in search, no badge, date never changes.
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wider text-accent-700">
            WITH A PLAN THAT HAS THESE PERKS
          </p>
          <SampleCard plan />
          <p className="mt-2 text-sm text-ink-soft">
            Higher in search, Premium Partner badge, and auto refresh keeps it &ldquo;Updated
            today&rdquo;.
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-line p-4">
        <p className="font-bold">Search order on NEXUS</p>
        <ol className="mt-2 space-y-1.5 text-sm">
          <li>1. Featured listings (paid add-on)</li>
          {[...SEARCH_RANKS].reverse().map((r, i) => (
            <li key={r}>
              {i + 2}. {r === 'Normal' ? 'Normal or no plan' : `${r} plans`}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-muted">
          Inside each group, the newest or most recently refreshed listing comes first.
        </p>
      </div>
    </div>
  );
}

/* ---------------- The popup ---------------- */

function Header() {
  return (
    <div className="px-5 pb-3 pt-2 text-center sm:px-10 sm:pb-5 sm:pt-7">
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand sm:text-xs">
        NEXUS Membership
      </span>
      <h2
        id="plans-popup-title"
        className="mt-2.5 text-[1.55rem] leading-tight text-brand-900 sm:text-[2.1rem]"
      >
        You don&rsquo;t have an active plan yet
      </h2>
      <p className="mt-2 text-[13.5px] text-ink-soft sm:text-base">
        Pick a plan to publish your property and reach more buyers and tenants in Jaipur.
      </p>
    </div>
  );
}

function PlansView({
  plans,
  onlineEnabled,
  busy,
  onBuy,
  onSample,
}: {
  plans: Plan[];
  onlineEnabled: boolean;
  busy: string | null;
  onBuy: (p: Plan) => void;
  onSample: () => void;
}) {
  const recommended = plans.find((p) => p.recommended)?.id ?? null;
  const [picked, setPicked] = useState(recommended ?? plans[0]?.id);
  const [compareAll, setCompareAll] = useState(false);
  const sel = plans.find((p) => p.id === picked) ?? plans[0]!;
  const buyLabel = (p: Plan) => (busy === p.id ? 'Opening…' : 'Buy now');

  return (
    <>
      <Header />
      {!onlineEnabled && (
        <p className="mx-5 mb-3 rounded-lg bg-warn-50 p-3 text-sm text-warn sm:mx-9">
          Online payment is not open yet. Call or WhatsApp us to buy a plan.
        </p>
      )}

      {/* Desktop: plans as columns, features as rows */}
      <div className="mx-9 hidden overflow-hidden rounded-2xl border border-[#e5e9f2] lg:block">
        <table className="w-full table-fixed border-collapse text-[14.5px]">
          <thead>
            <tr>
              <th className="w-[30%] bg-white px-5 pb-5 text-left align-bottom font-normal">
                <span className="text-[13px] text-ink-muted">Compare plans</span>
                <span className="block text-base font-extrabold text-brand-900">What you get</span>
              </th>
              {plans.map((p) => {
                const rec = p.id === recommended;
                return (
                  <th
                    key={p.id}
                    className={`relative px-4 pb-4 pt-8 text-center align-top font-normal ${rec ? 'bg-accent-50 shadow-[inset_0_0_0_2px_#f97316]' : 'bg-surface'}`}
                    style={{ borderTop: `4px solid ${rec ? '#f97316' : '#1e40af'}` }}
                  >
                    {rec && (
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-b-lg bg-accent px-3 py-1 text-[11px] font-extrabold tracking-wider text-white">
                        MOST CHOSEN
                      </span>
                    )}
                    <span className="block text-lg font-extrabold text-brand-900">{p.name}</span>
                    <span className="mt-1.5 block h-5 text-sm font-semibold text-ink-muted line-through">
                      {p.mrp > p.price ? rupees(p.mrp) : ''}
                    </span>
                    <span className="block text-[2rem] font-extrabold leading-tight text-ink">
                      {rupees(p.price)}
                    </span>
                    <span className="block text-[13px] text-ink-muted">
                      for {validity(p.durationDays)}
                    </span>
                    <button
                      type="button"
                      className={`btn mt-3.5 w-full py-2.5 ${rec ? 'btn-accent' : 'btn-primary'}`}
                      disabled={!onlineEnabled || busy !== null}
                      onClick={() => onBuy(p)}
                    >
                      {buyLabel(p)}
                    </button>
                    <button
                      type="button"
                      onClick={onSample}
                      className="mt-2 text-[13px] font-bold text-brand hover:underline"
                    >
                      See sample
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map((r, i) => (
              <tr
                key={r.label}
                className={`border-t border-[#eef1f6] ${i % 2 ? 'bg-white' : 'bg-[#fbfcfe]'}`}
              >
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <span className="block font-bold">{r.label}</span>
                  {r.hint && <span className="block text-xs text-ink-muted">{r.hint}</span>}
                </th>
                {plans.map((p) => (
                  <td
                    key={p.id}
                    className={`px-2 text-center font-semibold text-ink-soft ${p.id === recommended ? 'border-x-2 border-accent bg-[#fffaf4]' : ''}`}
                  >
                    {r.value(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone and tablet: swipe the plans, the picked one's features below */}
      <div className="lg:hidden">
        {compareAll ? (
          <div className="pb-4">
            <div className="flex items-center justify-between px-5 pb-2">
              <button
                type="button"
                className="text-sm font-bold text-brand"
                onClick={() => setCompareAll(false)}
              >
                ‹ Back
              </button>
              <span className="text-xs text-ink-muted">Swipe sideways to see all plans →</span>
            </div>
            <div className="overflow-x-auto border-t border-line">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-32 min-w-32 border-r border-line bg-white" />
                    {plans.map((p) => (
                      <th
                        key={p.id}
                        className={`min-w-[104px] px-1.5 py-2.5 text-center ${p.id === recommended ? 'bg-accent-50' : 'bg-surface'}`}
                        style={{
                          borderTop: `4px solid ${p.id === recommended ? '#f97316' : '#1e40af'}`,
                        }}
                      >
                        <span className="block text-[13.5px] font-extrabold">{p.name}</span>
                        <span className="block text-base font-extrabold">{rupees(p.price)}</span>
                        <span className="block text-[10.5px] font-normal text-ink-muted">
                          {validity(p.durationDays)}
                        </span>
                        <button
                          type="button"
                          className={`btn btn-sm mt-1.5 w-full ${p.id === recommended ? 'btn-accent' : 'btn-primary'}`}
                          disabled={!onlineEnabled || busy !== null}
                          onClick={() => onBuy(p)}
                        >
                          {busy === p.id ? '…' : 'Buy'}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map((r) => (
                    <tr key={r.label} className="border-t border-[#eef1f6]">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-r border-line bg-white p-2.5 text-left font-bold"
                      >
                        {r.label}
                      </th>
                      {plans.map((p) => (
                        <td
                          key={p.id}
                          className={`px-1 text-center font-semibold text-ink-soft ${p.id === recommended ? 'bg-[#fffaf4]' : ''}`}
                        >
                          {r.value(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 pt-3">
              {plans.map((p) => {
                const rec = p.id === recommended;
                const on = p.id === sel.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked(p.id)}
                    className={`relative w-[132px] shrink-0 snap-start rounded-2xl p-3 text-left ${on ? 'border-2 border-accent bg-accent-50' : 'border border-line bg-white'}`}
                  >
                    {rec && (
                      <span className="absolute -top-2.5 left-3 rounded-lg bg-accent px-2 py-0.5 text-[9.5px] font-extrabold tracking-wider text-white">
                        MOST CHOSEN
                      </span>
                    )}
                    <span className="block text-[15px] font-extrabold text-brand-900">
                      {p.name}
                    </span>
                    <span className="mt-1 block h-4 text-[11.5px] text-ink-muted line-through">
                      {p.mrp > p.price ? rupees(p.mrp) : ''}
                    </span>
                    <span className="block text-[1.35rem] font-extrabold">{rupees(p.price)}</span>
                    <span className="block text-[11.5px] text-ink-muted">
                      {validity(p.durationDays)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-5 pt-2">
              <div className="mb-1 mt-2 flex items-center justify-between">
                <p className="text-sm font-extrabold text-accent-700">{sel.name} plan includes</p>
                {plans.length > 1 && (
                  <button
                    type="button"
                    className="text-[12.5px] font-bold text-brand"
                    onClick={() => setCompareAll(true)}
                  >
                    Compare all ›
                  </button>
                )}
              </div>
              <ul>
                {PLAN_ROWS.map((r) => (
                  <li
                    key={r.label}
                    className="flex items-center justify-between gap-3 border-t border-[#eef1f6] py-2.5"
                  >
                    <span>
                      <span className="block text-[13.5px] font-bold">{r.label}</span>
                      {r.hint && <span className="block text-[11px] text-ink-muted">{r.hint}</span>}
                    </span>
                    <span className="whitespace-nowrap text-right text-[13.5px] font-semibold text-ink-soft">
                      {r.value(sel)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sticky bottom-0 border-t border-[#eef1f6] bg-white px-5 pb-4 pt-3 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]">
              <button
                type="button"
                className={`btn w-full py-3.5 text-base ${sel.id === recommended ? 'btn-accent' : 'btn-primary'}`}
                disabled={!onlineEnabled || busy !== null}
                onClick={() => onBuy(sel)}
              >
                {busy === sel.id ? 'Opening…' : `Buy ${sel.name} · ${rupees(sel.price)}`}
              </button>
              <div className="mt-2 flex justify-between text-[11.5px] text-ink-muted">
                <span>Secure payment by Razorpay</span>
                <button type="button" onClick={onSample} className="font-bold text-brand">
                  See sample
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden items-center justify-between px-9 pb-6 pt-4 text-[13px] text-ink-muted lg:flex">
        <span>Secure payment by Razorpay · Prices include GST</span>
        <span>
          Want one listing on top? <b className="text-accent-700">Featured</b> is a separate add-on.
        </span>
      </div>
    </>
  );
}

/**
 * Plans popup for Post Property. Shows only to owners, agents and builders with no plan on,
 * on the timings in POPUP_DELAYS_MS. Nothing shows if the plans do not load.
 */
export function PlansPopup({ delays = POPUP_DELAYS_MS }: { delays?: number[] }) {
  const { user } = useSession();
  const lister = !!user && (LISTING_ROLES as readonly string[]).includes(user.role);
  const { data, reload } = useApi<Res>(lister ? '/me/plans' : null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const [view, setView] = useState<'plans' | 'sample'>('plans');
  const [paid, setPaid] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const { buyPlan, busy, msg } = useCheckout(() => {
    setPaid(true);
    setOpen(false);
    reload();
  });

  // The free (₹0) plan is on by itself, so the popup only offers paid plans.
  const plans = (data?.plans ?? [])
    .filter((p) => p.price > 0 && p.roles.includes(user?.role as ListingRole))
    .slice(0, MAX_COMPARE_PLANS);
  const eligible = lister && !!data && !data.subscription && plans.length > 0 && !paid;

  // Schedule the next showing: 25 s on arrival, then 1 min and 2 min after each close.
  useEffect(() => {
    if (!eligible || open || shown >= delays.length) return;
    const t = window.setTimeout(() => {
      setView('plans');
      setOpen(true);
      setShown((n) => n + 1);
    }, delays[shown]);
    return () => window.clearTimeout(t);
  }, [eligible, open, shown, delays]);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open)
    return paid && msg ? (
      <div className="mb-4">
        <PayMessage msg={msg} />
      </div>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center lg:items-start lg:p-8"
      role="presentation"
    >
      <div className="absolute inset-0 bg-[rgba(11,26,63,0.55)]" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Membership plans"
        ref={boxRef}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[22px] bg-white shadow-2xl outline-none lg:max-h-[calc(100vh-4rem)] lg:max-w-[1180px] lg:rounded-[18px]"
      >
        <div
          className="mx-auto mt-2 h-[5px] w-11 rounded-full bg-line-strong lg:hidden"
          aria-hidden
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink-soft hover:bg-line lg:right-4 lg:top-4"
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {msg && !msg.ok && (
          <div className="mx-5 mt-12 lg:mx-9">
            <PayMessage msg={msg} />
          </div>
        )}
        {view === 'plans' && (data?.onlineEnabled ?? false) && plans.some(canAutoRenew) && (
          <div className="mx-5 mt-12 lg:mx-9 lg:mt-14">
            <AutoRenewToggle on={autoRenew} onChange={setAutoRenew} />
          </div>
        )}
        {view === 'sample' ? (
          <Sample onBack={() => setView('plans')} />
        ) : (
          <PlansView
            plans={plans}
            onlineEnabled={data?.onlineEnabled ?? false}
            busy={busy}
            onSample={() => setView('sample')}
            onBuy={(p) => void buyPlan(p, autoRenew, `Payment received. ${p.name} is now active.`)}
          />
        )}
      </div>
    </div>
  );
}
