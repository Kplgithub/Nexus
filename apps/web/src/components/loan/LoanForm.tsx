'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  LOAN_EMPLOYMENT,
  LOAN_EMPLOYMENT_LABELS,
  LOAN_PURPOSES,
  LOAN_PURPOSE_LABELS,
  formatINRShort,
  type LoanEmployment,
  type LoanPurpose,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { CheckIcon, CloseIcon, LockIcon } from '../icons';
import { useOptionalSession } from '../session/SessionProvider';

/** Fired by the rates table and calculators so the form knows which offer was picked. */
export const LOAN_OFFER_EVENT = 'nx:loan-offer';
export type LoanOfferDetail = { lender?: string; amount?: number };

export function pickLoanOffer(detail: LoanOfferDetail) {
  window.dispatchEvent(new CustomEvent<LoanOfferDetail>(LOAN_OFFER_EVENT, { detail }));
  const form = document.getElementById('loan-form');
  form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(
    () => form?.querySelector<HTMLInputElement>('input[name="name"]')?.focus(),
    450,
  );
}

type Errors = Record<string, string[] | undefined>;

/** Rupees typed with or without commas, or as "35 lakh" / "1.2 cr". */
function parseRupees(raw: string): number {
  const t = raw.toLowerCase().replace(/[,₹\s]/g, '');
  const m = /^(\d+(?:\.\d+)?)(l|lac|lakh|lakhs|cr|crore|crores|k)?$/.exec(t);
  if (!m) return NaN;
  const n = Number(m[1]);
  const unit = m[2] ?? '';
  if (unit.startsWith('l')) return Math.round(n * 100_000);
  if (unit.startsWith('c')) return Math.round(n * 10_000_000);
  if (unit === 'k') return Math.round(n * 1000);
  return Math.round(n);
}

const inr = (n: number) => n.toLocaleString('en-IN');

