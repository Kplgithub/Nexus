'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import {
  FEATURE_ADDONS,
  FREE_LEADS_PER_MONTH,
  LISTING_LIMITS,
  type MySubscription,
  type Payment,
  type Plan,
  type PlanUsage,
} from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { SectionTitle, useDashboardData } from '@/components/dashboard/DashboardShell';
import {
  MembershipHeader,
  PayMessage,
  longDate as date,
  rupees,
  useCheckout,
} from '@/components/dashboard/membership';
import { useSession } from '@/components/session/SessionProvider';

type Res = {
  plans: Plan[];
  subscription: MySubscription;
  payments: Payment[];
  usage: PlanUsage;
  featureAddons: typeof FEATURE_ADDONS;
  onlineEnabled: boolean;
};

const period = (days: number) =>
  days === 30
    ? 'month'
    : days === 365 || days === 366
      ? 'year'
      : days % 30 === 0
        ? `${days / 30} months`
        : `${days} days`;

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
  const router = useRouter();
  const savedId = params.get('saved');
  const oldFeatureLink = params.get('feature');
  const { user } = useSession();
  const { data, error, reload } = useApi<Res>('/me/plans');
  const dash = useDashboardData();
  const { pay, busy, msg } = useCheckout(() => {
    reload();
    dash.reload();
  });

  // Old links (/dashboard/plans?feature=<id>) now open the Feature a listing page.
  useEffect(() => {
    if (oldFeatureLink) router.replace(`/dashboard/feature?listing=${oldFeatureLink}`);
  }, [oldFeatureLink, router]);

  const sub = data?.subscription;
  const usage = data?.usage;
  const role = user?.role ?? 'individual';
  const freeListings = LISTING_LIMITS[role];
  const freeLeads = FREE_LEADS_PER_MONTH[role];
  const plans = data?.plans ?? [];
  // The first plan (admin sort order, then price) is the one we recommend.
  const recommendedId = plans[0]?.id;
  const savedListing = savedId ? usage && usage.awaitingPlan > 0 : false;

  return (
    <div className="space-y-8">
      <MembershipHeader
        title={sub ? 'Your plan' : 'Choose your plan'}
        text={
          sub
            ? `${sub.plan.name} is active till ${date(sub.endsAt)}.`
            : 'Start free. Go Premium when you need more.'
        }
      />
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

      <PayMessage msg={msg} />
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}

      <section>
        {!data && !error && <div className="skeleton h-96 rounded-2xl" />}

        {data && !data.onlineEnabled && (
          <p className="mb-5 max-w-3xl rounded-lg bg-warn-50 p-3 text-sm text-warn">
            Online payment is not open yet. Call or WhatsApp us to buy a plan and we will switch it
            on for you.
          </p>
        )}

        {data && (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
            {plans.map((p) => {
              const isActive = sub?.plan.id === p.id;
              const highlight = isActive || (!sub && p.id === recommendedId);
              return (
                <article
                  key={p.id}
                  className={`relative flex w-[82%] shrink-0 snap-center flex-col rounded-3xl p-6 sm:w-auto ${highlight ? 'border-2 border-brand bg-gradient-to-b from-brand-50 to-white to-40%' : 'border border-line bg-white'}`}
                >
                  {highlight && (
                    <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-accent to-orange-400 px-3 py-1 text-xs font-bold text-white">
                      ★ {isActive ? 'Active' : 'Recommended'}
                    </span>
                  )}
                  <p className="pr-28 text-xs font-bold tracking-[0.08em] text-brand">
                    {p.name.toUpperCase()}
                  </p>
                  <p className="mt-2 flex flex-wrap items-end gap-x-1.5">
                    <span className="font-display text-5xl leading-none text-brand-900">
                      {rupees(p.price)}
                    </span>
                    <span className="pb-1 font-semibold text-ink-muted">
                      / {period(p.durationDays)}
                    </span>
                  </p>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-ink-muted">
                    {p.description || 'Owners, agents and builders'}
                  </p>
                  <ul className="mb-6 mt-4 space-y-3 text-[0.95rem]">
                    <Feature>
                      <b>{p.listingLimit}</b> properties live at a time
                    </Feature>
                    <Feature>
                      <b>{p.leadLimit > 0 ? p.leadLimit : 'Unlimited'}</b> leads with number
                    </Feature>
                    {p.featuredListings > 0 && (
                      <Feature>
                        <b>{p.featuredListings}</b> featured listings for {p.featuredDays} days
                      </Feature>
                    )}
                    <Feature>Premium badge</Feature>
                    <Feature>Email and WhatsApp lead alert</Feature>
                    <Feature>Views and leads per listing</Feature>
                  </ul>
                  <button
                    type="button"
                    className={`btn mt-auto w-full py-3.5 ${highlight ? 'btn-accent' : 'btn-outline'}`}
                    disabled={!data.onlineEnabled || busy !== null}
                    onClick={() =>
                      void pay(
                        p.id,
                        `/me/plans/${p.id}/checkout`,
                        undefined,
                        `Payment received. ${p.name} is now active.`,
                      )
                    }
                  >
                    {busy === p.id
                      ? 'Opening…'
                      : isActive
                        ? `Renew for ${rupees(p.price)}`
                        : `${sub ? 'Switch' : 'Upgrade'} for ${rupees(p.price)}`}
                  </button>
                </article>
              );
            })}

            <article
              className={`flex w-[82%] shrink-0 snap-center flex-col rounded-3xl border border-line bg-white p-6 sm:w-auto ${sub ? 'opacity-70' : ''}`}
            >
              <p className="text-xs font-bold tracking-[0.08em] text-ink-muted">FREE</p>
              <p className="mt-2 font-display text-5xl leading-none text-brand-900">₹0</p>
              <p className="mt-1 min-h-[2.5rem] text-sm text-ink-muted">
                {freeListings > 0 ? 'Agents and builders' : 'Not for owners'}
              </p>
              <ul className="mb-6 mt-4 space-y-3 text-[0.95rem]">
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

            {plans.length === 0 && (
              <p className="rounded-3xl border border-dashed border-line-strong p-6 text-sm text-ink-muted">
                Plans will show here soon.
              </p>
            )}
          </div>
        )}
        {data && plans.length > 1 && (
          <p className="mt-1 text-center text-xs text-ink-muted sm:hidden">
            Swipe to see all {plans.length + 1} plans
          </p>
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
              label={sub ? 'Listings live now' : 'Free listings posted'}
              used={usage.listings.used}
              limit={usage.listings.limit}
              note={
                usage.awaitingPlan > 0 ? (
                  <span className="font-semibold text-warn">
                    {usage.awaitingPlan} waiting for a plan
                  </span>
                ) : (
                  <span className="text-ink-muted">
                    {sub
                      ? 'Unlist, sell or rent one to free a place'
                      : 'Deleting a listing does not free a slot'}
                  </span>
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
            <Link
              href="/dashboard/feature"
              className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent-50 to-white p-4 hover:border-accent"
            >
              <p className="text-sm font-semibold text-ink-muted">Feature a listing</p>
              <p className="mt-1 text-lg font-bold">Show at the top of search</p>
              <p className="mt-2 text-sm font-semibold text-accent-700">
                ₹49 for 7 days · ₹99 for 1 month →
              </p>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default function PlanAndUsagePage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <MyPlan />
    </Suspense>
  );
}
