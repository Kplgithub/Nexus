'use client';

import { useState } from 'react';
import {
  JOURNEY_FLOWS,
  JOURNEY_FLOW_LABELS,
  JOURNEY_SOURCES,
  JOURNEY_SOURCE_LABELS,
  type JourneyAnalytics,
  type JourneyFlow,
  type JourneySource,
} from '@nexus/shared';
import { PageTitle } from '@/components/admin/AdminShell';
import { StatTile } from '@/components/admin/BlogAnalytics';
import {
  SourceGroupChart,
  SourceTrendChart,
  StepDropOffChart,
} from '@/components/admin/JourneyCharts';
import { nf } from '@/components/admin/charts';
import { useApi } from '@/components/admin/useApi';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
] as const;

function buildSampleData(days: number): JourneyAnalytics {
  const now = new Date();
  const dailyBySource = Array.from({ length: Math.min(days, 14) }, (_, idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (Math.min(days, 14) - 1 - idx));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      invite: 18 + ((idx * 7) % 15),
      search: 42 + ((idx * 11) % 24),
      direct: 21 + ((idx * 5) % 12),
      social: 8 + ((idx * 3) % 7),
      other: 4 + (idx % 4),
    };
  });
  return {
    range: {
      days,
      from: dailyBySource[0]?.date ?? now.toISOString().slice(0, 10),
      to: dailyBySource.at(-1)?.date ?? now.toISOString().slice(0, 10),
    },
    totals: {
      visitors: 1380,
      sessions: 1740,
      inviteVisitors: 360,
      searchVisitors: 690,
      completedFlows: 412,
      topDropOffFlow: 'Account sign-up',
      topDropOffStep: 'Verify mobile OTP',
      topDropOffRate: 41,
    },
    dailyBySource,
    sourceGroups: [
      {
        source: 'search',
        label: 'Search',
        visitors: 690,
        sessions: 890,
        signups: 145,
        listings: 38,
        enquiries: 210,
        conversionRate: 44,
      },
      {
        source: 'invite',
        label: 'Invite link',
        visitors: 360,
        sessions: 440,
        signups: 162,
        listings: 54,
        enquiries: 98,
        conversionRate: 71,
      },
      {
        source: 'direct',
        label: 'Direct',
        visitors: 215,
        sessions: 270,
        signups: 48,
        listings: 19,
        enquiries: 64,
        conversionRate: 48,
      },
      {
        source: 'social',
        label: 'Social',
        visitors: 82,
        sessions: 98,
        signups: 14,
        listings: 4,
        enquiries: 18,
        conversionRate: 37,
      },
      {
        source: 'other',
        label: 'Other',
        visitors: 33,
        sessions: 42,
        signups: 5,
        listings: 1,
        enquiries: 7,
        conversionRate: 31,
      },
    ],
    flows: [
      {
        flow: 'signup',
        label: 'Account sign-up',
        started: 620,
        completed: 268,
        completionRate: 43,
        topDropOffStep: 'verify',
        topDropOffLabel: 'Verify mobile OTP',
        steps: [
          { step: 'role', label: 'Choose account type', stepIndex: 0, reached: 620, stoppedHere: 74, dropOffRate: 12 },
          { step: 'details', label: 'Enter details', stepIndex: 1, reached: 546, stoppedHere: 92, dropOffRate: 17 },
          { step: 'verify', label: 'Verify mobile OTP', stepIndex: 2, reached: 454, stoppedHere: 186, dropOffRate: 41 },
          { step: 'completed', label: 'Account created', stepIndex: 3, reached: 268, stoppedHere: 0, dropOffRate: 0 },
        ],
      },
      {
        flow: 'listing',
        label: 'Post property',
        started: 210,
        completed: 116,
        completionRate: 55,
        topDropOffStep: 'photos',
        topDropOffLabel: 'Photos & description',
        steps: [
          { step: 'basics', label: 'Property basics', stepIndex: 0, reached: 210, stoppedHere: 12, dropOffRate: 6 },
          { step: 'location', label: 'Location', stepIndex: 1, reached: 198, stoppedHere: 14, dropOffRate: 7 },
          { step: 'price', label: 'Price & terms', stepIndex: 2, reached: 184, stoppedHere: 18, dropOffRate: 10 },
          { step: 'details', label: 'Details & rooms', stepIndex: 3, reached: 166, stoppedHere: 16, dropOffRate: 10 },
          { step: 'photos', label: 'Photos & description', stepIndex: 4, reached: 150, stoppedHere: 26, dropOffRate: 17 },
          { step: 'review', label: 'Review & submit', stepIndex: 5, reached: 124, stoppedHere: 8, dropOffRate: 6 },
          { step: 'completed', label: 'Listing submitted', stepIndex: 6, reached: 116, stoppedHere: 0, dropOffRate: 0 },
        ],
      },
      {
        flow: 'browse',
        label: 'Browse & enquiry',
        started: 1380,
        completed: 397,
        completionRate: 29,
        topDropOffStep: 'property_view',
        topDropOffLabel: 'Property page',
        steps: [
          { step: 'landing', label: 'Landing / Home', stepIndex: 0, reached: 1380, stoppedHere: 290, dropOffRate: 21 },
          { step: 'search_results', label: 'Search results', stepIndex: 1, reached: 1090, stoppedHere: 310, dropOffRate: 28 },
          { step: 'property_view', label: 'Property page', stepIndex: 2, reached: 780, stoppedHere: 295, dropOffRate: 38 },
          { step: 'enquiry_started', label: 'Started enquiry', stepIndex: 3, reached: 485, stoppedHere: 88, dropOffRate: 18 },
          { step: 'enquiry_submitted', label: 'Submitted enquiry', stepIndex: 4, reached: 397, stoppedHere: 0, dropOffRate: 0 },
        ],
      },
    ],
    topInvites: [
      { code: 'JAIPUR-VIP', visitors: 142, signups: 76, conversionRate: 54 },
      { code: 'BROKER-REF', visitors: 118, signups: 52, conversionRate: 44 },
      { code: 'BUILDER26', visitors: 100, signups: 34, conversionRate: 34 },
    ],
  };
}