export function LoanForm({
  propertyId,
  propertyTitle,
  defaultAmount,
  sourcePage,
  title = 'Get a call back on your loan',
  sub = 'Takes 30 seconds. Our loan desk calls you within one working day.',
}: {
  propertyId?: string;
  propertyTitle?: string;
  defaultAmount?: number;
  sourcePage: string;
  title?: string;
  sub?: string;
}) {
  const me = useOptionalSession()?.user ?? null;
  const uid = `ln${useId().replace(/:/g, '')}`;
  const [employment, setEmployment] = useState<LoanEmployment>('salaried');
  const [purpose, setPurpose] = useState<LoanPurpose>(propertyId ? 'found' : 'looking');
  const [amount, setAmount] = useState(defaultAmount ? inr(defaultAmount) : '');
  const [lender, setLender] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
    const on = (e: Event) => {
      const d = (e as CustomEvent<LoanOfferDetail>).detail;
      if (d.lender !== undefined) setLender(d.lender || null);
      if (d.amount) setAmount(inr(d.amount));
    };
    window.addEventListener(LOAN_OFFER_EVENT, on);
    return () => window.removeEventListener(LOAN_OFFER_EVENT, on);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrors({});
    setFormError(null);
    const name = String(fd.get('name') ?? '').trim();
    const phone = String(fd.get('phone') ?? '').trim();
    const loanAmount = parseRupees(amount);
    const incomeRaw = String(fd.get('income') ?? '').trim();
    const income = incomeRaw ? parseRupees(incomeRaw) : undefined;

    const local: Errors = {};
    if (name.length < 2) local.name = ['Please enter your name'];
    if (phone.replace(/\D/g, '').length < 10) local.phone = ['Please enter a valid mobile number'];
    if (!Number.isFinite(loanAmount) || loanAmount < 100_000)
      local['loan.amount'] = ['Enter the loan amount, e.g. 35,00,000 or 35 lakh'];
    if (income !== undefined && !Number.isFinite(income))
      local['loan.monthlyIncome'] = ['Enter your monthly income in rupees'];
    if (!fd.get('consent')) local.consent = ['Please agree to be contacted'];
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setState('sending');
    try {
      const { data } = await apiFetch<{ leadId: string }>('/enquiries', {
        method: 'POST',
        body: {
          type: 'home-loan',
          name,
          phone,
          propertyId,
          sourcePage,
          consent: true,
          website: String(fd.get('website') ?? ''),
          elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
          loan: {
            amount: loanAmount,
            monthlyIncome: income,
            employment,
            purpose,
            lender: lender ?? undefined,
          },
        },
      });
      setLeadId(data.leadId);
      setState('done');
    } catch (err) {
      setState('idle');
      if (err instanceof ApiClientError) {
        if (err.details) setErrors(err.details);
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again or call us.');
      }
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="py-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-50 text-success">
          <CheckIcon size={28} />
        </span>
        <h3 className="mt-4 text-2xl">Request received</h3>
        <p className="mt-2 text-ink-soft">
          Our loan desk will call you within one working day
          {propertyTitle ? ` about a loan for “${propertyTitle}”` : ''}.
        </p>
        {leadId && (
          <p className="mt-3 text-sm text-ink-muted">
            Your reference: <strong className="text-ink">{leadId}</strong>
          </p>
        )}
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];
  const amountNum = parseRupees(amount);

  return (
    <form onSubmit={onSubmit} noValidate key={me?.id ?? 'guest'}>
      <h3 className="text-2xl">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{sub}</p>
      {lender && (
        <p className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
          <span>
            Offer picked: <b>{lender}</b>
          </span>
          <button
            type="button"
            aria-label="Remove picked offer"
            className="rounded-full p-1 hover:bg-white"
            onClick={() => setLender(null)}
          >
            <CloseIcon size={14} />
          </button>
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="field-label">
            Full name
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            defaultValue={me?.name ?? ''}
            autoComplete="name"
            maxLength={80}
            className="field"
            aria-invalid={!!err('name')}
          />
          {err('name') && <p className="field-error">{err('name')}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-phone`} className="field-label">
            Mobile number
          </label>
          <input
            id={`${uid}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            defaultValue={me?.phone ?? ''}
            placeholder="10-digit mobile"
            className="field"
            aria-invalid={!!err('phone')}
          />
          {err('phone') && <p className="field-error">{err('phone')}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-amount`} className="field-label">
            Loan amount needed
          </label>
          <input
            id={`${uid}-amount`}
            name="amount"
            inputMode="numeric"
            placeholder="e.g. 35,00,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field"
            aria-invalid={!!err('loan.amount')}
            aria-describedby={`${uid}-amount-hint`}
          />
          {err('loan.amount') ? (
            <p className="field-error">{err('loan.amount')}</p>
          ) : (
            <p id={`${uid}-amount-hint`} className="field-hint">
              {Number.isFinite(amountNum) && amountNum >= 100_000
                ? formatINRShort(amountNum)
                : 'In rupees'}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-income`} className="field-label">
            Monthly income <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id={`${uid}-income`}
            name="income"
            inputMode="numeric"
            placeholder="e.g. 90,000"
            className="field"
            aria-invalid={!!err('loan.monthlyIncome')}
          />
          {err('loan.monthlyIncome') && <p className="field-error">{err('loan.monthlyIncome')}</p>}
        </div>
      </div>

      <Segmented
        label="You are"
        name={`${uid}-emp`}
        value={employment}
        options={LOAN_EMPLOYMENT.map((v) => [v, LOAN_EMPLOYMENT_LABELS[v]])}
        onChange={(v) => setEmployment(v as LoanEmployment)}
      />
      <Segmented
        label="Property"
        name={`${uid}-purpose`}
        value={purpose}
        options={LOAN_PURPOSES.map((v) => [
          v,
          v === 'found' ? 'Found it' : v === 'looking' ? 'Still looking' : LOAN_PURPOSE_LABELS[v],
        ])}
        onChange={(v) => setPurpose(v as LoanPurpose)}
      />

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
        <input
          type="checkbox"
          name="consent"
          defaultChecked
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
        />
        <span>
          I agree that NEXUS Estate may call or WhatsApp me about my home loan and share my details
          with the bank I choose.{' '}
          <Link href="/privacy-policy" className="underline">
            Privacy policy
          </Link>
        </span>
      </label>
      {err('consent') && <p className="field-error">{err('consent')}</p>}
      {formError && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-accent mt-4 w-full py-3.5"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Sending…' : 'Get my loan options'}
      </button>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <LockIcon size={13} /> Free for you. No charge from NEXUS for loan help.
      </p>
    </form>
  );
}

function Segmented({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line-strong p-1">
        {options.map(([v, l]) => (
          <label
            key={v}
            className={`cursor-pointer rounded-lg px-2 py-2 text-center text-[13px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
              value === v
                ? 'bg-brand-50 text-brand shadow-[inset_0_0_0_1.5px_var(--color-brand)]'
                : 'text-ink-soft hover:bg-surface'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
