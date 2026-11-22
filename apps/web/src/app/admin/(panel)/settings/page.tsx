'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DEFAULT_FARMS,
  DEFAULT_HOME_LOAN,
  DEFAULT_SITE_SECTIONS,
  LOAN_RATES_STALE_DAYS,
  type FarmSettings,
  type SiteSettings,
} from '@nexus/shared';
import { PageTitle, useAdmin } from '@/components/admin/AdminShell';
import { BannerEditor } from '@/components/admin/BannerEditor';
import { SiteSectionsPanel } from '@/components/admin/SiteSectionsPanel';
import { errMsg, useApi } from '@/components/admin/useApi';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { loanRatesStale } from '@/lib/site';

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
  const [s, setS] = useState<SiteSettings>({
    ...initial,
    home: { ...initial.home, banners: initial.home.banners ?? [] },
    homeLoan: { ...DEFAULT_HOME_LOAN, ...(initial.homeLoan ?? {}) },
    farms: { ...DEFAULT_FARMS, ...(initial.farms ?? {}) },
  });
  // What is saved on the server right now; the site section switches save on their own.
  const [live, setLive] = useState({
    sections: { ...DEFAULT_SITE_SECTIONS, ...(initial.sections ?? {}) },
    sectionOffAction: initial.sectionOffAction ?? 'redirect',
    homeLoan: { ...DEFAULT_HOME_LOAN, ...(initial.homeLoan ?? {}) },
  });
  const takeSaved = (data: SiteSettings) => {
    setLive({
      sections: data.sections,
      sectionOffAction: data.sectionOffAction,
      homeLoan: data.homeLoan,
    });
    setS((cur) => ({
      ...cur,
      sections: data.sections,
      sectionOffAction: data.sectionOffAction,
      homeLoan: { ...cur.homeLoan, enabled: data.homeLoan.enabled },
    }));
  };
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
          // The site section switches save themselves; never send a stale copy back.
          sections: undefined,
          sectionOffAction: undefined,
          home: { ...s.home, heroImageUrl: s.home.heroImageUrl ?? '' },
          email: s.email ?? '',
          enquiryNotificationEmail: s.enquiryNotificationEmail ?? '',
        },
      });
      setS(data);
      setLive({
        sections: data.sections,
        sectionOffAction: data.sectionOffAction,
        homeLoan: data.homeLoan,
      });
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
      <SiteSectionsPanel live={live} disabled={disabled} onSaved={takeSaved} toast={toast} />
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
          'Hero image URL (optional — upload via a property or Cloudinary)',
          s.home.heroImageUrl ?? '',
          (v) => setS({ ...s, home: { ...s.home, heroImageUrl: v } }),
          { type: 'url' },
        )}
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

      <BannerEditor
        banners={s.home.banners}
        disabled={disabled}
        toast={toast}
        onChange={(banners) => setS({ ...s, home: { ...s.home, banners } })}
      />
      {e('home.banners')}

      <HomeLoanSettings
        value={s.homeLoan}
        disabled={disabled}
        onChange={(homeLoan) => setS({ ...s, homeLoan })}
        error={errors['homeLoan.lenders']?.[0] ?? errors['homeLoan']?.[0]}
      />

      <FarmSettingsCard
        value={s.farms}
        disabled={disabled}
        onChange={(farms) => setS({ ...s, farms })}
      />

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

/** An on/off switch styled like the home loan one. */
function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer sr-only"
        disabled={disabled}
        checked={checked}
        onChange={(ev) => onChange(ev.target.checked)}
      />
      <span
        aria-hidden
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-success' : 'bg-line-strong'} peer-focus-visible:ring-2 peer-focus-visible:ring-brand`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </span>
  );
}

const FARM_PLACES: { key: Exclude<keyof FarmSettings, 'enabled'>; title: string; text: string }[] =
  [
    {
      key: 'homepage',
      title: 'Homepage',
      text: 'Farms tab in the search box, Farmhouses and Farm land tiles',
    },
    {
      key: 'menu',
      title: 'Menu and footer',
      text: 'Buy menu links, the mobile menu and the “Farms in Jaipur” footer link',
    },
    {
      key: 'popularSearches',
      title: 'Popular searches',
      text: 'Farm links in the homepage quick links',
    },
    {
      key: 'filters',
      title: 'Search filters',
      text: 'Farm types, bigha / acre land area, land use and water filters',
    },
    {
      key: 'postProperty',
      title: 'Post Property',
      text: 'Owners, agents and builders can pick Farmhouse or Farm Land',
    },
    {
      key: 'listings',
      title: 'Farm listings on the website',
      text: 'Farm listing pages, search results and sitemap. Off hides them, nothing is deleted.',
    },
  ];

