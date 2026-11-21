'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  DEFAULT_PLAN,
  PROPERTY_STATUS_LABELS,
  USER_ROLE_LABELS,
  canListProperty,
  formatIndianPhone,
  formatPrice,
  type OwnListing,
} from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { Pill, useDashboardData } from '@/components/dashboard/DashboardShell';
import {
  BoltIcon,
  CrownIcon,
  EyeIcon,
  HomeIcon,
  ImageIcon,
  InboxIcon,
  PhoneIcon,
  PlusIcon,
  WhatsAppIcon,
} from '@/components/icons';
import { useSession } from '@/components/session/SessionProvider';
import { POST_PROPERTY_PATH } from '@/lib/site';

export default function DashboardOverview() {
  const { user } = useSession();
  if (!user) return null;
  return canListProperty(user.role) ? <ListerOverview /> : <SeekerOverview />;
}

/** Buyer / tenant: no listings, leads or plans. Just what they saved and asked about. */
function SeekerOverview() {
  const { user } = useSession();
  if (!user) return null;
  const cards = [
    {
      href: '/properties',
      title: 'Search properties',
      text: 'Flats, houses, plots and shops for sale and rent in Jaipur.',
    },
    { href: '/dashboard/saved', title: 'Saved', text: 'Homes you saved to look at again.' },
    {
      href: '/dashboard/enquiries',
      title: 'My enquiries',
      text: 'Properties you asked about and numbers you viewed.',
    },
  ];
  return (
    <div className="space-y-8">
      {!user.phoneVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-50 p-4 text-sm">
          <p className="text-warn">
            Verify your mobile number {formatIndianPhone(user.phone)} to see owners’ contact
            details.
          </p>
          <Link href="/dashboard/profile#phone" className="btn btn-outline btn-sm">
            Verify now
          </Link>
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block h-full rounded-2xl border border-line bg-white p-5 hover:border-brand/50"
            >
              <p className="font-semibold text-brand-900">{c.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{c.text}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">
        Own a property you want to sell or rent out?{' '}
        <Link href={POST_PROPERTY_PATH} className="font-semibold text-brand underline">
          List it here
        </Link>
      </p>
    </div>
  );
}

const pct = (now: number, before: number) =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null;

const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};

const LEAD_TONES = ['bg-brand', 'bg-accent', 'bg-sky-500', 'bg-success', 'bg-violet-600'];

function Bar({ used, limit, warn }: { used: number; limit: number | null; warn?: boolean }) {
  const w = limit === null ? 100 : limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
      <i
        className={`block h-full rounded-full ${warn ? 'bg-red-300' : 'bg-accent'}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function ListerOverview() {
  const { user } = useSession();
  const { data, error } = useDashboardData();
  const mine = useApi<OwnListing[]>('/me/properties');
  const [now] = useState(() => Date.now());
  if (!user) return null;

  const first = user.name.split(' ')[0] || user.name;
  const perf = data?.performance;
  const usage = data?.usage;
  const sub = data?.subscription;
  const viewsChange = perf ? pct(perf.views30, perf.viewsPrev30) : null;
  const listings = (mine.data ?? []).slice(0, 4);
  const featuredNow = (l: OwnListing) =>
    !!l.featuredUntil && new Date(l.featuredUntil).getTime() > now;

  const kpis = data
    ? [
        {
          label: 'Live listings',
          value: data.listings.published,
          note: `${data.listings.pending} in review`,
          tone: 'good',
          Icon: HomeIcon,
          bg: 'bg-brand',
          href: '/dashboard/listings?status=published',
        },
        {
          label: 'Views · 30 days',
          value: perf?.views30 ?? 0,
          note:
            viewsChange === null ? 'Last 30 days' : `${viewsChange >= 0 ? '+' : ''}${viewsChange}%`,
          tone: viewsChange !== null && viewsChange < 0 ? 'bad' : 'good',
          Icon: EyeIcon,
          bg: 'bg-sky-500',
          href: '/dashboard/listings',
        },
        {
          label: 'Leads · 30 days',
          value: perf?.leads30 ?? 0,
          note: `${data.leads.unseen} new`,
          tone: 'good',
          Icon: InboxIcon,
          bg: 'bg-accent',
          href: '/dashboard/leads',
        },
        {
          label: 'Number views',
          value: perf?.contacts30 ?? 0,
          note: usage && usage.leads.locked > 0 ? `${usage.leads.locked} hidden` : '30 days',
          tone: usage && usage.leads.locked > 0 ? 'warn' : 'muted',
          Icon: PhoneIcon,
          bg: 'bg-success',
          href: '/dashboard/leads',
        },
      ]
    : [];

  const chips = data
    ? [
        ['All', data.listings.total, ''],
        ['Live', data.listings.published, 'published'],
        ['In review', data.listings.pending, 'pending'],
        ['Drafts', data.listings.draft, 'draft'],
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {!user.phoneVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn-50 p-4 text-sm">
          <p className="text-warn">
            Verify your mobile number {formatIndianPhone(user.phone)} to post listings and see
            owners’ contact details.
          </p>
          <Link href="/dashboard/profile#phone" className="btn btn-outline btn-sm">
            Verify now
          </Link>
        </div>
      )}
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}

      <section className="relative overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_85%_15%,rgba(249,115,22,.35),transparent_42%),linear-gradient(120deg,#0b1a3f_0%,#1e40af_70%,#2563eb_100%)] p-5 text-white sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[13px] text-white/70">{USER_ROLE_LABELS[user.role]} account</p>
            <h1 className="mt-0.5 text-[1.7rem] leading-tight text-white sm:text-[2.1rem]">
              Welcome back, {first}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/80 sm:text-[15px]">
              {!data
                ? 'Loading your numbers…'
                : data.leads.unseen > 0
                  ? `${data.leads.unseen} new lead${data.leads.unseen === 1 ? '' : 's'} waiting. Reply fast, buyers call the first person who answers.`
                  : data.listings.total === 0
                    ? 'Post your first property. Our team reviews it before it goes live.'
                    : 'Here is how your listings are doing.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href={POST_PROPERTY_PATH} className="btn btn-accent">
                <PlusIcon size={18} /> Post a property
              </Link>
              <Link
                href="/dashboard/leads"
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <InboxIcon size={17} /> See leads
              </Link>
            </div>
          </div>

          <div className="w-full rounded-[18px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm xl:w-[18rem]">
            {usage ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-orange-300">
                    <CrownIcon size={15} /> {sub ? sub.plan.name : 'Free plan'}
                  </span>
                  <span className="text-xs text-white/70">Membership</span>
                </div>
                {usage.listings.limit > 0 ? (
                  <>
                    <p className="mt-3 flex justify-between text-[13px]">
                      {sub ? 'Live listings' : 'Free listings'}
                      <b className="tabular">
                        {usage.listings.used} / {usage.listings.limit}
                      </b>
                    </p>
                    <Bar used={usage.listings.used} limit={usage.listings.limit} />
                  </>
                ) : (
                  <p className="mt-3 text-[13px] text-white/85">
                    Take Premium to post your listings.
                  </p>
                )}
                <p className="mt-3 flex justify-between text-[13px]">
                  Leads with number
                  <b className="tabular">
                    {usage.leads.limit === null
                      ? 'No limit'
                      : `${usage.leads.used} / ${usage.leads.limit}`}
                  </b>
                </p>
                <Bar
                  used={usage.leads.used}
                  limit={usage.leads.limit}
                  warn={usage.leads.limit !== null && usage.leads.used >= usage.leads.limit}
                />
                {sub ? (
                  <p className="mt-3 text-xs text-white/75">
                    Valid till{' '}
                    {new Date(sub.endsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                ) : null}
                <Link
                  href="/dashboard/plans"
                  className="btn mt-3.5 h-[38px] w-full justify-center bg-white text-brand-900 hover:bg-white/90"
                >
                  {sub ? 'See membership' : `Upgrade · ₹${DEFAULT_PLAN.price}/month`}
                </Link>
              </>
            ) : (
              <div className="h-40 animate-pulse rounded-xl bg-white/10" />
            )}
          </div>
        </div>
      </section>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3.5">
        {(data ? kpis : [0, 1, 2, 3]).map((k, i) =>
          typeof k === 'number' ? (
            <div key={i} className="skeleton h-[86px] rounded-2xl" />
          ) : (
            <Link
              key={k.label}
              href={k.href}
              className="flex items-center gap-3 rounded-2xl border border-[#e6eaf2] bg-white p-3 transition-shadow hover:shadow-md sm:gap-3.5 sm:p-4"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-white sm:h-12 sm:w-12 ${k.bg}`}
              >
                <k.Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold text-ink-muted sm:text-[12.5px]">
                  {k.label}
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <b className="tabular text-[22px] tracking-tight sm:text-[26px]">{k.value}</b>
                  <span
                    className={`text-xs font-bold ${
                      k.tone === 'bad'
                        ? 'text-danger'
                        : k.tone === 'warn'
                          ? 'text-accent-700'
                          : k.tone === 'muted'
                            ? 'text-ink-muted'
                            : 'text-success'
                    }`}
                  >
                    {k.note}
                  </span>
                </span>
              </span>
            </Link>
          ),
        )}
      </section>

      {data && data.listings.rejected > 0 && (
        <p className="rounded-2xl border border-danger/30 bg-danger-50 p-4 text-sm text-danger">
          {data.listings.rejected} listing{data.listings.rejected === 1 ? ' needs' : 's need'}{' '}
          changes before they can go live.{' '}
          <Link href="/dashboard/listings?status=rejected" className="font-semibold underline">
            See what to fix
          </Link>
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-[18px] border border-[#e6eaf2] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[1.4rem] leading-tight">My listings</h2>
            <div className="flex flex-wrap gap-1.5">
              {chips.map(([label, n, status], i) => (
                <Link
                  key={label as string}
                  href={`/dashboard/listings${status ? `?status=${status}` : ''}`}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${i === 0 ? 'bg-brand-900 text-white' : 'bg-[#f4f6fb] text-ink-soft hover:bg-[#eaeef5]'}`}
                >
                  {label} {n}
                </Link>
              ))}
            </div>
          </div>
          {mine.loading && (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          )}
          {!mine.loading && listings.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-line-strong p-6 text-center">
              <p className="font-semibold">No listings yet</p>
              <p className="mt-1 text-sm text-ink-muted">
                Sale or rent, residential or commercial. It takes about ten minutes.
              </p>
              <Link href={POST_PROPERTY_PATH} className="btn btn-accent mt-4">
                <PlusIcon size={18} /> Post your first property
              </Link>
            </div>
          )}
          <ul>
            {listings.map((l) => {
              const cover = l.images[l.coverImageIndex] ?? l.images[0];
              const live = l.status === 'published';
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-3 border-b border-[#f1f4f9] py-3.5 last:border-0 sm:flex-nowrap sm:gap-3.5"
                >
                  <div className="relative h-[60px] w-[80px] shrink-0 overflow-hidden rounded-xl bg-surface sm:h-[66px] sm:w-[92px]">
                    {cover ? (
                      <Image src={cover.url} alt="" fill sizes="92px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-ink-muted">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    {featuredNow(l) && (
                      <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-brand-900">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {l.awaitingPlan ? (
                        <Pill status="pending" label="Waiting for plan" />
                      ) : (
                        <Pill status={l.status} label={PROPERTY_STATUS_LABELS[l.status]} />
                      )}
                      <span className="truncate text-xs text-ink-muted">
                        {l.locality.name}, {l.city.name}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[15px] font-semibold">
                      {l.title}{' '}
                      <span className="tabular ml-1 text-brand">
                        {formatPrice(l.price, l.listingType)}
                      </span>
                    </p>
                    <p className="mt-0.5 flex gap-3 text-[12.5px] text-ink-muted">
                      <span className="flex items-center gap-1">
                        <EyeIcon size={14} /> {l.views ?? 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <InboxIcon size={14} /> {l.enquiryCount} leads
                      </span>
                    </p>
                  </div>
                  <div className="ml-[92px] flex shrink-0 gap-1.5 sm:ml-0 sm:items-center">
                    <Link
                      href={`/dashboard/listings/${l.id}`}
                      className="btn btn-outline h-[34px] px-3 text-[12.5px]"
                    >
                      Edit
                    </Link>
                    {live && !featuredNow(l) && (
                      <Link
                        href={`/dashboard/feature?listing=${l.id}`}
                        className="btn btn-accent h-[34px] px-3 text-[12.5px]"
                      >
                        <BoltIcon size={14} /> Feature
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {(mine.data?.length ?? 0) > 4 && (
            <Link
              href="/dashboard/listings"
              className="mt-2 block text-center text-sm font-bold text-brand"
            >
              See all {mine.data!.length} listings
            </Link>
          )}
        </section>

        <section className="min-w-0 rounded-[18px] border border-[#e6eaf2] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.4rem] leading-tight">New leads</h2>
            <Link href="/dashboard/leads" className="text-[13px] font-bold text-brand">
              View all
            </Link>
          </div>
          {!data && <div className="skeleton mt-4 h-48 rounded-xl" />}
          {data && data.recentLeads.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
              No leads yet. They’ll appear here as soon as someone enquires about one of your live
              listings.
            </p>
          )}
          <ul>
            {data?.recentLeads.slice(0, 4).map((l, i) => (
              <li key={l.id} className="border-b border-[#f1f4f9] py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-white ${l.locked ? 'bg-ink-muted' : LEAD_TONES[i % LEAD_TONES.length]}`}
                  >
                    {l.locked ? '🔒' : initials(l.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {l.locked ? 'Hidden lead' : l.name}
                      {!l.seen && (
                        <span className="ml-2 rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-brand-900">
                          NEW
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {l.type === 'contact' ? 'Viewed number' : 'Enquired'}
                      {l.property ? ` · ${l.property.title}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-muted">{ago(l.createdAt)}</span>
                </div>
                <div className="ml-[50px] mt-2 flex gap-2">
                  {l.locked ? (
                    <Link
                      href="/dashboard/plans"
                      className="rounded-[9px] bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700"
                    >
                      Unlock with Premium
                    </Link>
                  ) : (
                    <>
                      <a
                        href={`tel:${l.phone}`}
                        className="flex items-center gap-1.5 rounded-[9px] bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand"
                      >
                        <PhoneIcon size={13} /> Call
                      </a>
                      <a
                        href={waLink(l.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-[9px] bg-success-50 px-2.5 py-1 text-xs font-bold text-success"
                      >
                        <WhatsAppIcon size={13} /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
