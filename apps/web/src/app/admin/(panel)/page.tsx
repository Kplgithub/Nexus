'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ADMIN_PATH,
  ADMIN_ROLE_LABELS,
  LOAN_RATES_STALE_DAYS,
  type SiteSettings,
  type DashboardCharts,
  type DashboardStats,
  type Kpi,
} from '@nexus/shared';
import { Avatar, Skeleton, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { A } from '@/components/admin/AdminIcons';
import { useApi } from '@/components/admin/useApi';
import { loanRatesStale } from '@/lib/site';
import { describeActivity } from '@/components/admin/activity';
import { LeadsChart, Legend, MeterBar, SERIES, Sparkline, nf } from '@/components/admin/charts';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function greeting() {
  const h = Number(
    new Date().toLocaleString('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }),
  );
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function DashboardPage() {
  const { admin, isSuper } = useAdmin();
  const [days, setDays] = useState(30);
  const charts = useApi<DashboardCharts>(`/admin/dashboard/charts?days=${days}`);
  const stats = useApi<DashboardStats>('/admin/dashboard');
  const site = useApi<SiteSettings>('/admin/settings');
  const loan = site.data?.homeLoan;
  const loanChecked = loan?.ratesCheckedAt ? new Date(loan.ratesCheckedAt) : null;
  const loanStale =
    !!loan?.enabled &&
    loan.lenders.length > 0 &&
    loanRatesStale(loan.ratesCheckedAt, LOAN_RATES_STALE_DAYS);
  const c = charts.data;
  const period = days === 1 ? 'today' : `last ${days} days`;
  const vs = days === 1 ? 'vs yesterday' : `vs previous ${days} days`;

  return (
    <>
      {loanStale && (
        <p className="mb-4 rounded-xl bg-warn-50 p-3 text-sm text-warn">
          Home loan rates on the website were last checked{' '}
          {loanChecked ? `on ${loanChecked.toLocaleDateString('en-IN')}` : 'never'}. Please check
          the banks’ websites and{' '}
          <Link href={`${ADMIN_PATH}/settings#home-loan`} className="font-semibold underline">
            update them in Settings
          </Link>
          .
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight sm:text-[32px]">
            {greeting()}, {admin.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'Asia/Kolkata',
            })}{' '}
            · {ADMIN_ROLE_LABELS[admin.role]}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div
            role="tablist"
            aria-label="Period"
            className="adm-seg flex-1 justify-between sm:flex-none"
          >
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                role="tab"
                aria-selected={days === r.days}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Link
            href={`${ADMIN_PATH}/properties/new`}
            className="btn btn-primary hidden gap-1.5 sm:inline-flex"
          >
            <A.plus width={16} height={16} />
            Add property
          </Link>
        </div>
      </div>

      {charts.error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {charts.error}
        </p>
      )}

      {stats.data && stats.data.properties.demo > 0 && (
        <p
          role="note"
          className="mb-4 rounded-lg border border-warn/30 bg-warn-50 p-3 text-sm text-warn"
        >
          {stats.data.properties.demo} sample listing(s) are still in the database.
        </p>
      )}

      {/* Needs you today */}
      <section
        aria-label="Needs you today"
        className="card grid overflow-hidden sm:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1fr_1fr]"
      >
        <div className="flex items-center bg-gradient-to-br from-brand-800 to-brand px-5 py-4 text-white sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-sm font-semibold text-[#c9d3ee]">Needs you today</p>
            {c ? (
              <p className="text-[22px] font-extrabold">
                {(() => {
                  const n =
                    c.today.toReview +
                    c.today.newLeads +
                    c.today.followUpsOverdue +
                    c.today.openReports;
                  return `${nf(n)} ${n === 1 ? 'item' : 'items'}`;
                })()}
              </p>
            ) : (
              <Skeleton className="mt-1 h-7 w-24 bg-white/20" />
            )}
          </div>
        </div>
        <TodoCell
          icon="review"
          n={c?.today.toReview}
          label="listings to review"
          href={`${ADMIN_PATH}/review`}
          cta="Review"
        />
        <TodoCell
          icon="phone"
          n={c?.today.newLeads}
          label="new leads to call"
          href={`${ADMIN_PATH}/enquiries?status=new`}
          cta="Open"
        />
        <TodoCell
          icon="clock"
          n={c?.today.followUpsOverdue}
          label="follow-ups due"
          href={`${ADMIN_PATH}/enquiries?followUpDue=true`}
          cta="See"
        />
      </section>

      {c &&
        (c.today.visitsToday > 0 || c.today.openReports > 0 || c.today.pendingVerification > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {c.today.visitsToday > 0 && (
              <Link href={`${ADMIN_PATH}/visits`} className="chip">
                <A.calendar width={15} height={15} /> {c.today.visitsToday} site visit
                {c.today.visitsToday === 1 ? '' : 's'} today
              </Link>
            )}
            {c.today.openReports > 0 && (
              <Link href={`${ADMIN_PATH}/reports`} className="chip">
                <A.flag width={15} height={15} /> {c.today.openReports} open report
                {c.today.openReports === 1 ? '' : 's'}
              </Link>
            )}
            {c.today.pendingVerification > 0 && (
              <Link href={`${ADMIN_PATH}/verification`} className="chip">
                <A.badge width={15} height={15} /> {c.today.pendingVerification} to verify
              </Link>
            )}
          </div>
        )}

      {/* KPIs */}
      <section
        aria-label="Key numbers"
        className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Live listings"
          kpi={c?.kpis.liveListings}
          change="abs"
          note={`since ${period === 'today' ? 'yesterday' : 'start'}`}
          href={`${ADMIN_PATH}/properties?status=published`}
        />
        <KpiCard
          label="New leads"
          kpi={c?.kpis.newLeads}
          change="pct"
          note={vs}
          href={`${ADMIN_PATH}/enquiries`}
        />
        <KpiCard
          label="Leads closed"
          kpi={c?.kpis.closedLeads}
          change="abs"
          note={vs}
          href={`${ADMIN_PATH}/enquiries?status=closed`}
        />
        <KpiCard
          label="New sign-ups"
          kpi={c?.kpis.signups}
          change="pct"
          note={vs}
          href={`${ADMIN_PATH}/users`}
          color={SERIES.rent}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.75fr_1fr]">
        <section className="card p-4 sm:p-5">
          <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl">Enquiries over time</h2>
              <p className="text-xs font-semibold text-ink-muted">
                One point per day · {days === 1 ? 'last 7 days' : period}
              </p>
            </div>
            <Legend
              items={[
                { label: 'Buy', color: SERIES.buy },
                { label: 'Rent & general', color: SERIES.rent },
              ]}
            />
          </header>
          {c ? <LeadsChart data={c.leadsByDay} /> : <Skeleton className="h-56 w-full" />}
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="text-xl">Lead pipeline</h2>
          <p className="text-xs font-semibold text-ink-muted">
            Where {c ? nf(c.pipeline.total) : '…'}{' '}
            {c?.pipeline.total === 1 ? 'enquiry' : 'enquiries'} from {period} stand
          </p>
          {c ? (
            <Pipeline p={c.pipeline} />
          ) : (
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          )}
          {c && c.uncontacted24h > 0 && (
            <Link
              href={`${ADMIN_PATH}/enquiries?status=new`}
              className="mt-4 block rounded-lg bg-accent-50 px-3 py-2.5 text-sm font-semibold text-accent-700 hover:underline"
            >
              {nf(c.uncontacted24h)} lead{c.uncontacted24h === 1 ? '' : 's'} still not called after
              24 hours →
            </Link>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="flex items-start justify-between gap-2 p-4 pb-3 sm:p-5 sm:pb-3">
            <div>
              <h2 className="text-xl">Localities</h2>
              <p className="text-xs font-semibold text-ink-muted">
                Where enquiries come from · {period}
              </p>
            </div>
            <Link href={`${ADMIN_PATH}/locations`} className="btn btn-outline btn-sm">
              All
            </Link>
          </header>
          {c && c.localities.length === 0 && (
            <p className="px-5 pb-6 text-sm text-ink-muted">
              No listing enquiries in this period yet.
            </p>
          )}
          {c && c.localities.length > 0 && (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Locality</th>
                  <th className="w-[45%]">Leads</th>
                  <th className="text-right">Live listings</th>
                </tr>
              </thead>
              <tbody>
                {c.localities.map((l) => (
                  <tr key={l.slug}>
                    <td className="font-semibold">{l.name}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="tabular w-7 text-right">{l.leads}</span>
                        <MeterBar value={l.leads} max={c.localities[0]!.leads} />
                      </span>
                    </td>
                    <td className="tabular text-right">{l.live}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!c && <Skeleton className="mx-5 mb-5 h-40" />}
        </section>

        <section className="card overflow-hidden">
          <header className="flex items-start justify-between gap-2 p-4 pb-3 sm:p-5 sm:pb-3">
            <div>
              <h2 className="text-xl">Latest enquiries</h2>
              <p className="text-xs font-semibold text-ink-muted">Newest first</p>
            </div>
            <Link href={`${ADMIN_PATH}/enquiries`} className="btn btn-outline btn-sm">
              Open inbox
            </Link>
          </header>
          {stats.data?.recentEnquiries.length === 0 && (
            <p className="px-5 pb-6 text-sm text-ink-muted">No enquiries yet.</p>
          )}
          {stats.data && stats.data.recentEnquiries.length > 0 && (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="hidden sm:table-cell">Looking at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.data.recentEnquiries.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link
                        href={`${ADMIN_PATH}/enquiries?open=${e.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {e.name}
                      </Link>
                      <span className="block text-xs text-ink-muted">{ago(e.createdAt)}</span>
                    </td>
                    <td className="hidden max-w-56 truncate sm:table-cell">
                      {e.property?.title ?? <span className="text-ink-muted">General enquiry</span>}
                    </td>
                    <td>
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!stats.data && <Skeleton className="mx-5 mb-5 h-40" />}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="text-xl">Live listings by type</h2>
          <p className="text-xs font-semibold text-ink-muted">What is on the site right now</p>
          {c && c.listingsByType.length === 0 && (
            <p className="mt-4 text-sm text-ink-muted">No live listings yet.</p>
          )}
          <ul className="mt-3 space-y-2.5">
            {c?.listingsByType.slice(0, 7).map((t) => (
              <li
                key={t.type}
                className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm"
              >
                <span className="truncate font-semibold">{t.label}</span>
                <MeterBar value={t.count} max={c.listingsByType[0]!.count} height={10} />
                <span className="tabular text-right font-semibold">{t.count}</span>
              </li>
            ))}
          </ul>
          {!c && <Skeleton className="mt-3 h-32 w-full" />}
        </section>

        <section className="card p-4 sm:p-5">
          <header className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl">{isSuper ? 'What the team did' : 'Team workload'}</h2>
              <p className="text-xs font-semibold text-ink-muted">
                {isSuper ? 'Latest actions · only Super Admins see this' : 'Open leads per person'}
              </p>
            </div>
            {isSuper && (
              <Link href={`${ADMIN_PATH}/activity`} className="btn btn-outline btn-sm">
                Full log
              </Link>
            )}
          </header>
          {c && isSuper && (
            <ul className="mt-2">
              {c.activity.length === 0 && (
                <li className="py-4 text-sm text-ink-muted">Nothing yet.</li>
              )}
              {c.activity.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-3 border-b border-dashed border-line py-2.5 text-sm last:border-0"
                >
                  <Avatar
                    name={a.actor?.name ?? a.actorEmail ?? '?'}
                    tone={a.actor?.role === 'editor' ? 'accent' : 'navy'}
                    size={30}
                  />
                  <div className="min-w-0">
                    <p className="leading-snug">
                      <b>
                        {a.actor?.id === admin.id
                          ? 'You'
                          : (a.actor?.name ?? a.actorEmail ?? 'Someone')}
                      </b>
                      {a.actor?.role === 'editor' && (
                        <span className="ml-1.5 rounded bg-accent-50 px-1.5 text-[10.5px] font-extrabold text-accent-700">
                          Sub-admin
                        </span>
                      )}{' '}
                      {describeActivity(a)}
                    </p>
                    <p className="text-[11.5px] font-semibold text-ink-muted">{ago(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {c && c.team.length > 0 && (
            <ul className={`space-y-2.5 ${isSuper ? 'mt-4 border-t border-line pt-4' : 'mt-3'}`}>
              {c.team.map((t) => (
                <li
                  key={t.admin.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Avatar
                      name={t.admin.name}
                      size={24}
                      tone={t.admin.role === 'editor' ? 'accent' : 'navy'}
                    />
                    {t.admin.name}
                  </span>
                  <span className="text-ink-muted">
                    <b className="text-ink">{t.open}</b> open ·{' '}
                    <b className="text-ink">{t.closed}</b> closed
                  </span>
                </li>
              ))}
            </ul>
          )}
          {c && !isSuper && c.team.length === 0 && (
            <p className="mt-3 text-sm text-ink-muted">No leads are assigned yet.</p>
          )}
          {!c && <Skeleton className="mt-3 h-32 w-full" />}
        </section>
      </div>
    </>
  );
}

function TodoCell({
  icon,
  n,
  label,
  href,
  cta,
}: {
  icon: 'review' | 'phone' | 'clock';
  n?: number;
  label: string;
  href: string;
  cta: string;
}) {
  const Icon = A[icon];
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-t border-line px-4 py-3.5 hover:bg-surface sm:px-5 lg:border-l lg:border-t-0"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent-50 text-accent-700">
        <Icon />
      </span>
      <span className="min-w-0">
        {n === undefined ? (
          <Skeleton className="h-6 w-8" />
        ) : (
          <b className="tabular block text-xl leading-tight">{nf(n)}</b>
        )}
        <span className="block text-[12.5px] font-semibold text-ink-muted">{label}</span>
      </span>
      <span className="ml-auto text-[12.5px] font-bold text-brand group-hover:underline">
        {cta} →
      </span>
    </Link>
  );
}

function KpiCard({
  label,
  kpi,
  change,
  note,
  href,
  color,
}: {
  label: string;
  kpi?: Kpi;
  change: 'pct' | 'abs';
  note: string;
  href: string;
  color?: string;
}) {
  let delta: React.ReactNode = null;
  if (kpi) {
    const d = kpi.value - kpi.previous;
    const up = d >= 0;
    const text =
      change === 'pct' && kpi.previous > 0
        ? `${up ? '+' : '−'}${Math.abs(Math.round((d / kpi.previous) * 100))}%`
        : `${up ? '+' : '−'}${nf(Math.abs(d))}`;
    delta = (
      <p className="mt-0.5 text-xs font-bold">
        <span className={d === 0 ? 'text-ink-muted' : up ? 'text-success' : 'text-danger'}>
          {text}
        </span>{' '}
        <span className="font-semibold text-ink-muted">{note}</span>
      </p>
    );
  }
  return (
    <Link href={href} className="card block px-3.5 pb-2.5 pt-3.5 hover:border-brand sm:px-4">
      <p className="text-[12.5px] font-semibold text-ink-muted">{label}</p>
      {kpi ? (
        <p className="tabular mt-1 text-2xl font-extrabold tracking-tight sm:text-[30px]">
          {nf(kpi.value)}
        </p>
      ) : (
        <Skeleton className="mt-2 h-8 w-20" />
      )}
      {delta ?? <Skeleton className="mt-1.5 h-3 w-28" />}
      {kpi ? <Sparkline data={kpi.spark} color={color} /> : <div className="h-11" />}
    </Link>
  );
}

function Pipeline({ p }: { p: DashboardCharts['pipeline'] }) {
  const rows = [
    { label: 'New', n: p.total, color: '#1e40af', text: '#fff' },
    { label: 'Contacted', n: p.contacted, color: '#1e3a8a', text: '#fff' },
    { label: 'Site visit', n: p.visited, color: '#172554', text: '#fff' },
    { label: 'Closed', n: p.closed, color: '#f97316', text: '#000' },
  ];
  return (
    <ul className="mt-3 space-y-2.5">
      {rows.map((r) => {
        const pct = p.total ? Math.round((r.n / p.total) * 100) : 0;
        return (
          <li
            key={r.label}
            className="grid grid-cols-[5.5rem_1fr_2.75rem] items-center gap-2.5 text-sm font-bold"
          >
            <span>{r.label}</span>
            <span className="h-[26px] overflow-hidden rounded-[7px] bg-surface">
              <span
                className="flex h-full items-center rounded-[7px] pl-2 text-[11.5px]"
                style={{
                  width: `${Math.max(pct, r.n ? 12 : 0)}%`,
                  background: r.color,
                  color: r.text,
                }}
              >
                {r.n > 0 ? nf(r.n) : ''}
              </span>
            </span>
            <span className="text-right text-xs text-ink-muted">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