function FarmSettingsCard({
  value,
  disabled,
  onChange,
}: {
  value: FarmSettings;
  disabled: boolean;
  onChange: (v: FarmSettings) => void;
}) {
  const set = (patch: Partial<FarmSettings>) => onChange({ ...value, ...patch });
  return (
    <section id="farms" className="card scroll-mt-24 space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Farm properties</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            One main switch for Farmhouse and Farm Land. Off hides every farm place on the website.
            Farm listings already posted stay safe and come back when you switch it on.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3">
          <span className="text-sm font-semibold">
            {value.enabled ? 'On, live on the website' : 'Off, hidden from the website'}
          </span>
          <Switch
            checked={value.enabled}
            disabled={disabled}
            onChange={(enabled) => set({ enabled })}
            label="Farm properties on the website"
          />
        </label>
      </div>
      <ul className={`divide-y divide-line ${value.enabled ? '' : 'opacity-50'}`}>
        {FARM_PLACES.map((p) => (
          <li key={p.key}>
            <label className="flex cursor-pointer items-center gap-4 py-3">
              <span className="flex-1">
                <span className="block font-medium">{p.title}</span>
                <span className="block text-sm text-ink-muted">{p.text}</span>
              </span>
              <Switch
                checked={value[p.key]}
                disabled={disabled || !value.enabled}
                onChange={(v) => set({ [p.key]: v })}
                label={p.title}
              />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

type HomeLoan = SiteSettings['homeLoan'];

function HomeLoanSettings({
  value,
  disabled,
  onChange,
  error,
}: {
  value: HomeLoan;
  disabled: boolean;
  onChange: (v: HomeLoan) => void;
  error?: string;
}) {
  const set = (patch: Partial<HomeLoan>) => onChange({ ...value, ...patch });
  const setLender = (i: number, patch: Partial<HomeLoan['lenders'][number]>) =>
    set({ lenders: value.lenders.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const checked = value.ratesCheckedAt ? new Date(value.ratesCheckedAt) : null;
  const stale =
    value.lenders.length > 0 && loanRatesStale(value.ratesCheckedAt, LOAN_RATES_STALE_DAYS);

  return (
    <section id="home-loan" className="card scroll-mt-24 space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Home loan</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            One switch for the whole home loan feature: the /home-loan page, its links in the menu,
            footer and sitemap, and the loan button on property and project pages. Off hides all of
            it. Leads already received stay in Enquiries.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3">
          <span className="text-sm font-semibold">
            {value.enabled ? 'On, live on the website' : 'Off, hidden from the website'}
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            disabled={disabled}
            checked={value.enabled}
            onChange={(ev) => set({ enabled: ev.target.checked })}
          />
          <span
            aria-hidden
            className={`relative h-7 w-12 rounded-full transition ${value.enabled ? 'bg-success' : 'bg-line-strong'} peer-focus-visible:ring-2 peer-focus-visible:ring-brand`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${value.enabled ? 'left-6' : 'left-1'}`}
            />
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
        <div>
          <label htmlFor="hl-rate" className="field-label">
            Calculator starting rate (%)
          </label>
          <input
            id="hl-rate"
            type="number"
            step="0.05"
            min={1}
            max={30}
            className="field"
            disabled={disabled}
            value={value.exampleRate}
            onChange={(ev) => set({ exampleRate: Number(ev.target.value) })}
          />
        </div>
        <div
          className={`self-end rounded-xl p-3 text-sm ${stale ? 'bg-warn-50 text-warn' : 'bg-surface text-ink-soft'}`}
        >
          Rates last checked:{' '}
          <b>{checked ? checked.toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'never'}</b>
          {stale &&
            ` · more than ${LOAN_RATES_STALE_DAYS} days ago, please check the banks’ websites.`}
          {!disabled && (
            <button
              type="button"
              className="btn btn-outline btn-sm ml-3 bg-white"
              onClick={() => set({ ratesCheckedAt: new Date().toISOString() })}
            >
              I checked them today
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="field-label">Rates table on the website</p>
        <p className="mb-3 text-xs text-ink-muted">
          Type the starting rates from each lender’s own website. Names show as plain text, no
          logos. Only rows marked “Show” appear. The table is hidden while the list is empty.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="py-2 pr-2">Lender name</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Rate from %</th>
                <th className="py-2 pr-2">Max years</th>
                <th className="py-2 pr-2">Processing fee</th>
                <th className="py-2 pr-2">Show</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {value.lenders.map((l, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2">
                    <input
                      aria-label="Lender name"
                      className="field"
                      maxLength={80}
                      disabled={disabled}
                      value={l.name}
                      onChange={(ev) => setLender(i, { name: ev.target.value })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select
                      aria-label="Type"
                      className="field"
                      disabled={disabled}
                      value={l.kind}
                      onChange={(ev) => setLender(i, { kind: ev.target.value as 'bank' | 'hfc' })}
                    >
                      <option value="bank">Bank</option>
                      <option value="hfc">Housing finance</option>
                    </select>
                  </td>
                  <td className="w-28 py-1.5 pr-2">
                    <input
                      aria-label="Rate from"
                      type="number"
                      step="0.05"
                      className="field"
                      disabled={disabled}
                      value={l.rateFrom}
                      onChange={(ev) => setLender(i, { rateFrom: Number(ev.target.value) })}
                    />
                  </td>
                  <td className="w-24 py-1.5 pr-2">
                    <input
                      aria-label="Max years"
                      type="number"
                      className="field"
                      disabled={disabled}
                      value={l.maxTenureYears}
                      onChange={(ev) => setLender(i, { maxTenureYears: Number(ev.target.value) })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      aria-label="Processing fee"
                      className="field"
                      maxLength={60}
                      placeholder="0.35%"
                      disabled={disabled}
                      value={l.processingFee}
                      onChange={(ev) => setLender(i, { processingFee: ev.target.value })}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      aria-label="Show on website"
                      type="checkbox"
                      className="size-4 accent-[var(--color-brand)]"
                      disabled={disabled}
                      checked={l.active}
                      onChange={(ev) => setLender(i, { active: ev.target.checked })}
                    />
                  </td>
                  <td className="py-1.5">
                    {!disabled && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => set({ lenders: value.lenders.filter((_, j) => j !== i) })}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled && value.lenders.length < 20 && (
          <button
            type="button"
            className="btn btn-outline btn-sm mt-3"
            onClick={() =>
              set({
                lenders: [
                  ...value.lenders,
                  {
                    name: '',
                    kind: 'bank',
                    rateFrom: value.exampleRate,
                    maxTenureYears: 30,
                    processingFee: '',
                    active: true,
                  },
                ],
              })
            }
          >
            + Add lender
          </button>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
      <p className="text-xs text-ink-muted">Click “Save settings” below to apply changes.</p>
    </section>
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
