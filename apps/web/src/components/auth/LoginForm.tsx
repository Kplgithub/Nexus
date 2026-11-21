'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AuthConfig, SessionUser } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { ArrowLeft, ArrowRight, LockIcon, SmartphoneIcon } from '../icons';
import {
  OtpInput,
  PasswordField,
  TextField,
  safeNext,
  useCountdown,
  type FieldErrors,
} from './fields';

const REASONS: Record<string, string> = {
  save: 'Log in to save properties to your account.',
  contact: 'Log in to see the owner’s contact details.',
  post: 'Log in to post your property.',
};

export function LoginForm({ config }: { config: AuthConfig }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const next = safeNext(params.get('next'));
  const reason = REASONS[params.get('reason') ?? ''];
  const [mode, setMode] = useState<'password' | 'otp'>(config.otpEnabled ? 'otp' : 'password');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // OTP state
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const timer = useCountdown(30);

  async function done() {
    await refresh();
    router.replace(next);
    router.refresh();
  }

  function fail(err: unknown) {
    if (err instanceof ApiClientError) {
      setErrors(err.details ?? {});
      setFormError(err.message);
    } else setFormError('Something went wrong. Please try again.');
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: { identifier: fd.get('identifier'), password: fd.get('password') },
      });
      await done();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const { data } = await apiFetch<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone, purpose: 'login' },
      });
      setCodeSent(true);
      setDevCode(data.devCode);
      timer.start();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!codeSent) return void sendCode();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch('/auth/otp/login', { method: 'POST', body: { phone, code } });
      await done();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  function switchMode(m: 'password' | 'otp') {
    setMode(m);
    setErrors({});
    setFormError(null);
  }

  // The same message is already shown under the field it belongs to.
  const errorBox = formError && !Object.values(errors).some((v) => v?.[0] === formError) && (
    <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
      {formError}
    </p>
  );

  // Second OTP screen: the code was sent, ask for it.
  if (mode === 'otp' && codeSent) {
    return (
      <form onSubmit={onOtp} noValidate>
        <button
          type="button"
          className="auth-back mb-4"
          onClick={() => {
            setCodeSent(false);
            setCode('');
            setErrors({});
            setFormError(null);
          }}
        >
          <ArrowLeft size={16} />
          Change number
        </button>
        <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">Check your phone</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          We sent a 6-digit code to <strong className="text-ink">+91 {phone}</strong>
        </p>
        <div className="mt-7">
          <OtpInput value={code} onChange={setCode} error={errors.code?.[0]} />
          {devCode && (
            <p className="mt-2 rounded bg-warn-50 px-2 py-1 text-xs text-warn">
              Development mode — code: <strong>{devCode}</strong>
            </p>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            Didn&apos;t get it?{' '}
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={timer.left > 0 || busy}
              className="font-bold text-brand disabled:text-ink-muted"
            >
              {timer.left > 0
                ? `Resend in 0:${String(timer.left).padStart(2, '0')}`
                : 'Resend code'}
            </button>
          </p>
        </div>
        {errorBox && <div className="mt-5">{errorBox}</div>}
        <button type="submit" className="auth-cta mt-6" disabled={busy || code.length < 6}>
          {busy ? 'Please wait…' : 'Verify and log in'}
        </button>
      </form>
    );
  }

  return (
    <div>
      <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">Log in to NEXUS</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        {reason ?? 'Your saved homes, site visits and enquiries, all in one place.'}
      </p>

      {config.otpEnabled && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mt-6 flex gap-6 border-b-[1.5px] border-line"
        >
          {(
            [
              ['otp', 'Mobile OTP', SmartphoneIcon],
              ['password', 'Password', LockIcon],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`-mb-[1.5px] flex items-center gap-2 border-b-[2.5px] pb-3 text-[14.5px] font-bold ${mode === m ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-brand'}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'password' ? (
        <form onSubmit={onPassword} className="mt-6 space-y-5" noValidate>
          <TextField
            id="identifier"
            label="Email or mobile number"
            autoComplete="username"
            required
            error={errors.identifier?.[0]}
          />
          <PasswordField id="password" label="Password" error={errors.password?.[0]} />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-brand underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          {errorBox}
          <button type="submit" className="auth-cta" disabled={busy}>
            {busy ? (
              'Logging in…'
            ) : (
              <>
                Log in
                <span className="auth-cta-arrow" aria-hidden>
                  <ArrowRight size={14} />
                </span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={onOtp} className="mt-6" noValidate>
          <label htmlFor="phone" className="field-label">
            Mobile number
          </label>
          <div className="auth-phone" data-invalid={!!errors.phone?.[0]}>
            <span aria-hidden>+91</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98290 00000"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setCodeSent(false);
                setCode('');
              }}
              aria-invalid={!!errors.phone?.[0]}
              aria-describedby={errors.phone?.[0] ? 'phone-err' : 'phone-hint'}
            />
          </div>
          {errors.phone?.[0] ? (
            <p id="phone-err" className="field-error">
              {errors.phone[0]}
            </p>
          ) : (
            <p id="phone-hint" className="field-hint">
              We&apos;ll send a 6-digit code by SMS. No password needed.
            </p>
          )}
          {errorBox && <div className="mt-5">{errorBox}</div>}
          <button type="submit" className="auth-cta mt-6" disabled={busy || !phone.trim()}>
            {busy ? (
              'Sending…'
            ) : (
              <>
                Send OTP
                <span className="auth-cta-arrow" aria-hidden>
                  <ArrowRight size={14} />
                </span>
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[14.5px] text-ink-soft">
        New to NEXUS Estate?{' '}
        <Link
          href={`/signup${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="auth-link"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
