'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SiteSettings } from '@nexus/shared';
import { PageTitle, useAdmin } from '@/components/admin/AdminShell';
import { AiImageGenerator } from '@/components/admin/AiImageGenerator';
import { errMsg, useApi } from '@/components/admin/useApi';
import { ApiClientError, apiFetch } from '@/lib/client-api';

export default function SettingsPage() {
  const { data } = useApi<SiteSettings>('/admin/settings');
  return (
    <>
      <PageTitle title="Settings" />
      {data ? <SettingsForm initial={data} /> : <p className="text-ink-muted">Loading…</p>}
      <PasswordForm />
    </>
  );
}

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const { toast, can } = useAdmin();
  const [s, setS] = useState<SiteSettings>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const disabled = !can('admin');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { data } = await apiFetch<SiteSettings>('/admin/settings', {
        method: 'PATCH',
        body: {
          ...s,
          email: s.email ?? '',
          enquiryNotificationEmail: s.enquiryNotificationEmail ?? '',
        },
      });
      setS(data);
      toast('Settings saved. The public site updates within a minute.');
    } catch (err) {
      if (err instanceof ApiClientError && err.details) setErrors(err.details);
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const e = (k: string) => errors[k]?.[0] && <p className="field-error">{errors[k]![0]}</p>;
  const input = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="field"
        value={value}
        disabled={disabled}
        onChange={(ev) => onChange(ev.target.value)}
        {...extra}
      />
      {e(id)}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      {disabled && (
        <p className="rounded-lg bg-surface p-3 text-sm text-ink-muted">
          Only admins can change settings.
        </p>
      )}
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">Business details</h2>
        {input('businessName', 'Business name', s.businessName, (v) =>
          setS({ ...s, businessName: v }),
        )}
        {input('tagline', 'Tagline', s.tagline, (v) => setS({ ...s, tagline: v }))}
        {input('phone', 'Phone (international format)', s.phone, (v) => setS({ ...s, phone: v }), {
          placeholder: '+919521750202',
        })}
        {input('whatsapp', 'WhatsApp (international format)', s.whatsapp, (v) =>
          setS({ ...s, whatsapp: v }),
        )}
        {input('email', 'Public email (optional)', s.email ?? '', (v) => setS({ ...s, email: v }), {
          type: 'email',
        })}
        {input(
          'businessHours',
          'Business hours (optional)',
          s.businessHours,
          (v) => setS({ ...s, businessHours: v }),
          { placeholder: 'Mon–Sat, 10 am – 7 pm' },
        )}
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">Office address</h2>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand)]"
            disabled={disabled}
            checked={s.showAddress}
            onChange={(ev) => setS({ ...s, showAddress: ev.target.checked })}
          />
          Show the address publicly (footer, contact page and structured data)
        </label>
        {input('line1', 'Address line 1', s.address.line1, (v) =>
          setS({ ...s, address: { ...s.address, line1: v } }),
        )}
        {input('line2', 'Address line 2', s.address.line2, (v) =>
          setS({ ...s, address: { ...s.address, line2: v } }),
        )}
        {input('city', 'City', s.address.city, (v) =>
          setS({ ...s, address: { ...s.address, city: v } }),
        )}
        {input('state', 'State', s.address.state, (v) =>
          setS({ ...s, address: { ...s.address, state: v } }),
        )}
        {input(
          'pincode',
          'Pincode',
          s.address.pincode,
          (v) => setS({ ...s, address: { ...s.address, pincode: v } }),
          { maxLength: 6, inputMode: 'numeric' },
        )}
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">Social links (optional, https only)</h2>
        {(['facebook', 'instagram', 'linkedin', 'youtube', 'x'] as const).map((k) =>
          input(
            `social.${k}`,
            k === 'x' ? 'X (Twitter)' : k[0]!.toUpperCase() + k.slice(1),
            s.social[k] ?? '',
            (v) => setS({ ...s, social: { ...s.social, [k]: v } }),
            { type: 'url', placeholder: 'https://' },
          ),
        )}
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-lg font-semibold">Home page</h2>
        {input(
          'heroHeadline',
          'Hero headline',
          s.home.heroHeadline,
          (v) => setS({ ...s, home: { ...s.home, heroHeadline: v } }),
          { maxLength: 90 },
        )}
        <div>
          <label htmlFor="heroSub" className="field-label">
            Hero text
          </label>
          <textarea
            id="heroSub"
            className="field min-h-20"
            maxLength={220}
            disabled={disabled}
            value={s.home.heroSubheadline}
            onChange={(ev) => setS({ ...s, home: { ...s.home, heroSubheadline: ev.target.value } })}
          />
        </div>
        {input(
          'heroImageUrl',
          'Hero image URL (optional — paste a Cloudinary URL or generate one below)',
          s.home.heroImageUrl ?? '',
          (v) => setS({ ...s, home: { ...s.home, heroImageUrl: v } }),
          { type: 'url' },
        )}
        <AiImageGenerator
          kind="hero"
          useLabel="Use as hero image"
          onUse={(img) => setS({ ...s, home: { ...s.home, heroImageUrl: img.url } })}
        />
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              disabled={disabled}
              checked={s.home.showFeatured}
              onChange={(ev) =>
                setS({ ...s, home: { ...s.home, showFeatured: ev.target.checked } })
              }
            />{' '}
            Show featured properties
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              disabled={disabled}
              checked={s.home.showRecent}
              onChange={(ev) => setS({ ...s, home: { ...s.home, showRecent: ev.target.checked } })}
            />{' '}
            Show recently added
          </label>
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">Leads</h2>
        {input(
          'enquiryNotificationEmail',
          'Email new leads to (requires SMTP on the server)',
          s.enquiryNotificationEmail ?? '',
          (v) => setS({ ...s, enquiryNotificationEmail: v }),
          { type: 'email' },
        )}
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand)]"
            disabled={disabled}
            checked={s.allowInternationalEnquiries}
            onChange={(ev) => setS({ ...s, allowInternationalEnquiries: ev.target.checked })}
          />
          Accept international phone numbers
        </label>
      </section>

      {!disabled && (
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      )}
    </form>
  );
}

function PasswordForm() {
  const { toast } = useAdmin();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErrors({});
    try {
      await apiFetch('/admin/auth/change-password', {
        method: 'POST',
        body: { currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') },
      });
      form.reset();
      toast('Password changed. Other sessions have been signed out.');
    } catch (err) {
      if (err instanceof ApiClientError && err.details) setErrors(err.details);
      toast(errMsg(err), 'error');
    }
  }

  async function logoutAll() {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    await apiFetch('/admin/auth/logout-all', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
  }

  return (
    <section className="card mt-10 p-5">
      <h2 className="text-lg font-semibold">Your account</h2>
      <form
        onSubmit={onSubmit}
        className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <div>
          <label htmlFor="cp-current" className="field-label">
            Current password
          </label>
          <input
            id="cp-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="field"
          />
          {errors.currentPassword && <p className="field-error">{errors.currentPassword[0]}</p>}
        </div>
        <div>
          <label htmlFor="cp-new" className="field-label">
            New password
          </label>
          <input
            id="cp-new"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="field"
          />
          {errors.newPassword ? (
            <p className="field-error">{errors.newPassword[0]}</p>
          ) : (
            <p className="field-hint">
              12+ characters with upper- and lower-case letters and a number.
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          Change password
        </button>
      </form>
      <button type="button" className="btn btn-outline mt-6" onClick={logoutAll}>
        Sign out everywhere
      </button>
    </section>
  );
}
