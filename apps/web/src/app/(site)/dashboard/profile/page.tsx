'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatIndianPhone, type City, type SessionUser } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import {
  OtpInput,
  PasswordField,
  TextField,
  useCountdown,
  type FieldErrors,
} from '@/components/auth/fields';
import { SectionTitle } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/components/session/SessionProvider';
import { ApiClientError, apiFetch } from '@/lib/client-api';

type Note = { kind: 'ok' | 'error'; text: string } | null;

function Notice({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p
      role={note.kind === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${note.kind === 'error' ? 'bg-danger-50 text-danger' : 'bg-success-50 text-success'}`}
    >
      {note.text}
    </p>
  );
}

export default function ProfilePage() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <div className="space-y-12">
      <ProfileForm user={user} />
      <PhoneVerify user={user} />
      <PasswordForm />
      <SignOutEverywhere />
    </div>
  );
}

function ProfileForm({ user }: { user: SessionUser }) {
  const { setUser } = useSession();
  const { data: cities } = useApi<City[]>('/locations');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const business = user.role !== 'individual';
  const [citySlug, setCitySlug] = useState(user.citySlug ?? '');
  const [areas, setAreas] = useState<string[]>(user.localities ?? []);
  const city = cities?.find((c) => c.slug === citySlug);
  const profilePath =
    business && user.profileSlug
      ? `/${user.role === 'agent' ? 'agents' : 'builders'}/${user.profileSlug}`
      : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setNote(null);
    const body: Record<string, unknown> = {
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      citySlug: fd.get('citySlug') ?? '',
      about: fd.get('about') ?? '',
      showPhone: fd.get('showPhone') === 'on',
      whatsappEnabled: fd.get('whatsappEnabled') === 'on',
    };
    if (business) {
      body.companyName = fd.get('companyName');
      body.reraNumber = fd.get('reraNumber') ?? '';
      const years = String(fd.get('experienceYears') ?? '').trim();
      body.experienceYears = years ? Number(years) : null;
      body.website = String(fd.get('website') ?? '').trim();
      body.logoUrl = String(fd.get('logoUrl') ?? '').trim();
      body.localities = city ? areas.filter((a) => city.localities.some((l) => l.slug === a)) : [];
    }
    try {
      const { data } = await apiFetch<SessionUser>('/me', { method: 'PATCH', body });
      setUser(data);
      setNote({
        kind: 'ok',
        text:
          data.phone !== user.phone
            ? 'Saved. Please verify your new mobile number.'
            : 'Profile saved',
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.details ?? {});
        setNote({ kind: 'error', text: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <SectionTitle title="Profile" text="How you appear on your listings.">
        {profilePath && (
          <Link href={profilePath} className="btn btn-outline btn-sm">
            View public profile
          </Link>
        )}
      </SectionTitle>
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-5 rounded-2xl border border-line bg-white p-6 md:grid-cols-2"
      >
        <TextField
          id="name"
          label="Full name"
          defaultValue={user.name}
          required
          error={errors.name?.[0]}
        />
        {business && (
          <TextField
            id="companyName"
            label={user.role === 'agent' ? 'Agency name' : 'Company name'}
            defaultValue={user.companyName ?? ''}
            error={errors.companyName?.[0]}
          />
        )}
        <TextField
          id="email"
          label="Email"
          type="email"
          defaultValue={user.email}
          error={errors.email?.[0]}
        />
        <TextField
          id="phone"
          label="Mobile number"
          type="tel"
          defaultValue={user.phone}
          hint="Changing it requires verifying the new number."
          error={errors.phone?.[0]}
        />
        {business && (
          <TextField
            id="reraNumber"
            label="RERA registration number"
            defaultValue={user.reraNumber ?? ''}
            error={errors.reraNumber?.[0]}
          />
        )}
        <div>
          <label htmlFor="citySlug" className="field-label">
            City
          </label>
          <select
            id="citySlug"
            name="citySlug"
            className="field"
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
          >
            <option value="">Not set</option>
            {cities?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {business && (
          <>
            <TextField
              id="experienceYears"
              label="Years in real estate"
              inputMode="numeric"
              defaultValue={user.experienceYears === null ? '' : String(user.experienceYears)}
              error={errors.experienceYears?.[0]}
            />
            <TextField
              id="website"
              label="Website (optional)"
              type="url"
              defaultValue={user.website ?? ''}
              hint="Must start with https://"
              error={errors.website?.[0]}
            />
            <div className="md:col-span-2">
              <TextField
                id="logoUrl"
                label="Logo image link (optional)"
                type="url"
                defaultValue={user.logoUrl ?? ''}
                hint="An https:// link to a square logo. Shown on your public profile."
                error={errors.logoUrl?.[0]}
              />
            </div>
            {city && city.localities.length > 0 && (
              <fieldset className="md:col-span-2">
                <legend className="field-label">Localities you work in</legend>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {[...city.localities]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((l) => {
                      const on = areas.includes(l.slug);
                      return (
                        <button
                          key={l.slug}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setAreas((a) => (on ? a.filter((x) => x !== l.slug) : [...a, l.slug]))
                          }
                          className={`chip ${on ? 'chip-active' : ''}`}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                </div>
              </fieldset>
            )}
          </>
        )}
        {business && (
          <div className="md:col-span-2">
            <label htmlFor="about" className="field-label">
              About {user.role === 'agent' ? 'your agency' : 'your company'}
            </label>
            <textarea
              id="about"
              name="about"
              className="field min-h-24"
              maxLength={1000}
              defaultValue={user.about ?? ''}
            />
          </div>
        )}
        <fieldset className="space-y-2 md:col-span-2">
          <legend className="field-label">Contact preferences</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              name="showPhone"
              type="checkbox"
              defaultChecked={user.showPhone}
              className="mt-0.5 size-4 accent-[var(--color-brand)]"
            />
            Let signed-in visitors see my mobile number on my listings
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              name="whatsappEnabled"
              type="checkbox"
              defaultChecked={user.whatsappEnabled}
              className="mt-0.5 size-4 accent-[var(--color-brand)]"
            />
            I’m reachable on WhatsApp at this number
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <Notice note={note} />
        </div>
      </form>
    </section>
  );
}

function PhoneVerify({ user }: { user: SessionUser }) {
  const { setUser } = useSession();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown(30);

  async function send() {
    setBusy(true);
    setNote(null);
    try {
      const { data } = await apiFetch<{ devCode?: string; alreadyVerified?: true }>(
        '/me/verify-phone/request',
        {
          method: 'POST',
        },
      );
      setDevCode(data.devCode);
      setSent(true);
      timer.start();
    } catch (err) {
      setNote({
        kind: 'error',
        text: err instanceof ApiClientError ? err.message : 'Could not send the code',
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setNote(null);
    try {
      const { data } = await apiFetch<SessionUser>('/me/verify-phone/confirm', {
        method: 'POST',
        body: { code },
      });
      setUser(data);
      setNote({ kind: 'ok', text: 'Mobile number verified' });
    } catch (err) {
      setNote({
        kind: 'error',
        text: err instanceof ApiClientError ? err.message : 'Could not verify',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="phone" className="scroll-mt-24">
      <SectionTitle title="Mobile verification" />
      <div className="rounded-2xl border border-line bg-white p-6">
        {user.phoneVerified ? (
          <p className="text-sm">
            <span className="font-semibold text-success">Verified</span> —{' '}
            {formatIndianPhone(user.phone)}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Verify {formatIndianPhone(user.phone)} to submit listings and view owners’ numbers.
            </p>
            {sent && (
              <div>
                <p className="field-label">Enter the 6-digit code</p>
                <OtpInput value={code} onChange={setCode} />
                {devCode && (
                  <p className="mt-2 inline-block rounded bg-warn-50 px-2 py-1 text-xs text-warn">
                    Development mode — code: <strong>{devCode}</strong>
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {sent ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || code.length < 6}
                    onClick={() => void confirm()}
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy || timer.left > 0}
                    onClick={() => void send()}
                  >
                    {timer.left > 0 ? `Resend in ${timer.left}s` : 'Resend code'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void send()}
                >
                  Send code
                </button>
              )}
            </div>
          </div>
        )}
        <div className="mt-3">
          <Notice note={note} />
        </div>
      </div>
    </section>
  );
}

function PasswordForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setErrors({});
    setNote(null);
    try {
      await apiFetch('/me/change-password', {
        method: 'POST',
        body: { currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') },
      });
      form.reset();
      setNote({ kind: 'ok', text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.details ?? {});
        setNote({ kind: 'error', text: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <SectionTitle title="Password" />
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-5 rounded-2xl border border-line bg-white p-6 md:grid-cols-2"
      >
        <PasswordField
          id="currentPassword"
          label="Current password"
          error={errors.currentPassword?.[0]}
        />
        <PasswordField
          id="newPassword"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.[0]}
        />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button type="submit" className="btn btn-outline" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
          <Notice note={note} />
        </div>
      </form>
    </section>
  );
}

function SignOutEverywhere() {
  const { setUser } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <section>
      <SectionTitle title="Sessions" />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6">
        <p className="text-sm text-ink-soft">
          Lost a phone or used a shared computer? Sign out on every device.
        </p>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await apiFetch('/me/logout-all', { method: 'POST' }).catch(() => undefined);
            setUser(null);
            router.push('/login');
          }}
        >
          Sign out everywhere
        </button>
      </div>
    </section>
  );
}
