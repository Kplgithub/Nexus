'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLES,
  type AuthConfig,
  type SessionUser,
  type UserRole,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { BriefcaseIcon, CheckIcon, CraneIcon, HomeIcon } from '../icons';
import {
  OtpInput,
  PasswordField,
  TextField,
  safeNext,
  useCountdown,
  type FieldErrors,
} from './fields';

const ROLE_ICONS: Record<UserRole, typeof HomeIcon> = {
  individual: HomeIcon,
  agent: BriefcaseIcon,
  builder: CraneIcon,
};

type City = { slug: string; name: string };

/**
 * Three steps: choose account type → details → verify mobile (when SMS is set up).
 * The account type decides which fields are asked and what the dashboard offers.
 */
export function SignupWizard({ config, cities }: { config: AuthConfig; cities: City[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const next = safeNext(params.get('next'));
  const initialRole = USER_ROLES.find((r) => r === params.get('role'));
  const [role, setRole] = useState<UserRole | null>(initialRole ?? null);
  const [step, setStep] = useState<'role' | 'details' | 'verify'>(initialRole ? 'details' : 'role');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const timer = useCountdown(30);

  const steps = config.otpEnabled
    ? ['Account type', 'Your details', 'Verify mobile']
    : ['Account type', 'Your details'];
  const stepIndex = step === 'role' ? 0 : step === 'details' ? 1 : 2;

  async function finish() {
    await refresh();
    router.replace(next);
    router.refresh();
  }

  async function onDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? '').trim();
    setErrors({});
    setFormError(null);
    if (!fd.get('acceptTerms')) {
      setErrors({ acceptTerms: ['Please accept the terms to continue'] });
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiFetch<{
        user: SessionUser;
        verification: { sent: boolean; devCode?: string };
      }>('/auth/signup', {
        method: 'POST',
        body: {
          role,
          name: s('name'),
          email: s('email'),
          phone: s('phone'),
          password: String(fd.get('password') ?? ''),
          companyName: s('companyName') || undefined,
          reraNumber: s('reraNumber') || undefined,
          citySlug: s('citySlug') || undefined,
          acceptTerms: true,
          website: s('website'),
        },
      });
      if (data.verification.sent) {
        setDevCode(data.verification.devCode);
        timer.start();
        setStep('verify');
        setBusy(false);
      } else {
        await finish();
      }
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setErrors(err.details ?? {});
        setFormError(err.details ? 'Please check the highlighted fields.' : err.message);
      } else setFormError('Something went wrong. Please try again.');
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch('/me/verify-phone/confirm', { method: 'POST', body: { code } });
      await finish();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setErrors(err.details ?? {});
        setFormError(err.message);
      }
    }
  }

  async function resend() {
    try {
      const { data } = await apiFetch<{ devCode?: string }>('/me/verify-phone/request', {
        method: 'POST',
      });
      setDevCode(data.devCode);
      timer.start();
    } catch (err) {
      if (err instanceof ApiClientError) setFormError(err.message);
    }
  }

  const business = role === 'agent' || role === 'builder';

  return (
    <div>
      <ol
        className="mb-8 flex items-center gap-2 text-xs font-semibold text-ink-muted"
        aria-label="Sign-up progress"
      >
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid size-6 place-items-center rounded-full ${i < stepIndex ? 'bg-accent text-brand-900' : i === stepIndex ? 'bg-brand text-white' : 'bg-surface text-ink-muted'}`}
              aria-hidden
            >
              {i < stepIndex ? <CheckIcon size={13} /> : i + 1}
            </span>
            <span
              className={i === stepIndex ? 'text-ink' : ''}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === 'role' && (
        <div>
          <h1 className="text-[2.25rem] leading-tight">Create your account</h1>
          <p className="mt-2 text-ink-soft">
            Tell us who you are. You can post properties with any account type.
          </p>
          <fieldset className="mt-8">
            <legend className="sr-only">I am</legend>
            <div className="space-y-3">
              {USER_ROLES.map((r) => {
                const Icon = ROLE_ICONS[r];
                const selected = role === r;
                return (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors ${selected ? 'border-brand bg-brand-50' : 'border-line hover:border-brand/50'}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={selected}
                      onChange={() => setRole(r)}
                      className="sr-only"
                    />
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-xl ${selected ? 'bg-brand text-white' : 'bg-surface text-brand'}`}
                    >
                      <Icon size={24} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">{USER_ROLE_LABELS[r]}</span>
                      <span className="mt-0.5 block text-sm text-ink-soft">
                        {USER_ROLE_DESCRIPTIONS[r]}
                      </span>
                    </span>
                    <span
                      className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-brand bg-brand text-white' : 'border-line-strong'}`}
                      aria-hidden
                    >
                      {selected && <CheckIcon size={12} />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button
            type="button"
            className="btn btn-primary mt-8 h-12 w-full"
            disabled={!role}
            onClick={() => setStep('details')}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'details' && role && (
        <form onSubmit={onDetails} noValidate>
          <button
            type="button"
            onClick={() => setStep('role')}
            className="mb-4 text-sm font-semibold text-brand hover:underline"
          >
            Change account type
          </button>
          <h1 className="text-[2.25rem] leading-tight">
            {role === 'individual'
              ? 'Your details'
              : role === 'agent'
                ? 'Agent details'
                : 'Builder details'}
          </h1>
          <p className="mt-2 text-ink-soft">
            Signing up as <strong className="text-ink">{USER_ROLE_LABELS[role]}</strong>.
          </p>

          <div className="mt-8 space-y-5">
            {business && (
              <TextField
                id="companyName"
                label={role === 'agent' ? 'Agency name' : 'Company name'}
                autoComplete="organization"
                required
                error={errors.companyName?.[0]}
              />
            )}
            <TextField
              id="name"
              label={business ? 'Contact person' : 'Full name'}
              autoComplete="name"
              required
              error={errors.name?.[0]}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
                error={errors.email?.[0]}
              />
              <TextField
                id="phone"
                label="Mobile number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                required
                error={errors.phone?.[0]}
              />
            </div>
            <PasswordField
              id="password"
              label="Create password"
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              error={errors.password?.[0]}
            />
            {business && (
              <TextField
                id="reraNumber"
                label="RERA registration number (optional)"
                hint="Helps our team verify your account."
                error={errors.reraNumber?.[0]}
              />
            )}
            {cities.length > 1 && (
              <div>
                <label htmlFor="citySlug" className="field-label">
                  Your city
                </label>
                <select id="citySlug" name="citySlug" className="field" defaultValue="">
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {cities.length === 1 && <input type="hidden" name="citySlug" value={cities[0]!.slug} />}

            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  value="true"
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span>
                  I agree to the{' '}
                  <Link
                    href="/terms-and-conditions"
                    target="_blank"
                    className="text-brand underline"
                  >
                    terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" target="_blank" className="text-brand underline">
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && <p className="field-error">{errors.acceptTerms[0]}</p>}
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-5 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-6 h-12 w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={onVerify} noValidate>
          <h1 className="text-[2.25rem] leading-tight">Verify your mobile</h1>
          <p className="mt-2 text-ink-soft">
            We sent a 6-digit code by SMS. Verified numbers can view owners’ contact details and
            post faster.
          </p>
          <div className="mt-8">
            <OtpInput value={code} onChange={setCode} error={errors.code?.[0]} />
            {devCode && (
              <p className="mt-2 rounded bg-warn-50 px-2 py-1 text-xs text-warn">
                Development mode — code: <strong>{devCode}</strong>
              </p>
            )}
            <button
              type="button"
              onClick={() => void resend()}
              disabled={timer.left > 0}
              className="mt-3 text-sm font-semibold text-brand disabled:text-ink-muted"
            >
              {timer.left > 0 ? `Resend code in ${timer.left}s` : 'Resend code'}
            </button>
          </div>
          {formError && (
            <p role="alert" className="mt-5 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary mt-6 h-12 w-full"
            disabled={busy || code.length < 6}
          >
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button type="button" onClick={() => void finish()} className="btn btn-ghost mt-2 w-full">
            Skip for now
          </button>
        </form>
      )}

      {step !== 'verify' && (
        <p className="mt-8 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link
            href={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-semibold text-brand hover:underline"
          >
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
