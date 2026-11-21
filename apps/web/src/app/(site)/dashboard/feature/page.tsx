'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { FEATURE_ADDONS, formatPrice, type FeatureAddonDays, type OwnListing } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { useDashboardData } from '@/components/dashboard/DashboardShell';
import {
  MembershipHeader,
  PayMessage,
  longDate,
  rupees,
  useCheckout,
} from '@/components/dashboard/membership';
import { CheckIcon, ImageIcon, ShieldIcon } from '@/components/icons';

const DAY = 86_400_000;

function FeatureListing() {
  const params = useSearchParams();
  const plans = useApi<{
    onlineEnabled: boolean;
    featureAddons: { days: FeatureAddonDays; price: number; label: string }[];
  }>('/me/plans');
  const addons: { days: FeatureAddonDays; price: number; label: string }[] = plans.data
    ?.featureAddons ?? [...FEATURE_ADDONS];
  const live = useApi<OwnListing[]>('/me/properties?status=published');
  const dash = useDashboardData();
  const [picked, setPicked] = useState<string | null>(params.get('listing'));
  const [days, setDays] = useState<FeatureAddonDays>(30);
  const { pay, busy, msg } = useCheckout(() => {
    live.reload();
    dash.reload();
  });

  const listings = live.data ?? [];
  const [now] = useState(() => Date.now());
  const until = (l: OwnListing) =>
    l.featuredUntil && new Date(l.featuredUntil).getTime() > now ? l.featuredUntil : null;
  const chosen = listings.find((l) => l.id === picked) ?? null;
  const addon = addons.find((a) => a.days === days) ?? addons[0]!;
  const startsAt = chosen && until(chosen) ? new Date(until(chosen)!).getTime() : now;
  const endsAt = new Date(startsAt + days * DAY).toISOString();
  const online = plans.data?.onlineEnabled ?? false;

  return (
    <div>
      <MembershipHeader
        title="Feature a listing"
        text="Your listing shows at the top of search and on the home page. Pay only for the days you want."
      />
      <div className="space-y-4">
        <PayMessage msg={msg} />
        {plans.data && !online && (
          <p className="rounded-xl bg-warn-50 p-3 text-sm text-warn">
            Online payment is not open yet. Call or WhatsApp us and we will feature it for you.
          </p>
        )}
      </div>

      {live.loading && <div className="skeleton mt-4 h-72 rounded-[18px]" />}
      {!live.loading && listings.length === 0 && (
        <div className="mt-4 rounded-[18px] border border-dashed border-line-strong bg-white p-8 text-center">
          <p className="font-semibold">No live listings yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            A listing can be featured once our team puts it live.
          </p>
          <Link href="/dashboard/listings" className="btn btn-outline mt-4">
            See my listings
          </Link>
        </div>
      )}

      {listings.length > 0 && (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0 rounded-[18px] border border-[#e6eaf2] bg-white p-4 sm:p-6">
            <fieldset className="min-w-0">
              <legend className="text-[15px] font-bold">1. Pick a live listing</legend>
              <div className="mt-3 grid grid-cols-1 gap-2.5">
                {listings.map((l) => {
                  const on = l.id === picked;
                  const cover = l.images[l.coverImageIndex] ?? l.images[0];
                  const till = until(l);
                  return (
                    <label
                      key={l.id}
                      className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-[14px] p-3 sm:flex-nowrap transition-colors ${
                        on
                          ? 'border-2 border-brand bg-brand-50/60'
                          : 'border border-[#e6eaf2] hover:border-brand/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feature-listing"
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                        checked={on}
                        onChange={() => setPicked(l.id)}
                      />
                      <span className="relative hidden h-[52px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-surface sm:block">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt=""
                            fill
                            sizes="70px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-ink-muted">
                            <ImageIcon size={20} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[14.5px] font-semibold">
                          {l.title} · {l.locality.name}
                        </b>
                        <span className="text-[12.5px] text-ink-muted">
                          {formatPrice(l.price, l.listingType)} · {l.views ?? 0} views ·{' '}
                          {l.enquiryCount} leads
                        </span>
                      </span>
                      {till && (
                        <span className="ml-7 shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-bold text-accent-700 sm:ml-0">
                          Featured till {longDate(till)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-6 min-w-0">
              <legend className="text-[15px] font-bold">2. Choose how long</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {addons.map((a) => {
                  const on = a.days === days;
                  const best = a.days === 30;
                  return (
                    <label
                      key={a.days}
                      className={`relative cursor-pointer rounded-[14px] p-4 ${
                        on
                          ? best
                            ? 'border-2 border-accent bg-accent-50/60'
                            : 'border-2 border-brand bg-brand-50/60'
                          : 'border border-[#e6eaf2]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feature-days"
                        className="sr-only"
                        checked={on}
                        onChange={() => setDays(a.days)}
                      />
                      {best && (
                        <span className="absolute -top-2.5 right-3 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-brand-900">
                          Best value
                        </span>
                      )}
                      <b className="block font-semibold">{a.label}</b>
                      <span className="block font-display text-[1.9rem] leading-tight">
                        {rupees(a.price)}
                      </span>
                      <span className="text-[12.5px] text-ink-muted">
                        ₹{(a.price / a.days).toFixed(1).replace('.0', '')} a day
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="min-w-0 space-y-4 xl:sticky xl:top-24">
            <div className="rounded-[18px] bg-gradient-to-br from-brand-900 to-brand p-5 text-white sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-orange-300">
                Summary
              </p>
              {chosen ? (
                <>
                  <p className="mt-2.5 font-bold">
                    {chosen.title} · {chosen.locality.name}
                  </p>
                  <p className="mt-1 text-[13px] text-white/75">
                    Featured for {addon.label}
                    {until(chosen) ? ' after the current one ends' : ''}, till {longDate(endsAt)}
                  </p>
                </>
              ) : (
                <p className="mt-2.5 text-white/80">Pick a listing to feature.</p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3.5">
                <span>Total (incl. GST)</span>
                <b className="font-display text-[1.8rem] font-normal">{rupees(addon.price)}</b>
              </div>
              <button
                type="button"
                className="btn btn-accent mt-3.5 w-full"
                disabled={!chosen || !online || busy !== null}
                onClick={() =>
                  chosen &&
                  void pay(
                    `feature-${chosen.id}`,
                    `/me/properties/${chosen.id}/feature-checkout`,
                    { days },
                    `Payment received. “${chosen.title}” is featured.`,
                  )
                }
              >
                {busy ? 'Opening…' : `Pay ${rupees(addon.price)} and feature`}
              </button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-white/65">
                <ShieldIcon size={14} /> Secure payment by Razorpay
              </p>
            </div>
            <div className="rounded-[18px] border border-[#e6eaf2] bg-white p-5">
              <p className="font-bold">What you get</p>
              <ul className="mt-1">
                {[
                  'Top of search results in your locality',
                  'Shown on the NEXUS home page',
                  '“Featured” tag on the listing card',
                ].map((t) => (
                  <li
                    key={t}
                    className="mt-2.5 flex items-center gap-2.5 text-[13.5px] text-ink-soft"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-50 text-success">
                      <CheckIcon size={12} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeatureListingPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <FeatureListing />
    </Suspense>
  );
}
