'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AuthConfig } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { ArrowLeft, ArrowRight, LockIcon } from '../icons';
import { OtpInput, PasswordField, TextField, type FieldErrors } from './fields';

/** Forgot password: mobile → SMS code → new password; email → link (when email is set up). */
export function ForgotPasswordForm({ config }: { config: AuthConfig }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [stage, setStage] = useState<'ask' | 'code' | 'email-sent'>('ask');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hint =
    config.otpEnabled && config.emailResetEnabled
      ? 'Enter your mobile number to get a code, or your email to get a link.'
      : config.otpEnabled
        ? 'Enter your registered mobile number and we will send a code.'
        : config.emailResetEnabled
          ? 'Enter your registered email and we will send a reset link.'
          : 'Password reset is not available yet. Please contact NEXUS Estate.';

  function fail(err: unknown) {
    if (err instanceof ApiClientError) {
      setErrors(err.details ?? {});
      setFormError(err.message);
    } else setFormError('Something went wrong. Please try again.');
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const { data } = await apiFetch<{ channel: 'sms' | 'email'; devCode?: string }>(
        '/auth/forgot-password',
        { method: 'POST', body: { identifier } },
      );
      setDevCode(data.devCode);
      setStage(data.channel === 'email' ? 'email-sent' : 'code');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { phone: identifier, code, password: fd.get('password') },
      });
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  // The same message is already shown under the field it belongs to.
  const errorBox = formError && !Object.values(errors).some((v) => v?.[0] === formError) && (
    <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
      {formError}
    </p>
  );

  return (
    <div>
      {stage === 'code' ? (
        <button
          type="button"
          className="auth-back mb-4"
          onClick={() => {
            setStage('ask');
            setCode('');
            setErrors({});
            setFormError(null);
          }}
        >
          <ArrowLeft size={16} />
          Use a different number
        </button>
      ) : (
        <Link href="/login" className="auth-back mb-4">
          <ArrowLeft size={16} />
          Back to log in
        </Link>
      )}
      {stage === 'ask' && (
        <span className="mb-4 grid size-[52px] place-items-center rounded-2xl bg-accent-50 text-accent-700">
          <LockIcon size={26} />
        </span>
      )}
      <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">
        {stage === 'code' ? 'Set a new password' : 'Forgot your password?'}
      </h1>
      {stage === 'ask' && (
        <form onSubmit={onAsk} className="mt-2 space-y-6" noValidate>
          <p className="text-[15px] leading-relaxed text-ink-soft">{hint}</p>
          <TextField
            id="identifier"
            label={
              config.otpEnabled && config.emailResetEnabled
                ? 'Mobile number or email'
                : config.otpEnabled
                  ? 'Mobile number'
                  : 'Email'
            }
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            error={errors.identifier?.[0] ?? errors.phone?.[0]}
          />
          {errorBox}
          <button
            type="submit"
            className="auth-cta"
            disabled={busy || (!config.otpEnabled && !config.emailResetEnabled)}
          >
            {busy ? (
              'Sending…'
            ) : (
              <>
                Send code
                <span className="auth-cta-arrow" aria-hidden>
                  <ArrowRight size={14} />
                </span>
              </>
            )}
          </button>
        </form>
      )}
      {stage === 'email-sent' && (
        <p role="status" className="mt-6 rounded-xl bg-success-50 p-5 text-ink-soft">
          If an account exists for <strong>{identifier}</strong>, a reset link is on its way. It
          expires in 30 minutes.
        </p>
      )}
      {stage === 'code' && (
        <form onSubmit={onReset} className="mt-2 space-y-6" noValidate>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            If this number has an account, we have sent a 6-digit code to it. Enter it and choose a
            new password.
          </p>
          <div>
            <p className="field-label">Code</p>
            <OtpInput value={code} onChange={setCode} error={errors.code?.[0]} />
            {devCode && (
              <p className="mt-2 rounded bg-warn-50 px-2 py-1 text-xs text-warn">
                Development mode — code: <strong>{devCode}</strong>
              </p>
            )}
          </div>
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={errors.password?.[0]}
            meter
          />
          {errorBox}
          <button type="submit" className="auth-cta" disabled={busy || code.length < 6}>
            {busy ? 'Saving…' : 'Save and log in'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-[14.5px] text-ink-soft">
        Remembered it?{' '}
        <Link href="/login" className="auth-link">
          Log in
        </Link>
      </p>
    </div>
  );
}

/** Landing page for the emailed reset link. */
export function ResetWithTokenForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const token = params.get('token') ?? '';
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password: fd.get('password') },
      });
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setErrors(err.details ?? {});
        setFormError(err.message);
      }
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-[2.1rem] leading-tight">This link is incomplete</h1>
        <p className="mt-3 text-ink-soft">
          Open the link from your email again, or{' '}
          <Link href="/forgot-password" className="font-semibold text-brand underline">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">Choose a new password</h1>
      <div className="mt-6 space-y-6">
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.[0]}
          meter
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <button type="submit" className="auth-cta" disabled={busy}>
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </div>
    </form>
  );
}
