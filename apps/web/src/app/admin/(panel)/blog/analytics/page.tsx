'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN_PATH, type BlogAnalyticsOverview } from '@nexus/shared';
import { PageTitle, StatusPill } from '@/components/admin/AdminShell';
import {
  RangePicker,
  StatTiles,
  TrendChart,
  formatDuration,
  HowMeasured,
  formatNumber,
} from '@/components/admin/BlogAnalytics';
import { useApi } from '@/components/admin/useApi';

/** Reader analytics for the whole blog: totals, daily trend and every article ranked. */
export default function BlogAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useApi<BlogAnalyticsOverview>(
    `/admin/blog/analytics?days=${days}`,
  );

  return (
    <>
      <PageTitle title="Blog analytics">
        <Link href={`${ADMIN_PATH}/blog`} className="btn btn-outline">
          All articles
        </Link>
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <RangePicker days={days} onChange={setDays} />
        {data && (
          <p className="text-sm text-ink-muted">
            {data.range.from} to {data.range.to} (India time)
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}

      {data && (
        <div className="space-y-6">
          <StatTiles stats={data.totals} />
          <TrendChart days={data.daily} />

          <section className="card overflow-hidden" aria-labelledby="posts-heading">
            <h2 id="posts-heading" className="p-4 pb-2 font-sans text-base font-semibold sm:px-5">
              Articles by views
            </h2>
            {data.posts.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-ink-muted">
                No article was read in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">Article</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Views</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Readers</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Avg. time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Total time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Read to end</th>
                      <th className="px-4 py-2.5 sm:px-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.posts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface/60">
                        <td className="max-w-[22rem] px-4 py-3 sm:px-5">
                          <Link
                            href={`${ADMIN_PATH}/blog/${p.id}/analytics`}
                            className="line-clamp-2 font-semibold hover:text-brand"
                          >
                            {p.title}
                          </Link>
                          {p.status !== 'published' && (
                            <span className="mt-1 inline-block">
                              <StatusPill status={p.status} />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">
                          {formatNumber(p.views)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatNumber(p.readers)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatDuration(p.avgSeconds)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatDuration(p.totalSeconds)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.completionRate}%</td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <Link
                            href={`${ADMIN_PATH}/blog/${p.id}/analytics`}
                            className="btn btn-outline btn-sm"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <HowMeasured />
        </div>
      )}
    </>
  );
}
