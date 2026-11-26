'use client';

import { useId, useState } from 'react';
import type {
  JourneyDailyPoint,
  JourneyFlowSummary,
  JourneySourceGroup,
} from '@nexus/shared';
import { Legend, MeterBar, nf } from './charts';

export const SOURCE_COLORS = {
  invite: '#7c3aed',
  search: '#2563eb',
  direct: '#0d9488',
  social: '#ea580c',
  other: '#94a3b8',
} as const;

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

const longDay = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v)! * pow;
  return step * 4;
}

/** Multi-series SVG chart comparing Invite vs Search vs Direct/Other arrivals per day. */
export function SourceTrendChart({ data }: { data: JourneyDailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-muted">
        No daily traffic data in this period yet.
      </p>
    );
  }

  const W = 640;
  const H = 236;
  const L = 36;
  const T = 14;
  const B = 32;
  const plotW = W - L - 8;
  const plotH = H - T - B;
  const max = niceMax(
    Math.max(...data.map((d) => Math.max(d.invite, d.search, d.direct, d.social + d.other)), 1),
  );
  const x = (i: number) => L + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const line = (f: (d: JourneyDailyPoint) => number) =>
    data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(f(d)).toFixed(1)}`).join(' ');

  const invitePath = line((d) => d.invite);
  const searchPath = line((d) => d.search);
  const directPath = line((d) => d.direct);
  const otherPath = line((d) => d.social + d.other);
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));
  const h = hover !== null ? data[hover] : null;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * plotW;
    const i = data.length === 1 ? 0 : Math.round((px / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Legend
          items={[
            { label: 'Invite link', color: SOURCE_COLORS.invite },
            { label: 'Search', color: SOURCE_COLORS.search },
            { label: 'Direct', color: SOURCE_COLORS.direct },
            { label: 'Social & other', color: SOURCE_COLORS.social },
          ]}
        />
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-pan-y"
          role="img"
          aria-label={`Visitors by acquisition source from ${shortDay(data[0]!.date)} to ${shortDay(data.at(-1)!.date)}`}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={SOURCE_COLORS.invite} stopOpacity=".14" />
              <stop offset="1" stopColor={SOURCE_COLORS.invite} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={L}
                x2={W - 8}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? '#c9d4d7' : '#e2e8ea'}
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}
          {data.length > 1 && (
            <path
              d={`${invitePath} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`}
              fill={`url(#${gid})`}
            />
          )}
          <path
            d={otherPath}
            fill="none"
            stroke={SOURCE_COLORS.social}
            strokeWidth={1.75}
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
          <path
            d={directPath}
            fill="none"
            stroke={SOURCE_COLORS.direct}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path
            d={searchPath}
            fill="none"
            stroke={SOURCE_COLORS.search}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <path
            d={invitePath}
            fill="none"
            stroke={SOURCE_COLORS.invite}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          {data.map(
            (d, i) =>
              (i % labelEvery === 0 || i === data.length - 1) &&
              !(i !== data.length - 1 && data.length - 1 - i < labelEvery / 2) && (
                <text
                  key={d.date}
                  x={x(i)}
                  y={H - 10}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                  className="fill-ink-muted text-[11px]"
                >
                  {shortDay(d.date)}
                </text>
              ),
          )}
          {h && hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={T}
                y2={y(0)}
                stroke="#0b1a3f"
                strokeDasharray="2 3"
              />
              <circle
                cx={x(hover)}
                cy={y(h.invite)}
                r={4.5}
                fill="#fff"
                stroke={SOURCE_COLORS.invite}
                strokeWidth={2.5}
              />
              <circle
                cx={x(hover)}
                cy={y(h.search)}
                r={4.5}
                fill="#fff"
                stroke={SOURCE_COLORS.search}
                strokeWidth={2.5}
              />
              <circle
                cx={x(hover)}
                cy={y(h.direct)}
                r={4}
                fill="#fff"
                stroke={SOURCE_COLORS.direct}
                strokeWidth={2}
              />
            </g>
          )}
          <rect
            x={L}
            y={T}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg bg-brand-900 px-3 py-2 text-xs text-white shadow-lift"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${hover > data.length / 2 ? 'calc(-100% - 10px)' : '10px'})`,
            }}
          >
            <p className="font-bold text-[#c9d3ee]">{longDay(h.date)}</p>
            <p className="mt-0.5 whitespace-nowrap font-semibold">
              Invite {nf(h.invite)} · Search {nf(h.search)} · Direct {nf(h.direct)}
              {h.social + h.other > 0 ? ` · Other ${nf(h.social + h.other)}` : ''}
            </p>
          </div>
        )}
        <table className="sr-only">
          <caption>Daily visitors by acquisition source</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Invite</th>
              <th>Search</th>
              <th>Direct</th>
              <th>Social &amp; other</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{longDay(d.date)}</td>
                <td>{d.invite}</td>
                <td>{d.search}</td>
                <td>{d.direct}</td>
                <td>{d.social + d.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Collective grouped comparison of acquisition sources (Invite vs Search vs Direct vs Social). */
export function SourceGroupChart({ groups }: { groups: JourneySourceGroup[] }) {
  const totalVisitors = groups.reduce((acc, g) => acc + g.visitors, 0);
  const maxVisitors = Math.max(1, ...groups.map((g) => g.visitors));

  if (totalVisitors === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No grouped source data yet.</p>;
  }

  return (
    <ul className="space-y-3.5">
      {groups.map((g) => {
        const share = Math.round((g.visitors / totalVisitors) * 100);
        const color = SOURCE_COLORS[g.source];
        return (
          <li key={g.source}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-ink">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: color }}
                  aria-hidden
                />
                {g.label}
              </span>
              <span className="tabular-nums text-ink-soft">
                <strong className="text-ink">{nf(g.visitors)}</strong> visitors ({share}%) ·{' '}
                <span className="text-ink-muted">{g.conversionRate}% converted</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <MeterBar value={g.visitors} max={maxVisitors} color={color} height={8} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Step-by-step funnel graph showing where users stop most of the time. */
export function StepDropOffChart({ flow }: { flow: JourneyFlowSummary }) {
  const maxReached = Math.max(1, ...flow.steps.map((s) => s.reached));

  if (flow.started === 0 || flow.steps.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        No user sessions recorded for {flow.label.toLowerCase()} in this period.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {flow.steps.map((s) => {
        const isTopStop = flow.topDropOffStep === s.step && s.stoppedHere > 0;
        const reachedPct = Math.round((s.reached / maxReached) * 100);
        const stoppedPct = Math.round((s.stoppedHere / maxReached) * 100);
        return (
          <div
            key={s.step}
            className={`rounded-xl border p-3 ${
              isTopStop ? 'border-accent bg-accent/5' : 'border-line bg-surface/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-brand-900 text-xs font-bold text-white">
                  {s.stepIndex + 1}
                </span>
                <span className="font-semibold text-ink">{s.label}</span>
                {isTopStop && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                    Most users stop here
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                <span className="text-ink-soft">
                  Reached: <strong className="text-ink">{nf(s.reached)}</strong> ({reachedPct}%)
                </span>
                {s.stoppedHere > 0 && (
                  <span className={isTopStop ? 'font-bold text-accent' : 'text-danger'}>
                    Stopped: {nf(s.stoppedHere)} ({s.dropOffRate}% drop-off)
                  </span>
                )}
              </div>
            </div>
            <div
              className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-200"
              role="img"
              aria-label={`${s.label}: ${s.reached} reached, ${s.stoppedHere} stopped (${s.dropOffRate}% drop-off)`}
            >
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${Math.max(0, reachedPct - stoppedPct)}%` }}
                title={`Continued: ${nf(Math.max(0, s.reached - s.stoppedHere))}`}
              />
              {s.stoppedHere > 0 && (
                <div
                  className={`h-full transition-all ${isTopStop ? 'bg-accent' : 'bg-danger/80'}`}
                  style={{ width: `${Math.max(2, stoppedPct)}%` }}
                  title={`Stopped here: ${nf(s.stoppedHere)}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
