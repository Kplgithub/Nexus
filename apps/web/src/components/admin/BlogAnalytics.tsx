'use client';

import { useState } from 'react';
import type { BlogAnalyticsCount, BlogAnalyticsDay, BlogReadStats } from '@nexus/shared';

/** 0 → "0s", 75 → "1m 15s", 4000 → "1h 6m". */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  return sec ? `${m}m ${sec}s` : `${m}m`;
}

export const formatNumber = (n: number) => n.toLocaleString('en-IN');

export const RANGES = [7, 30, 90, 365] as const;

export function RangePicker({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div role="tablist" aria-label="Date range" className="flex flex-wrap gap-1">
      {RANGES.map((d) => (
        <button
          key={d}
          type="button"
          role="tab"
          aria-selected={days === d}
          className={`chip ${days === d ? 'chip-active' : ''}`}
          onClick={() => onChange(d)}
        >
          {d === 365 ? '1 year' : `${d} days`}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-brand-800 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** The five headline numbers used on both analytics pages. */
export function StatTiles({ stats }: { stats: BlogReadStats }) {
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatTile label="Views" value={formatNumber(stats.views)} hint="Article opens" />
      <StatTile
        label="Unique readers"
        value={formatNumber(stats.readers)}
        hint="Different browsers"
      />
      <StatTile
        label="Avg. read time"
        value={formatDuration(stats.avgSeconds)}
        hint="Active time per view"
      />
      <StatTile
        label="Total read time"
        value={formatDuration(stats.totalSeconds)}
        hint="All views together"
      />
      <StatTile
        label="Read to the end"
        value={`${stats.completionRate}%`}
        hint={`${formatNumber(stats.completed)} of ${formatNumber(stats.views)} views`}
      />
    </section>
  );
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

/** Daily views as bars; hover or tap a bar for that day's numbers. */
export function TrendChart({ days }: { days: BlogAnalyticsDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.views));
  const shown = active !== null ? days[active] : null;
  const totalViews = days.reduce((n, d) => n + d.views, 0);
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="trend-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="trend-heading" className="font-sans text-base font-semibold">
          Views per day
        </h2>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {shown
            ? `${shortDate(shown.date)}: ${formatNumber(shown.views)} views · ${formatNumber(shown.readers)} readers · avg ${formatDuration(shown.avgSeconds)}`
            : `${formatNumber(totalViews)} views in ${days.length} days`}
        </p>
      </div>
      {totalViews === 0 ? (
        <p className="mt-6 py-10 text-center text-sm text-ink-muted">
          No reads in this period yet.
        </p>
      ) : (
        <div className="mt-4">
          <div
            className="flex h-40 items-end gap-[2px]"
            onMouseLeave={() => setActive(null)}
            role="img"
            aria-label={`Daily views, highest ${max}`}
          >
            {days.map((d, i) => (
              <button
                key={d.date}
                type="button"
                title={`${shortDate(d.date)}: ${d.views} views`}
                aria-label={`${shortDate(d.date)}: ${d.views} views`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group flex h-full min-w-0 flex-1 items-end"
              >
                <span
                  className={`block w-full rounded-t-sm transition-colors ${
                    active === i ? 'bg-accent' : 'bg-brand group-hover:bg-brand-700'
                  }`}
                  style={{ height: d.views ? `${Math.max(3, (d.views / max) * 100)}%` : '1px' }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] text-[10px] text-ink-muted" aria-hidden>
            {days.map((d, i) => (
              <span key={d.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                {i % labelEvery === 0 ? shortDate(d.date) : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Horizontal bars with counts and share of `total`. */
export function BarList({
  title,
  items,
  total,
  empty = 'No data yet.',
  note,
  capitalize = false,
}: {
  capitalize?: boolean;
  title: string;
  items: BlogAnalyticsCount[];
  total: number;
  empty?: string;
  note?: string;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="font-sans text-base font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-ink-muted">{note}</p>}
      {items.length === 0 || total === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((i) => (
            <li key={i.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className={`truncate ${capitalize ? 'capitalize' : ''}`}>{i.label}</span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {formatNumber(i.count)}{' '}
                  <span className="text-ink-muted">({Math.round((i.count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.min(100, (i.count / total) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Plain-language notes on what each number means. */
export function HowMeasured() {
  return (
    <details className="card p-4 text-sm text-ink-soft sm:p-5">
      <summary className="cursor-pointer font-semibold text-ink">How are these measured?</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>
          <b>View</b>: one opening of an article in a browser tab. Refreshing the same tab does not
          count again.
        </li>
        <li>
          <b>Unique reader</b>: a different browser. The same person on phone and laptop counts as
          two.
        </li>
        <li>
          <b>Read time</b>: only the time the tab is open on screen and the reader has scrolled,
          tapped or moved the mouse in the last minute. Idle or background tabs are not counted, and
          one view is capped at 1 hour.
        </li>
        <li>
          <b>Read to the end</b>: the reader scrolled through at least 90% of the article text.
        </li>
        <li>Search engine bots are ignored. No names, phone numbers or IP addresses are stored.</li>
      </ul>
    </details>
  );
}
