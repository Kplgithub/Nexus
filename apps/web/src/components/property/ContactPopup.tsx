'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  CONTACT_INTENTS,
  formatIndianPhone,
  type ContactIntent,
  type SessionUser,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { OtpInput, TextField, useCountdown, type FieldErrors } from '../auth/fields';
import { CloseIcon, PhoneIcon, WhatsAppIcon } from '../icons';
import { PremiumBadge } from './PremiumBadge';

export type Revealed = {
  name: string;
  contactPerson: string;
  phone: string;
  whatsapp: string | null;
  /** Where a copy of the number was sent. */
  sent?: { email: boolean; mobile: boolean };
};

const INTENT_LABELS: Record<ContactIntent, string> = {
  tenant: 'Tenant',
  buyer: 'Buyer',
  broker: 'Broker / Agent',
  owner: 'Owner',
};

const TITLES = {
  details: 'See the number',
  otp: 'Enter the OTP',
  done: 'Here is the number',
} as const;

export type ContactPopupHandle = { open: () => void };

/**
 * "View phone number" for visitors who are not signed in: who they are, name, email
 * and mobile, then an OTP. A new number gets an account on its own, then the number
 * shows here and is sent to their email and mobile.
 */
export const ContactPopup = forwardRef<
  ContactPopupHandle,
  {
    propertyId: string;
    posterName: string;
    premium: boolean;
    waText: string;
    onRevealed: (r: Revealed) => void;
  }
>(function ContactPopup({ propertyId, posterName, premium, waText, onRevealed }, ref) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { setUser, requireLogin } = useSession();
  const [step, setStep] = useState<'details' | 'otp' | 'done'>('details');
  const [intent, setIntent] = useState<ContactIntent>('tenant');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const resend = useCountdown(30);

  useImperativeHandle(ref, () => ({ open: () => dialog.current?.showModal() }));

  const body = () => ({ intent, ...form, acceptTerms: agree as true });

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiClientError) {
      setError(err.message);
      setFieldErrors(err.details ?? {});
    } else setError(fallback);
  }

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!agree) {
      setError('Please accept the terms to continue');
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const { data } = await apiFetch<{ devCode?: string }>('/auth/quick/start', {
        method: 'POST',
        body: body(),
      });
      setDevCode(data.devCode ?? null);
      setCode('');
      setStep('otp');
      resend.start();
    } catch (err) {
      fail(err, 'Could not send the OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ user: SessionUser }>('/auth/quick/verify', {
        method: 'POST',
        body: { ...body(), code },
      });
      setUser(data.user);
      const shown = await apiFetch<Revealed>(`/me/contact/${propertyId}`, { method: 'POST' });
      setRevealed(shown.data);
      onRevealed(shown.data);
      setStep('done');
    } catch (err) {
      fail(err, 'Could not check the code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const stepIndex = ['details', 'otp', 'done'].indexOf(step);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="contact-popup-title"
      className="contact-sheet m-0 mt-auto w-full max-w-none rounded-t-3xl border border-line bg-white p-0 shadow-2xl backdrop:bg-brand-900/55 sm:m-auto sm:w-[28rem] sm:rounded-3xl"
    >
      <div className="max-h-[90vh] overflow-y-auto px-6 pt-6 pb-7">
        <div className="flex items-center justify-between">
          <h2 id="contact-popup-title" className="text-2xl">
            {TITLES[step]}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="rounded-full p-1 text-ink-muted hover:bg-surface"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="mt-4 mb-5 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-line'}`}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {step === 'details' && (
          <form onSubmit={sendOtp} noValidate className="space-y-4">
            <p className="text-sm text-ink-muted">
              Tell us a little about you. It takes 30 seconds and it’s free.
            </p>
            <fieldset>
              <legend className="field-label">I am a</legend>
              <div className="flex flex-wrap gap-2">
                {CONTACT_INTENTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={intent === i}
                    onClick={() => setIntent(i)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                      intent === i
                        ? 'border-brand bg-brand-50 text-brand'
                        : 'border-line-strong text-ink-soft'
                    }`}
                  >
                    {INTENT_LABELS[i]}
                  </button>
                ))}
              </div>
            </fieldset>
            <TextField
              id="qs-name"
              label="Your name"
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              error={fieldErrors.name?.[0]}
              required
            />
            <TextField
              id="qs-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email?.[0]}
              required
            />
            <TextField
              id="qs-phone"
              label="Mobile number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile"
              value={form.phone}
              onChange={set('phone')}
              error={fieldErrors.phone?.[0]}
              required
            />
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" className="font-semibold text-brand underline">
                  Terms
                </a>{' '}
                and to be contacted about this property
              </span>
            </label>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
            <p className="text-center text-sm text-ink-muted">
              Already have an account?{' '}
              <button
                type="button"
                className="font-semibold text-brand hover:underline"
                onClick={() => requireLogin('contact')}
              >
                Log in
              </button>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-ink-muted">
              We sent a 6-digit code to{' '}
              <b className="text-ink">{formatIndianPhone(form.phone) || form.phone}</b>{' '}
              <button
                type="button"
                className="font-semibold text-brand hover:underline"
                onClick={() => setStep('details')}
              >
                Change
              </button>
            </p>
            <OtpInput value={code} onChange={setCode} error={fieldErrors.code?.[0]} />
            {devCode && <p className="text-xs text-ink-muted">Test code: {devCode}</p>}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || code.length < 6}
            >
              {busy ? 'Checking…' : 'Verify and see number'}
            </button>
            <p className="text-center text-sm text-ink-muted">
              {resend.left > 0 ? (
                `Resend code in 0:${String(resend.left).padStart(2, '0')}`
              ) : (
                <button
                  type="button"
                  className="font-semibold text-brand hover:underline"
                  onClick={() => void sendOtp()}
                >
                  Resend code
                </button>
              )}
            </p>
            <p className="rounded-lg bg-surface p-3 text-xs text-ink-muted">
              Your NEXUS Estate account is created on its own. No password needed.
            </p>
          </form>
        )}

        {step === 'done' && revealed && (
          <div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand font-bold text-white">
                {posterName.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {revealed.name}
                  {premium && <PremiumBadge />}
                </p>
                {revealed.contactPerson !== revealed.name && (
                  <p className="text-sm text-ink-muted">Contact: {revealed.contactPerson}</p>
                )}
              </div>
            </div>
            <p className="tabular mt-5 text-center font-display text-3xl text-brand-900">
              {formatIndianPhone(revealed.phone)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${revealed.phone}`} className="btn btn-primary">
                <PhoneIcon size={18} /> Call now
              </a>
              {revealed.whatsapp ? (
                <a
                  href={`https://wa.me/${revealed.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  <WhatsAppIcon size={18} /> WhatsApp
                </a>
              ) : (
                <span />
              )}
            </div>
            {(revealed.sent?.email || revealed.sent?.mobile) && (
              <div className="mt-4 space-y-1 rounded-xl bg-success-50 p-3 text-sm font-semibold text-success">
                {revealed.sent.email && <p>Also sent to {form.email}</p>}
                {revealed.sent.mobile && (
                  <p>Also sent to your mobile {formatIndianPhone(form.phone) || form.phone}</p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              You are now signed in. Next time the number shows with one tap.
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
});
