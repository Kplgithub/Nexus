'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { ADMIN_PATH, type BlogPostAnalytics } from '@nexus/shared';
import { PageTitle, StatusPill } from '@/components/admin/AdminShell';
import {
  BarList,
  HowMeasured,
  RangePicker,
  StatTile,
  StatTiles,
  TrendChart,
  formatDuration,
  formatNumber,
} from '@/components/admin/BlogAnalytics';
import { useApi } from '@/components/admin/useApi';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/** Reader analytics for one article. */
export default function BlogPostAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [days, setDays] = useState(30);
  const valid = /^[a-f0-9]{24}$/i.test(id);
  const { data, loading, error } = useApi<BlogPostAnalytics>(
    valid ? `/admin/blog/${id}/analytics?days=${days}` : null,
  );

  if (!valid || error)
    return (
      <p role="alert" className="rounded-lg bg-danger-50 p-4 text-danger">
        {error ?? 'Article not found'}
      </p>
    );
  if (loading && !data) return <p className="text-ink-muted">Loading…</p>;
  if (!data) return null;
  const t = data.totals;

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`${ADMIN_PATH}/blog/analytics`} className="text-brand hover:underline">
          ← Blog analytics
        </Link>
      </div>
      <PageTitle title={data.post.title}>
        {data.post.status === 'published' && (
          <Link href={`/blog/${data.post.slug}`} target="_blank" className="btn btn-ghost">
            View article
          </Link>
        )}
        <Link href={`${ADMIN_PATH}/blog/${data.post.id}`} className="btn btn-outline">
          Edit article
        </Link>
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <RangePicker days={days} onChange={setDays} />
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <StatusPill status={data.post.status} />
          {data.post.readingMinutes} min article · all time: {formatNumber(data.allTime.views)}{' '}
          views, {formatNumber(data.allTime.readers)} readers, avg{' '}
          {formatDuration(data.allTime.avgSeconds)}
        </p>
      </div>

      <div className="space-y-6">
        <StatTiles stats={t} />

        <section aria-label="Engagement" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Engaged reads"
            value={formatNumber(t.engaged)}
            hint="Read for 30 seconds or more"
          />
          <StatTile
            label="Quick exits"
            value={formatNumber(t.quickExits)}
            hint="Left within 10 seconds"
          />
          <StatTile
            label="Returning readers"
            value={formatNumber(t.returningReaders)}
            hint="Had read a NEXUS article before"
          />
          <StatTile
            label="Time vs. article length"
            value={
              t.views
                ? `${Math.round((t.avgSeconds / (data.post.readingMinutes * 60)) * 100)}%`
                : '—'
            }
            hint={`Avg. read time of a ${data.post.readingMinutes} min read`}
          />
        </section>

        <TrendChart days={data.daily} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BarList
            title="How far readers scrolled"
            note="Share of views that reached each point of the article"
            items={data.scrollDepth}
            total={t.views}
          />
          <BarList
            title="Time spent reading"
            note="Views grouped by active reading time"
            items={data.timeBuckets}
            total={t.views}
          />
          <BarList title="Devices" items={data.devices} total={t.views} capitalize />
          <BarList
            title="Where readers came from"
            note="Website that linked to the article"
            items={data.sources}
            total={t.views}
          />
        </div>

        <section className="card overflow-hidden" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="p-4 pb-2 font-sans text-base font-semibold sm:px-5">
            Latest reads
          </h2>
          {data.recent.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-ink-muted">No reads in this period yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">When</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Read time</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Scrolled</th>
                    <th className="px-3 py-2.5 font-semibold">Device</th>
                    <th className="px-3 py-2.5 font-semibold">From</th>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Reader</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.recent.map((r, i) => (
                    <tr key={`${r.at}-${i}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 sm:px-5">{when(r.at)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatDuration(r.seconds)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.scroll}%</td>
                      <td className="px-3 py-2.5 capitalize">{r.device}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2.5">{r.source}</td>
                      <td className="px-4 py-2.5 sm:px-5">{r.returning ? 'Returning' : 'New'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <HowMeasured />
      </div>
    </>
  );
}
