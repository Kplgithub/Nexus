'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { emi, formatINR, formatINRShort, type LoanLender } from '@nexus/shared';
import { pickLoanOffer } from './LoanForm';
import { useSections } from '../session/SectionsProvider';

const TABS = [
  ['emi', 'EMI'],
  ['eligibility', 'Eligibility'],
  ['transfer', 'Balance transfer'],
  ['prepay', 'Part prepayment'],
] as const;
type Tab = (typeof TABS)[number][0];

/** Largest loan a monthly EMI can repay. */
function loanFor(monthly: number, rate: number, years: number) {
  const r = rate / 1200;
  const n = years * 12;
  if (monthly <= 0) return 0;
  if (r === 0) return monthly * n;
  const f = Math.pow(1 + r, n);
  return Math.round((monthly * (f - 1)) / (r * f));
}

/** Months to repay `principal` at a fixed `monthly` EMI. */
function monthsFor(principal: number, rate: number, monthly: number) {
  const r = rate / 1200;
  if (principal <= 0) return 0;
  if (r === 0) return Math.ceil(principal / monthly);
  const x = 1 - (r * principal) / monthly;
  if (x <= 0) return Infinity;
  return Math.ceil(-Math.log(x) / Math.log(1 + r));
}

const years = (m: number) => {
  const y = Math.floor(m / 12);
  const mm = m % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', mm ? `${mm} mo` : ''].filter(Boolean).join(' ');
};

export function LoanCalculators({
  lenders,
  exampleRate,
  city = 'jaipur',
}: {
  lenders: LoanLender[];
  exampleRate: number;
  city?: string;
}) {
  const [tab, setTab] = useState<Tab>('emi');
  const [rate, setRate] = useState(exampleRate);
  const [picked, setPicked] = useState<string | null>(null);
  const uid = useId();

  const chips = (
    <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-line pb-5">
      <span className="mr-1 text-xs font-bold text-ink-muted">Use a rate:</span>
      <Chip
        on={!picked}
        onClick={() => {
          setPicked(null);
          setRate(exampleRate);
        }}
      >
        Example · {exampleRate.toFixed(2)}%
      </Chip>
      {lenders.map((l) => (
        <Chip
          key={l.name}
          on={picked === l.name}
          onClick={() => {
            setPicked(l.name);
            setRate(l.rateFrom);
          }}
        >
          {l.name} · {l.rateFrom.toFixed(2)}%
        </Chip>
      ))}
    </div>
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Loan calculators"
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`${uid}-tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`${uid}-panel`}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-bold transition ${
              tab === k
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white text-ink-soft hover:border-brand-100 hover:text-brand'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${tab}`}
        className="overflow-hidden rounded-3xl border border-line bg-white"
      >
        {tab === 'emi' && (
          <EmiTab
            rate={rate}
            setRate={setRate}
            chips={chips}
            lender={picked}
            hasRates={lenders.length > 0}
          />
        )}
        {tab === 'eligibility' && (
          <EligibilityTab rate={rate} setRate={setRate} chips={chips} city={city} />
        )}
        {tab === 'transfer' && <TransferTab newRate={rate} setNewRate={setRate} chips={chips} />}
        {tab === 'prepay' && <PrepayTab rate={rate} setRate={setRate} chips={chips} />}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Calculators give estimates for planning only. The bank decides your final rate, tenure and
        loan amount.
      </p>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        on
          ? 'border-brand-100 bg-brand-50 text-brand'
          : 'border-line bg-surface text-ink-soft hover:text-brand'
      }`}
    >
      {children}
    </button>
  );
}

function Layout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[1.25fr_1fr]">
      <div className="space-y-6 p-5 sm:p-7">{left}</div>
      <div
        className="flex flex-col items-center justify-center border-t border-line bg-surface p-5 text-center sm:p-7 md:border-l md:border-t-0"
        aria-live="polite"
      >
        {right}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: [string, string, string?][] }) {
  return (
    <dl className="mt-5 w-full space-y-2 text-sm">
      {rows.map(([k, v, dot], i) => (
        <div
          key={k}
          className={`flex justify-between gap-3 ${i === rows.length - 1 && rows.length > 2 ? 'border-t border-dashed border-line-strong pt-2 font-bold' : ''}`}
        >
          <dt className="flex items-center gap-2 text-ink-soft">
            {dot && (
              <span className="size-2.5 rounded-sm" style={{ background: dot }} aria-hidden />
            )}
            {k}
          </dt>
          <dd className="tabular font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const Big = ({ label, value }: { label: string; value: string }) => (
  <>
    <p className="text-sm font-semibold text-ink-muted">{label}</p>
    <p className="tabular mt-1 font-display text-4xl text-brand-900 sm:text-5xl">{value}</p>
  </>
);

function EmiTab({
  rate,
  setRate,
  chips,
  lender,
  hasRates,
}: {
  rate: number;
  setRate: (v: number) => void;
  chips: React.ReactNode;
  lender: string | null;
  hasRates: boolean;
}) {
  const id = useId();
  const [amount, setAmount] = useState(3_500_000);
  const [yrs, setYrs] = useState(20);
  const monthly = emi(amount, rate, yrs);
  const total = monthly * yrs * 12;
  const interest = Math.max(0, total - amount);
  const pct = total ? (amount / total) * 100 : 100;
  return (
    <Layout
      left={
        <>
          {chips}
          <Slider
            id={`${id}a`}
            label="Loan amount"
            value={amount}
            min={500_000}
            max={20_000_000}
            step={100_000}
            onChange={setAmount}
            display={formatINR(amount)}
          />
          <Slider
            id={`${id}r`}
            label="Interest rate (per year)"
            value={rate}
            min={6}
            max={14}
            step={0.05}
            onChange={setRate}
            display={`${rate.toFixed(2)} %`}
          />
          <Slider
            id={`${id}y`}
            label="Tenure"
            value={yrs}
            min={5}
            max={30}
            step={1}
            onChange={setYrs}
            display={`${yrs} years`}
          />
        </>
      }
      right={
        <>
          <Big label="Your monthly EMI" value={formatINR(monthly)} />
          <div
            className="mt-5 grid size-40 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-brand) 0 ${pct}%, var(--color-accent) ${pct}% 100%)`,
            }}
            role="img"
            aria-label={`Principal ${Math.round(pct)}%, interest ${100 - Math.round(pct)}% of what you pay`}
          >
            <div className="grid size-[6.5rem] place-items-center rounded-full bg-surface text-xs text-ink-muted">
              Principal vs
              <br />
              interest
            </div>
          </div>
          <Rows
            rows={[
              ['Principal', formatINR(amount), 'var(--color-brand)'],
              ['Total interest', formatINR(interest), 'var(--color-accent)'],
              ['Total you pay', formatINR(total)],
            ]}
          />
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            {hasRates ? (
              <a href="#rates" className="btn btn-outline bg-white">
                Compare banks
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              className={`btn btn-primary ${hasRates ? '' : 'col-span-2'}`}
              onClick={() => pickLoanOffer({ amount, lender: lender ?? undefined })}
            >
              Get best offer
            </button>
          </div>
        </>
      }
    />
  );
}

