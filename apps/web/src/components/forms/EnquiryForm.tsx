'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { Honeypot, honeypotValue } from './Honeypot';
import { CheckIcon } from '../icons';
import { useOptionalSession } from '../session/SessionProvider';

type Props = {
  type?: 'property' | 'general' | 'callback';
  propertyId?: string;
  /** New-project enquiries go to the builder. */
  projectId?: string;
  propertyTitle?: string;
  sourcePage: string;
  submitLabel?: string;
  compact?: boolean;
  defaultMessage?: string;
  /** Who will reply, shown in the confirmation (defaults to "Our team"). */
  recipient?: string;
};

type Errors = Record<string, string[] | undefined>;

export function EnquiryForm({
  type = 'general',
  propertyId,
  projectId,
  propertyTitle,
  sourcePage,
  submitLabel = 'Send enquiry',
  compact,
  defaultMessage,
  recipient,
}: Props) {
  const me = useOptionalSession()?.user ?? null;
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const openedAt = useRef<number>(0);
  const uid = `enq${useId().replace(/:/g, '')}`;

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrors({});
    setFormError(null);

    const local: Errors = {};
    const name = String(fd.get('name') ?? '').trim();
    const phone = String(fd.get('phone') ?? '').trim();
    if (name.length < 2) local.name = ['Please enter your name'];
    if (phone.replace(/\D/g, '').length < 10) local.phone = ['Please enter a valid mobile number'];
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
          type,
          name,
          phone,
          email: String(fd.get('email') ?? ''),
          message: String(fd.get('message') ?? ''),
          propertyId,
          projectId,
          sourcePage,
          consent: true,
          website: honeypotValue(fd),
          elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
        },
      });
      // Only claim success once the API confirmed the save.
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
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-success/30 bg-success-50 p-6"
      >
        <div className="flex items-center gap-2 font-semibold text-success">
          <CheckIcon /> Enquiry received
        </div>
        <p className="mt-2 text-ink-soft">
          Thank you. {recipient ?? 'Our team'} will contact you shortly
          {propertyTitle ? ` about “${propertyTitle}”` : ''}.
        </p>
        {leadId && (
          <p className="mt-2 text-sm text-ink-muted">
            Your reference: <strong className="text-ink">{leadId}</strong>
          </p>
        )}
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <form
      key={me?.id ?? 'guest'}
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-describedby={formError ? `${uid}-error` : undefined}
    >
      <div className={compact ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
        <div>
          <label htmlFor={`${uid}-name`} className="field-label">
            Name
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            defaultValue={me?.name ?? ''}
            autoComplete="name"
            required
            maxLength={80}
            className="field"
            aria-invalid={!!err('name')}
            aria-describedby={err('name') ? `${uid}-name-err` : undefined}
          />
          {err('name') && (
            <p id={`${uid}-name-err`} className="field-error">
              {err('name')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-phone`} className="field-label">
            Mobile number
          </label>
          <input
            id={`${uid}-phone`}
            name="phone"
            defaultValue={me?.phone ?? ''}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="10-digit mobile"
            className="field"
            aria-invalid={!!err('phone')}
            aria-describedby={err('phone') ? `${uid}-phone-err` : undefined}
          />
          {err('phone') && (
            <p id={`${uid}-phone-err`} className="field-error">
              {err('phone')}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="field-label">
          Email <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          defaultValue={me?.email ?? ''}
          type="email"
          autoComplete="email"
          maxLength={120}
          className="field"
          aria-invalid={!!err('email')}
        />
        {err('email') && <p className="field-error">{err('email')}</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-message`} className="field-label">
          Message
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          maxLength={2000}
          rows={compact ? 3 : 4}
          className="field"
          defaultValue={defaultMessage}
          placeholder={
            propertyId
              ? 'When can I visit? Is the price negotiable?'
              : 'Budget, preferred area, move-in date…'
          }
        />
      </div>

      <Honeypot id={`${uid}-hp`} />

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="consent"
            value="true"
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
            aria-invalid={!!err('consent')}
          />
          <span>
            I agree to be contacted by NEXUS Estate by phone, WhatsApp or email about this enquiry,
            and accept the{' '}
            <Link href="/privacy-policy" className="text-brand underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {err('consent') && <p className="field-error">{err('consent')}</p>}
      </div>

      {formError && (
        <p
          id={`${uid}-error`}
          role="alert"
          className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger"
        >
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
