'use client';

import { useId, useState } from 'react';
import { emi, formatINR, formatINRShort } from '@nexus/shared';

/** Home-loan EMI estimate. Defaults: 80% loan, 8.5% for 20 years. */
export function EmiCalculator({ price }: { price: number }) {
  const uid = useId();
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const loan = Math.round((price * (100 - downPct)) / 100);
  const monthly = emi(loan, rate, years);
  const total = monthly * years * 12;
  const interest = Math.max(0, total - loan);

  return (
    <div className="card p-5 sm:p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="space-y-5">
          <Slider
            id={`${uid}-down`}
            label="Down payment"
            value={downPct}
            min={10}
            max={90}
            step={5}
            onChange={setDownPct}
            display={`${downPct}% · ${formatINRShort(price - loan)}`}
          />
          <Slider
            id={`${uid}-rate`}
            label="Interest rate"
            value={rate}
            min={6}
            max={14}
            step={0.05}
            onChange={setRate}
            display={`${rate.toFixed(2)}% a year`}
          />
          <Slider
            id={`${uid}-years`}
            label="Loan tenure"
            value={years}
            min={5}
            max={30}
            step={1}
            onChange={setYears}
            display={`${years} years`}
          />
        </div>
        <div className="rounded-xl bg-brand-50 p-5" aria-live="polite">
          <p className="text-sm text-ink-muted">Estimated EMI</p>
          <p className="tabular mt-1 font-display text-3xl text-brand-900">
            {formatINR(monthly)}
            <span className="text-base text-ink-muted">/month</span>
          </p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Loan amount</dt>
              <dd className="tabular font-medium">{formatINRShort(loan)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Total interest</dt>
              <dd className="tabular font-medium">{formatINRShort(interest)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        An estimate only. Your bank decides the actual rate, tenure and loan amount.
      </p>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label mb-0">
          {label}
        </label>
        <span className="tabular text-sm font-semibold">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-brand)]"
      />
    </div>
  );
}
