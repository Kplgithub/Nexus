'use client';

import { useState } from 'react';
import { emi, formatINR, type LoanLender } from '@nexus/shared';
import { ArrowRight, CheckIcon } from '../icons';
import { pickLoanOffer } from './LoanForm';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Public rates table. Names are plain text: no bank logos, no claim of a tie-up. */
export function RatesTable({
  lenders,
  checkedAt,
  sampleLoan = 3_500_000,
}: {
  lenders: LoanLender[];
  checkedAt: string | null;
  sampleLoan?: number;
}) {
  const initials = (n: string) =>
    n
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <table className="nx-rates w-full text-left text-[15px]">
        <thead className="bg-surface text-xs font-bold text-ink-muted">
          <tr>
            <th className="px-5 py-3.5">Lender</th>
            <th className="px-5 py-3.5">Rate from</th>
            <th className="px-5 py-3.5">Max tenure</th>
            <th className="px-5 py-3.5">Processing fee</th>
            <th className="px-5 py-3.5">EMI on ₹35 Lakh*</th>
            <th className="px-5 py-3.5">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lenders.map((l) => (
            <tr key={l.name} className="border-t border-line">
              <td className="px-5 py-4" data-label="">
                <span className="flex items-center gap-3 font-semibold">
                  <span
                    aria-hidden
                    className={`grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold ${
                      l.kind === 'hfc' ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand'
                    }`}
                  >
                    {initials(l.name) || '₹'}
                  </span>
                  {l.name}
                </span>
              </td>
              <td className="px-5 py-4" data-label="Rate from">
                <b className="tabular">{l.rateFrom.toFixed(2)}%</b>
              </td>
              <td className="px-5 py-4" data-label="Tenure">
                Up to {l.maxTenureYears} yrs
              </td>
              <td className="px-5 py-4" data-label="Fee">
                {l.processingFee || '—'}
              </td>
              <td className="tabular px-5 py-4" data-label="EMI">
                {formatINR(emi(sampleLoan, l.rateFrom, Math.min(30, l.maxTenureYears)))}
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() => pickLoanOffer({ lender: l.name })}
                  className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-brand hover:underline"
                >
                  Get this offer <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-accent-50/60 px-5 py-3 text-xs leading-relaxed text-ink-muted">
        Indicative starting rates published by the lenders
        {checkedAt ? `, last checked on ${fmtDate(checkedAt)}` : ''}. *EMI at the starting rate for
        the longest tenure up to 30 years. Your rate depends on your income, credit score and the
        property. The lender’s final offer applies. Listing a lender here does not mean a tie-up
        with NEXUS Estate.
      </p>
    </div>
  );
}

type Guide = {
  key: string;
  label: string;
  title: string;
  intro: string;
  cols: [string, string[]][];
};

export function GuideTabs({ guides }: { guides: Guide[] }) {
  const [open, setOpen] = useState(guides[0]!.key);
  const g = guides.find((x) => x.key === open) ?? guides[0]!;
  return (
    <div className="grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[16rem_1fr]">
      <div
        role="tablist"
        aria-label="Home loan guide"
        className="flex gap-1 overflow-x-auto border-b border-line bg-surface p-2 lg:flex-col lg:border-r lg:border-b-0 lg:p-3"
      >
        {guides.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === open}
            id={`guide-tab-${x.key}`}
            aria-controls="guide-panel"
            onClick={() => setOpen(x.key)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
              x.key === open
                ? 'bg-white text-brand shadow-[inset_3px_0_0_var(--color-accent),0_1px_3px_rgb(0_0_0/0.06)]'
                : 'text-ink-soft hover:text-brand'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div
        id="guide-panel"
        role="tabpanel"
        aria-labelledby={`guide-tab-${g.key}`}
        className="p-5 sm:p-7"
      >
        <h3 className="text-2xl">{g.title}</h3>
        <p className="mt-2 text-ink-soft">{g.intro}</p>
        <div
          className={`mt-5 grid gap-4 ${g.cols.length > 2 ? 'md:grid-cols-3' : g.cols.length > 1 ? 'md:grid-cols-2' : ''}`}
        >
          {g.cols.map(([h, items]) => (
            <div key={h} className="rounded-2xl border border-line p-4">
              <p className="font-bold">{h}</p>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                {items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-success" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Small button that scrolls to the form. */
export function ScrollToFormButton({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => pickLoanOffer({})}>
      {children}
    </button>
  );
}
