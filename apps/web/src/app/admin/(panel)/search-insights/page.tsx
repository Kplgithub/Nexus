'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageTitle } from '@/components/admin/AdminShell';
import { RangePicker, StatTile } from '@/components/admin/BlogAnalytics';
import { useApi } from '@/components/admin/useApi';

type Row = {
  text: string;
  count: number;
  lastAt: string;
  exactCount: number;
  understood: string[];
};
type Insights = {
  days: number;
  total: number;
  noExactMatch: number;
  notUnderstood: number;
  top: Row[];
  notUnderstoodQueries: Row[];
  noExactQueries: Row[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

function Table({
  title,
  hint,
  rows,
  empty,
}: {
  title: string;
  hint: string;
  rows: Row[];
  empty: string;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="p-4 pb-2 sm:px-5">
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">What they typed</th>
                <th className="px-3 py-2.5 text-right font-semibold">Times</th>
                <th className="px-3 py-2.5 text-right font-semibold">Exact matches</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Last searched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.text} className="hover:bg-surface/60">
                  <td className="max-w-[26rem] px-4 py-3 sm:px-5">
                    <Link
                      href={`/search?q=${encodeURIComponent(r.text)}`}
                      target="_blank"
                      className="font-medium hover:text-brand"
                    >
                      {r.text}
                    </Link>
                  </td>
                  <td className="tabular px-3 py-3 text-right">{r.count}</td>
                  <td className="tabular px-3 py-3 text-right">{r.exactCount}</td>
                  <td className="px-4 py-3 text-right text-ink-muted sm:px-5">{when(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** What visitors type into the smart search, and where the site has nothing for them. */
export default function SearchInsightsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useApi<Insights>(`/admin/search-insights?days=${days}`);

  return (
    <>
      <PageTitle title="Search insights" />
      <div className="mb-6">
        <RangePicker days={days} onChange={setDays} />
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Searches" value={data.total.toLocaleString('en-IN')} />
            <StatTile
              label="No exact match"
              value={data.noExactMatch.toLocaleString('en-IN')}
              hint="Demand you can list for"
            />
            <StatTile
              label="Not understood"
              value={data.notUnderstood.toLocaleString('en-IN')}
              hint="Words the search should learn"
            />
          </div>
          <Table
            title="Most searched"
            hint="What visitors look for most often."
            rows={data.top}
            empty="Nobody has used the search in this period."
          />
          <Table
            title="Searched, but no exact match"
            hint="People wanted these and we had only close options. Good leads for brokers and owners."
            rows={data.noExactQueries}
            empty="Every search found an exact match."
          />
          <Table
            title="Not understood"
            hint="The search could not pick out an area, budget or type. Send these to the developer to teach it new words."
            rows={data.notUnderstoodQueries}
            empty="Every search was understood."
          />
        </div>
      )}
    </>
  );
}
