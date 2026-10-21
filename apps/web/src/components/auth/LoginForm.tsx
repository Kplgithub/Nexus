'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AuthConfig, SessionUser } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
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
  const [mode, setMode] = useState<'password' | 'otp'>('password');
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

  return (
    <div>
      <h1 className="text-[2.25rem] leading-tight">Welcome back</h1>
      <p className="mt-2 text-ink-soft">
        {reason ?? 'Log in to manage your listings, leads and saved properties.'}
      </p>

      {config.otpEnabled && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mt-8 grid grid-cols-2 rounded-xl bg-surface p-1"
        >
          {(
            [
              ['password', 'Password'],
              ['otp', 'Mobile OTP'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setErrors({});
                setFormError(null);
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold ${mode === m ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
            >
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
              className="text-sm font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {formError && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-primary h-12 w-full" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      ) : (
        <form onSubmit={onOtp} className="mt-6 space-y-5" noValidate>
          <TextField
            id="phone"
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setCodeSent(false);
              setCode('');
            }}
            error={errors.phone?.[0]}
          />
          {codeSent && (
            <div>
              <p className="field-label">Enter the 6-digit code sent to your phone</p>
              <OtpInput value={code} onChange={setCode} error={errors.code?.[0]} />
              {devCode && (
                <p className="mt-2 rounded bg-warn-50 px-2 py-1 text-xs text-warn">
                  Development mode — code: <strong>{devCode}</strong>
                </p>
              )}
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={timer.left > 0 || busy}
                className="mt-3 text-sm font-semibold text-brand disabled:text-ink-muted"
              >
                {timer.left > 0 ? `Resend code in ${timer.left}s` : 'Resend code'}
              </button>
            </div>
          )}
          {formError && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary h-12 w-full"
            disabled={busy || (codeSent && code.length < 6)}
          >
            {busy ? 'Please wait…' : codeSent ? 'Verify and log in' : 'Send code'}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-ink-soft">
        New to NEXUS Estate?{' '}
        <Link
          href={`/signup${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