/** Collective user acquisition (invite vs search) and step-by-step drop-off analytics. */
export default function UserJourneyPage() {
  const [days, setDays] = useState(30);
  const [source, setSource] = useState<JourneySource | 'all'>('all');
  const [flow, setFlow] = useState<JourneyFlow | 'all'>('all');
  const [previewSample, setPreviewSample] = useState(false);

  const qs = new URLSearchParams({
    days: String(days),
    ...(source !== 'all' && { source }),
    ...(flow !== 'all' && { flow }),
  });

  const { data: apiData, loading, error } = useApi<JourneyAnalytics>(
    `/admin/journey-analytics?${qs}`,
  );

  const data = previewSample ? buildSampleData(days) : apiData;

  const filteredFlows =
    data?.flows.filter((f) => flow === 'all' || f.flow === flow) ?? [];
  const filteredSources =
    data?.sourceGroups.filter((g) => source === 'all' || g.source === source) ?? [];

  const inviteShare =
    data && data.totals.visitors > 0
      ? Math.round((data.totals.inviteVisitors / data.totals.visitors) * 100)
      : 0;
  const searchShare =
    data && data.totals.visitors > 0
      ? Math.round((data.totals.searchVisitors / data.totals.visitors) * 100)
      : 0;

  return (
    <>
      <PageTitle title="User journey & acquisition">
        {previewSample && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setPreviewSample(false)}
          >
            Exit sample preview
          </button>
        )}
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Date range" className="adm-seg">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              role="tab"
              aria-selected={days === r.days}
              className={`adm-seg-btn ${days === r.days ? 'adm-seg-on' : ''}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="journey-source">
            Traffic source
          </label>
          <select
            id="journey-source"
            className="field w-auto min-w-[9.5rem]"
            value={source}
            onChange={(e) => setSource(e.target.value as JourneySource | 'all')}
          >
            <option value="all">All sources</option>
            {JOURNEY_SOURCES.map((s) => (
              <option key={s} value={s}>
                {JOURNEY_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="journey-flow">
            User flow
          </label>
          <select
            id="journey-flow"
            className="field w-auto min-w-[10.5rem]"
            value={flow}
            onChange={(e) => setFlow(e.target.value as JourneyFlow | 'all')}
          >
            <option value="all">All flows</option>
            {JOURNEY_FLOWS.map((f) => (
              <option key={f} value={f}>
                {JOURNEY_FLOW_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {previewSample && (
        <div className="mb-5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          <strong>Sample preview mode:</strong> Showing illustrative collective data. Connect the
          backend <code>/admin/journey-analytics</code> endpoint to view live tracked numbers.
        </div>
      )}

      {error && !previewSample && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-50 p-4 text-sm text-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-outline btn-sm bg-white"
            onClick={() => setPreviewSample(true)}
          >
            Preview with sample data
          </button>
        </div>
      )}

      {loading && !data && <p className="text-ink-muted">Loading journey analytics…</p>}

      {data && (
        <div className="space-y-6">
          {/* Collective KPI summary */}
          <section
            aria-label="Collective totals"
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            <StatTile
              label="Total visitors"
              value={nf(data.totals.visitors)}
              hint={`${nf(data.totals.sessions)} sessions`}
            />
            <StatTile
              label="From invite"
              value={nf(data.totals.inviteVisitors)}
              hint={`${inviteShare}% of all visitors`}
            />
            <StatTile
              label="From search"
              value={nf(data.totals.searchVisitors)}
              hint={`${searchShare}% of all visitors`}
            />
            <StatTile
              label="Stopped most at"
              value={data.totals.topDropOffStep ?? '—'}
              hint={
                data.totals.topDropOffFlow
                  ? `${data.totals.topDropOffFlow} · ${data.totals.topDropOffRate}% drop-off`
                  : 'No drop-offs yet'
              }
            />
          </section>

          {/* Graphs: Invite vs Search over time + Collective source comparison */}
          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
            <section className="card p-4 sm:p-5" aria-labelledby="trend-heading">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 id="trend-heading" className="font-sans text-base font-semibold">
                    Invite vs Search traffic over time
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Daily visitors grouped by how they arrived ({data.range.from} to {data.range.to})
                  </p>
                </div>
              </div>
              <SourceTrendChart data={data.dailyBySource} />
            </section>

            <section className="card p-4 sm:p-5" aria-labelledby="group-heading">
              <h2 id="group-heading" className="font-sans text-base font-semibold">
                Collective source groups
              </h2>
              <p className="mb-4 text-xs text-ink-muted">
                Share of visitors and conversion rate by arrival channel.
              </p>
              <SourceGroupChart groups={filteredSources} />
            </section>
          </div>

          {/* Step-by-step drop-off funnel graphs */}
          <section className="space-y-4" aria-labelledby="funnel-heading">
            <div>
              <h2 id="funnel-heading" className="font-sans text-lg font-semibold">
                Where users stop most of the time
              </h2>
              <p className="text-sm text-ink-muted">
                Step-by-step drop-off across multi-step user journeys. Highlighted steps show the
                biggest stop point in each flow.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredFlows.map((f) => (
                <div key={f.flow} className="card p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-sans text-base font-semibold">{f.label}</h3>
                      <p className="text-xs text-ink-muted">
                        {nf(f.started)} started · {nf(f.completed)} completed ({f.completionRate}%)
                      </p>
                    </div>
                    {f.topDropOffLabel && (
                      <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        Top stop: {f.topDropOffLabel}
                      </span>
                    )}
                  </div>
                  <StepDropOffChart flow={f} />
                </div>
              ))}
            </div>
          </section>

          {/* Collective grouped data tables */}
          <section className="card overflow-hidden" aria-labelledby="source-table-heading">
            <div className="p-4 pb-2 sm:px-5">
              <h2 id="source-table-heading" className="font-sans text-base font-semibold">
                Collective data by source group
              </h2>
              <p className="text-sm text-ink-muted">
                Aggregated visitors, sign-ups, listings, and enquiries per acquisition channel.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Source group</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Visitors</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Sessions</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Sign-ups</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Listings</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Enquiries</th>
                    <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSources.map((g) => (
                    <tr key={g.source} className="hover:bg-surface/60">
                      <td className="px-4 py-3 font-semibold sm:px-5">{g.label}</td>
                      <td className="tabular-nums px-3 py-3 text-right">{nf(g.visitors)}</td>
                      <td className="tabular-nums px-3 py-3 text-right">{nf(g.sessions)}</td>
                      <td className="tabular-nums px-3 py-3 text-right">{nf(g.signups)}</td>
                      <td className="tabular-nums px-3 py-3 text-right">{nf(g.listings)}</td>
                      <td className="tabular-nums px-3 py-3 text-right">{nf(g.enquiries)}</td>
                      <td className="tabular-nums px-4 py-3 text-right font-semibold sm:px-5">
                        {g.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.topInvites.length > 0 && (
            <section className="card overflow-hidden" aria-labelledby="invite-table-heading">
              <div className="p-4 pb-2 sm:px-5">
                <h2 id="invite-table-heading" className="font-sans text-base font-semibold">
                  Top invite codes
                </h2>
                <p className="text-sm text-ink-muted">
                  Which invite links bring the most visitors and completed sign-ups.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">Invite code</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Visitors</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Sign-ups</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.topInvites.map((inv) => (
                      <tr key={inv.code} className="hover:bg-surface/60">
                        <td className="px-4 py-3 font-mono font-semibold sm:px-5">{inv.code}</td>
                        <td className="tabular-nums px-3 py-3 text-right">{nf(inv.visitors)}</td>
                        <td className="tabular-nums px-3 py-3 text-right">{nf(inv.signups)}</td>
                        <td className="tabular-nums px-4 py-3 text-right font-semibold sm:px-5">
                          {inv.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
