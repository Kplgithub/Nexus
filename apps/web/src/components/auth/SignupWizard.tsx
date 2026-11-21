'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { POST_PROPERTY_PATH } from '@/lib/site';
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLES,
  LISTING_ROLES,
  type AuthConfig,
  type SessionUser,
  type UserRole,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseIcon,
  CheckIcon,
  CraneIcon,
  HomeIcon,
  SearchIcon,
} from '../icons';
import {
  OtpInput,
  PasswordField,
  TextField,
  safeNext,
  useCountdown,
  type FieldErrors,
} from './fields';

const ROLE_ICONS: Record<UserRole, typeof HomeIcon> = {
  seeker: SearchIcon,
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
  // Someone who came to post a property needs an owner, agent or builder account.
  const roles: readonly UserRole[] =
    next.startsWith(POST_PROPERTY_PATH) || next.startsWith('/post-property')
      ? LISTING_ROLES
      : USER_ROLES;
  const initialRole = roles.find((r) => r === params.get('role'));
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

  const RoleIcon = role ? ROLE_ICONS[role] : HomeIcon;
  const arrow = (
    <span className="auth-cta-arrow" aria-hidden>
      <ArrowRight size={14} />
    </span>
  );
  // The same message is already shown under the field it belongs to.
  const errorBox = formError && !Object.values(errors).some((v) => v?.[0] === formError) && (
    <p role="alert" className="mt-5 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
      {formError}
    </p>
  );

  return (
    <div>
      <div className="mb-6 flex items-center">
        <ol className="flex items-center gap-1.5" aria-label="Sign-up progress">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={`grid size-7 place-items-center rounded-lg text-[13px] font-bold ${i < stepIndex ? 'bg-brand-900 text-white' : i === stepIndex ? 'bg-accent text-white' : 'bg-slate-100 text-ink-muted'}`}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {i < stepIndex ? <CheckIcon size={14} /> : i + 1}
                <span className="sr-only">{label}</span>
              </span>
              {i < steps.length - 1 && <span className="h-0.5 w-7 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>
        <span className="ml-auto text-[12.5px] font-bold tracking-wide text-ink-muted">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {step === 'role' && (
        <div>
          <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">
            Create your free account
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Pick the one that fits you best. Owners, agents and builders can post property.
          </p>
          <fieldset className="mt-6">
            <legend className="sr-only">I am</legend>
            <div className="space-y-2.5">
              {roles.map((r) => {
                const Icon = ROLE_ICONS[r];
                const selected = role === r;
                return (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] px-4 py-3.5 transition-colors ${selected ? 'border-brand-900 shadow-[inset_4px_0_0_var(--color-accent)]' : 'border-line hover:border-brand/50'}`}
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
                      className={`grid size-11 shrink-0 place-items-center rounded-full ${selected ? 'bg-brand-900 text-orange-300' : 'border-[1.5px] border-dashed border-blue-300 text-brand'}`}
                    >
                      <Icon size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-bold text-brand-900">
                        {USER_ROLE_LABELS[r]}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                        {USER_ROLE_DESCRIPTIONS[r]}
                      </span>
                    </span>
                    <span
                      className={`grid size-[22px] shrink-0 place-items-center rounded-md border-[1.5px] ${selected ? 'border-brand-900 bg-brand-900 text-white' : 'border-line'}`}
                      aria-hidden
                    >
                      {selected && <CheckIcon size={13} />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button
            type="button"
            className="auth-cta mt-6"
            disabled={!role}
            onClick={() => setStep('details')}
          >
            Continue
            {arrow}
          </button>
        </div>
      )}

      {step === 'details' && role && (
        <form onSubmit={onDetails} noValidate>
          <button type="button" onClick={() => setStep('role')} className="auth-back mb-3">
            <ArrowLeft size={16} />
            Change account type
          </button>
          <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">
            {role === 'seeker' || role === 'individual'
              ? 'A little about you'
              : role === 'agent'
                ? 'Agent details'
                : 'Builder details'}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink-soft">
            Signing up as
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-2 pr-2.5 text-[13.5px] font-bold text-brand">
              <RoleIcon size={15} />
              {USER_ROLE_LABELS[role]}
            </span>
          </p>

          <div className="mt-6 space-y-5">
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
              meter
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
                  className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-brand-900)]"
                />
                <span>
                  I agree to the{' '}
                  <Link
                    href="/terms-and-conditions"
                    target="_blank"
                    className="font-bold text-brand underline underline-offset-2"
                  >
                    terms
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    className="font-bold text-brand underline underline-offset-2"
                  >
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && <p className="field-error">{errors.acceptTerms[0]}</p>}
            </div>
          </div>

          {errorBox}
          <button type="submit" className="auth-cta mt-6" disabled={busy}>
            {busy ? (
              'Creating account…'
            ) : (
              <>
                Create account
                {arrow}
              </>
            )}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={onVerify} noValidate>
          <h1 className="text-[2.1rem] leading-tight lg:text-[2.375rem]">Verify your mobile</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            We sent a 6-digit code by SMS. A verified number lets you see owners’ contact details
            and post faster.
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
                onClick={() => void resend()}
                disabled={timer.left > 0}
                className="font-bold text-brand disabled:text-ink-muted"
              >
                {timer.left > 0
                  ? `Resend in 0:${String(timer.left).padStart(2, '0')}`
                  : 'Resend code'}
              </button>
            </p>
          </div>
          {errorBox}
          <button type="submit" className="auth-cta mt-6" disabled={busy || code.length < 6}>
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            type="button"
            onClick={() => void finish()}
            className="mt-2 w-full py-2.5 text-[14.5px] font-bold text-ink-muted hover:text-brand"
          >
            Skip for now
          </button>
        </form>
      )}

      {step !== 'verify' && (
        <p className="mt-6 text-center text-[14.5px] text-ink-soft">
          Already have an account?{' '}
          <Link
            href={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="auth-link"
          >
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
