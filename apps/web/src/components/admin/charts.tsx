'use client';

import { useId, useState } from 'react';

/** Series colours: brand blue and orange, stepped so they pass colour-blind and contrast checks. */
export const SERIES = { buy: '#2563eb', rent: '#ea580c', other: '#94a3b8' } as const;

export const nf = (n: number) => n.toLocaleString('en-IN');

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

/** Tiny trend line for a KPI card. */
export function Sparkline({ data, color = SERIES.buy }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div className="h-9" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 120;
  const h = 34;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-2 block h-9 w-full"
      aria-hidden="true"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v)! * pow;
  return step * 4;
}

type Day = { date: string; buy: number; rent: number; other: number };

/** Enquiries per day, buy vs rent (other = general enquiries, added to the total). */
export function LeadsChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const W = 640;
  const H = 230;
  const L = 34;
  const T = 14;
  const B = 32;
  const plotW = W - L - 8;
  const plotH = H - T - B;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.buy, d.rent + d.other)), 1));
  const x = (i: number) => L + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const line = (f: (d: Day) => number) =>
    data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(f(d)).toFixed(1)}`).join(' ');
  const buyPath = line((d) => d.buy);
  const rentPath = line((d) => d.rent + d.other);
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const labelEvery = Math.ceil(data.length / 5);
  const h = hover !== null ? data[hover] : null;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * plotW;
    const i = Math.round((px / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y"
        role="img"
        aria-label={`Enquiries per day from ${shortDay(data[0]!.date)} to ${shortDay(data.at(-1)!.date)}`}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={SERIES.buy} stopOpacity=".16" />
            <stop offset="1" stopColor={SERIES.buy} stopOpacity="0" />
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
        <path
          d={`${buyPath} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`}
          fill={`url(#${gid})`}
        />
        <path d={buyPath} fill="none" stroke={SERIES.buy} strokeWidth={2} strokeLinejoin="round" />
        <path
          d={rentPath}
          fill="none"
          stroke={SERIES.rent}
          strokeWidth={2}
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
              cy={y(h.buy)}
              r={4.5}
              fill="#fff"
              stroke={SERIES.buy}
              strokeWidth={2.5}
            />
            <circle
              cx={x(hover)}
              cy={y(h.rent + h.other)}
              r={4.5}
              fill="#fff"
              stroke={SERIES.rent}
              strokeWidth={2.5}
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
            Buy {h.buy} · Rent {h.rent}
            {h.other ? ` · General ${h.other}` : ''}
          </p>
        </div>
      )}
      <table className="sr-only">
        <caption>Enquiries per day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Buy</th>
            <th>Rent</th>
            <th>General</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{longDay(d.date)}</td>
              <td>{d.buy}</td>
              <td>{d.rent}</td>
              <td>{d.other}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** A labelled horizontal bar; width is value / max. */
export function MeterBar({
  value,
  max,
  color = SERIES.buy,
  height = 6,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0;
  return (
    <span className="block flex-1 overflow-hidden rounded-full bg-surface" style={{ height }}>
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </span>
  );
}