function EligibilityTab({
  rate,
  setRate,
  chips,
  city,
}: {
  rate: number;
  setRate: (v: number) => void;
  chips: React.ReactNode;
  city: string;
}) {
  const id = useId();
  const on = useSections();
  const [income, setIncome] = useState(90_000);
  const [existing, setExisting] = useState(0);
  const [yrs, setYrs] = useState(20);
  // Banks usually keep all EMIs within about half of monthly income.
  const maxEmi = Math.max(0, Math.round(income * 0.5 - existing));
  const loan = loanFor(maxEmi, rate, yrs);
  const budget = Math.round(loan / 0.8 / 100_000) * 100_000;
  return (
    <Layout
      left={
        <>
          {chips}
          <Slider
            id={`${id}i`}
            label="Monthly income (take-home)"
            value={income}
            min={15_000}
            max={1_000_000}
            step={5_000}
            onChange={setIncome}
            display={formatINR(income)}
          />
          <Slider
            id={`${id}e`}
            label="Current EMIs you pay"
            value={existing}
            min={0}
            max={300_000}
            step={1_000}
            onChange={setExisting}
            display={formatINR(existing)}
          />
          <Slider
            id={`${id}r`}
            label="Interest rate (per year)"
            value={rate}
            min={6}
            max={14}
            step={0.05}
            onChange={setRate}
            display={`${rate.toFixed(2)} %`}
          />
          <Slider
            id={`${id}y`}
            label="Tenure"
            value={yrs}
            min={5}
            max={30}
            step={1}
            onChange={setYrs}
            display={`${yrs} years`}
          />
        </>
      }
      right={
        <>
          <Big
            label="You may be eligible for up to"
            value={loan > 0 ? formatINRShort(loan) : '—'}
          />
          <Rows
            rows={[
              ['EMI you can afford', loan > 0 ? `${formatINR(maxEmi)}/mo` : '—'],
              ['Home budget with 20% down', budget > 0 ? formatINRShort(budget) : '—'],
            ]}
          />
          {loan > 0 ? (
            <div className="mt-5 grid w-full gap-2">
              {on.buy && (
                <Link
                  href={`/buy?city=${city}&maxPrice=${budget}`}
                  className="btn btn-outline bg-white"
                >
                  See homes up to {formatINRShort(budget)}
                </Link>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => pickLoanOffer({ amount: loan })}
              >
                Apply for this loan
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Your current EMIs already use up half your income.
            </p>
          )}
        </>
      }
    />
  );
}

function TransferTab({
  newRate,
  setNewRate,
  chips,
}: {
  newRate: number;
  setNewRate: (v: number) => void;
  chips: React.ReactNode;
}) {
  const id = useId();
  const [outstanding, setOutstanding] = useState(2_500_000);
  const [left, setLeft] = useState(15);
  const [current, setCurrent] = useState(9.5);
  const oldEmi = emi(outstanding, current, left);
  const newEmi = emi(outstanding, newRate, left);
  const monthly = oldEmi - newEmi;
  const totalSave = monthly * left * 12;
  return (
    <Layout
      left={
        <>
          <Slider
            id={`${id}o`}
            label="Loan still to repay"
            value={outstanding}
            min={500_000}
            max={20_000_000}
            step={100_000}
            onChange={setOutstanding}
            display={formatINR(outstanding)}
          />
          <Slider
            id={`${id}l`}
            label="Years left"
            value={left}
            min={1}
            max={30}
            step={1}
            onChange={setLeft}
            display={`${left} years`}
          />
          <Slider
            id={`${id}c`}
            label="Your current rate"
            value={current}
            min={6}
            max={16}
            step={0.05}
            onChange={setCurrent}
            display={`${current.toFixed(2)} %`}
          />
          {chips}
          <Slider
            id={`${id}n`}
            label="New rate"
            value={newRate}
            min={6}
            max={14}
            step={0.05}
            onChange={setNewRate}
            display={`${newRate.toFixed(2)} %`}
          />
        </>
      }
      right={
        monthly > 0 ? (
          <>
            <Big label="You could save" value={formatINRShort(totalSave)} />
            <Rows
              rows={[
                ['EMI now', `${formatINR(oldEmi)}/mo`],
                ['EMI after transfer', `${formatINR(newEmi)}/mo`],
                ['Saving every month', `${formatINR(monthly)}`],
              ]}
            />
            <p className="mt-3 text-xs text-ink-muted">
              Before the new bank’s processing fee and charges.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              onClick={() => pickLoanOffer({ amount: outstanding })}
            >
              Move my loan
            </button>
          </>
        ) : (
          <>
            <Big label="You could save" value="₹0" />
            <p className="mt-3 text-sm text-ink-muted">
              The new rate is not lower than what you pay now, so a transfer would not help.
            </p>
          </>
        )
      }
    />
  );
}

function PrepayTab({
  rate,
  setRate,
  chips,
}: {
  rate: number;
  setRate: (v: number) => void;
  chips: React.ReactNode;
}) {
  const id = useId();
  const [outstanding, setOutstanding] = useState(3_000_000);
  const [left, setLeft] = useState(18);
  const [extra, setExtra] = useState(300_000);
  const payment = emi(outstanding, rate, left);
  const before = left * 12;
  const after = monthsFor(Math.max(0, outstanding - extra), rate, payment);
  const interestBefore = payment * before - outstanding;
  const interestAfter = Number.isFinite(after)
    ? payment * after - (outstanding - extra)
    : interestBefore;
  const saved = Math.max(0, Math.round(interestBefore - interestAfter - 0));
  const cut = Number.isFinite(after) ? before - after : 0;
  return (
    <Layout
      left={
        <>
          {chips}
          <Slider
            id={`${id}o`}
            label="Loan still to repay"
            value={outstanding}
            min={500_000}
            max={20_000_000}
            step={100_000}
            onChange={(v) => {
              setOutstanding(v);
              if (extra > v) setExtra(v);
            }}
            display={formatINR(outstanding)}
          />
          <Slider
            id={`${id}r`}
            label="Interest rate (per year)"
            value={rate}
            min={6}
            max={14}
            step={0.05}
            onChange={setRate}
            display={`${rate.toFixed(2)} %`}
          />
          <Slider
            id={`${id}l`}
            label="Years left"
            value={left}
            min={1}
            max={30}
            step={1}
            onChange={setLeft}
            display={`${left} years`}
          />
          <Slider
            id={`${id}x`}
            label="Extra amount you pay now"
            value={extra}
            min={0}
            max={outstanding}
            step={50_000}
            onChange={setExtra}
            display={formatINR(extra)}
          />
        </>
      }
      right={
        <>
          <Big label="Interest you save" value={formatINRShort(saved)} />
          <Rows
            rows={[
              ['Same EMI', `${formatINR(payment)}/mo`],
              ['Loan ends earlier by', cut > 0 ? years(cut) : '—'],
            ]}
          />
          <p className="mt-3 text-xs text-ink-muted">
            Most banks charge no fee for prepaying a floating rate home loan. Check with yours.
          </p>
        </>
      }
    />
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
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-bold">
          {label}
        </label>
        <span className="tabular min-w-28 rounded-lg border border-line-strong px-3 py-1 text-right text-sm font-extrabold text-brand">
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nx-range mt-3 w-full"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
