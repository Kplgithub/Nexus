'use client';

import { useState } from 'react';
import {
  SITE_SECTIONS,
  SITE_SECTION_INFO,
  type SectionOffAction,
  type SiteSection,
  type SiteSettings,
} from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { errMsg, useApi } from './useApi';
import { Modal } from './Modal';
import {
  BuildingIcon,
  CalculatorIcon,
  CraneIcon,
  HomeIcon,
  KeyIcon,
  PlotIcon,
  BedDoubleIcon,
} from '../icons';

const ICONS: Record<SiteSection | 'homeLoan', React.ComponentType<{ size?: number }>> = {
  buy: HomeIcon,
  rent: KeyIcon,
  projects: CraneIcon,
  pg: BedDoubleIcon,
  plot: PlotIcon,
  commercial: BuildingIcon,
  homeLoan: CalculatorIcon,
};

type Live = Pick<SiteSettings, 'sections' | 'sectionOffAction' | 'homeLoan'>;
type Pending = { key: SiteSection; label: string };

/**
 * Admin → Settings → Site sections: one switch per part of the public site. Each switch
 * saves at once. Off hides the section's menus, homepage blocks, search tabs, filters,
 * sitemap entries and pages, and its listings (hidden, never deleted). Buy and Rent hide
 * most of the site, so switching them off asks the admin to type the name first.
 */
export function SiteSectionsPanel({
  live,
  disabled,
  onSaved,
  toast,
}: {
  live: Live;
  disabled: boolean;
  onSaved: (s: SiteSettings) => void;
  toast: (msg: string, kind?: 'error') => void;
}) {
  const counts = useApi<Record<SiteSection, number>>('/admin/settings/section-counts');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);

  async function save(body: Partial<SiteSettings>, key: string, done: string) {
    setBusy(key);
    try {
      const { data } = await apiFetch<SiteSettings>('/admin/settings', { method: 'PATCH', body });
      onSaved(data);
      toast(done);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  const flip = (key: SiteSection, next: boolean, action?: SectionOffAction) => {
    const label = SITE_SECTION_INFO[key].label;
    void save(
      {
        sections: { [key]: next } as SiteSettings['sections'],
        ...(action ? { sectionOffAction: action } : {}),
      },
      key,
      next
        ? `${label} is on, live on the website.`
        : `${label} is off and hidden from the website.`,
    );
  };

  const count = (key: SiteSection) => {
    const n = counts.data?.[key];
    if (n === undefined) return null;
    const noun =
      key === 'projects' ? (n === 1 ? 'project' : 'projects') : n === 1 ? 'listing' : 'listings';
    return live.sections[key] ? `${n} live ${noun}` : `${n} ${noun} hidden`;
  };

  return (
    <section id="site-sections" className="card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 p-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold">Site sections</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Turn a part of the website on or off with one click. Off removes it from menus, the
            footer, the homepage, search, filters, the sitemap and its own pages. Listings are only
            hidden, never deleted, and come back when you turn the section on.
          </p>
        </div>
        <span className="text-xs text-ink-muted">Changes go live at once</span>
      </div>

      <ul>
        {SITE_SECTIONS.map((key) => (
          <SwitchRow
            key={key}
            id={key}
            label={SITE_SECTION_INFO[key].label}
            where={SITE_SECTION_INFO[key].where}
            extra={count(key)}
            on={live.sections[key]}
            busy={busy === key}
            disabled={disabled || busy !== null}
            onChange={(next) => {
              if (!next && SITE_SECTION_INFO[key].big) {
                setConfirm({ key, label: SITE_SECTION_INFO[key].label });
                return;
              }
              flip(key, next);
            }}
          />
        ))}
      </ul>

      <div className="border-t border-line bg-surface/60 px-5 py-4">
        <p className="text-sm font-semibold">Services</p>
      </div>
      <ul>
        <SwitchRow
          id="homeLoan"
          label="Home loan"
          where="/home-loan page, menu links, loan button on property pages"
          extra={live.homeLoan.enabled ? null : 'Rates and leads are kept'}
          on={live.homeLoan.enabled}
          busy={busy === 'homeLoan'}
          disabled={disabled || busy !== null}
          onChange={(next) =>
            void save(
              { homeLoan: { enabled: next } as SiteSettings['homeLoan'] },
              'homeLoan',
              next ? 'Home loan is on, live on the website.' : 'Home loan is off and hidden.',
            )
          }
        />
      </ul>

      <fieldset className="border-t border-line p-5">
        <legend className="sr-only">When a section is off</legend>
        <p className="text-sm font-semibold">When someone opens a page of an off section</p>
        <OffAction
          value={live.sectionOffAction}
          disabled={disabled || busy !== null}
          onChange={(v) =>
            void save({ sectionOffAction: v }, 'action', 'Saved. Off sections now use this.')
          }
        />
      </fieldset>

      {confirm && (
        <BigSwitchOff
          pending={confirm}
          count={counts.data?.[confirm.key]}
          action={live.sectionOffAction}
          onClose={() => setConfirm(null)}
          onConfirm={(action) => {
            flip(confirm.key, false, action);
            setConfirm(null);
          }}
        />
      )}
    </section>
  );
}

function SwitchRow({
  id,
  label,
  where,
  extra,
  on,
  busy,
  disabled,
  onChange,
}: {
  id: SiteSection | 'homeLoan';
  label: string;
  where: string;
  extra: string | null;
  on: boolean;
  busy: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const Icon = ICONS[id];
  return (
    <li className="flex items-center gap-3 border-t border-line/70 px-5 py-3.5 sm:gap-4">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? 'bg-brand-50 text-brand' : 'bg-surface text-ink-muted'}`}
      >
        <Icon size={20} />
      </span>
      <label htmlFor={`sec-${id}`} className="min-w-0 flex-1 cursor-pointer">
        <span className={`block font-semibold ${on ? '' : 'text-ink-muted'}`}>{label}</span>
        <span className="block text-xs leading-relaxed text-ink-muted sm:text-[0.8125rem]">
          {where}
          {extra && <> · {extra}</>}
        </span>
      </label>
      <span
        className={`hidden whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${on ? 'bg-success-50 text-success' : 'bg-surface text-ink-muted'}`}
      >
        {busy ? 'Saving…' : on ? 'On, live' : 'Off, hidden'}
      </span>
      <span className="relative inline-flex">
        <input
          id={`sec-${id}`}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={on}
          disabled={disabled}
          aria-describedby={`sec-${id}-state`}
          onChange={(ev) => onChange(ev.target.checked)}
        />
        <span id={`sec-${id}-state`} className="sr-only">
          {on ? 'On' : 'Off'}
        </span>
        <span
          aria-hidden
          onClick={() => !disabled && onChange(!on)}
          className={`relative h-7 w-12 cursor-pointer rounded-full transition ${on ? 'bg-success' : 'bg-line-strong'} peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-disabled:cursor-not-allowed peer-disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
          />
        </span>
      </span>
    </li>
  );
}

function OffAction({
  value,
  disabled,
  onChange,
}: {
  value: SectionOffAction;
  disabled?: boolean;
  onChange: (v: SectionOffAction) => void;
}) {
  const options: [SectionOffAction, string, string][] = [
    ['redirect', 'Send them to the nearest open page', 'Better for Google. Recommended.'],
    ['not-found', 'Show "page not found" (404)', 'Google drops these pages over time.'],
  ];
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {options.map(([v, title, hint]) => (
        <label
          key={v}
          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm ${value === v ? 'border-brand bg-brand-50' : 'border-line'}`}
        >
          <input
            type="radio"
            name="section-off-action"
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
            checked={value === v}
            disabled={disabled}
            onChange={() => onChange(v)}
          />
          <span>
            <span className="block font-medium">{title}</span>
            <span className="block text-xs text-ink-muted">{hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** Buy and Rent hide most of the site: the admin types the name to confirm. */
function BigSwitchOff({
  pending,
  count,
  action: initialAction,
  onClose,
  onConfirm,
}: {
  pending: Pending;
  count?: number;
  action: SectionOffAction;
  onClose: () => void;
  onConfirm: (action: SectionOffAction) => void;
}) {
  const word = pending.label.toUpperCase();
  const [typed, setTyped] = useState('');
  const [action, setAction] = useState(initialAction);
  const root = pending.key === 'buy' ? '/buy' : '/rent';
  return (
    <Modal title={`Turn off ${pending.label}?`} onClose={onClose}>
      <p className="text-sm text-ink-soft">This hides a big part of the website:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        <li>
          {count !== undefined ? `${count} ` : ''}
          {pending.key === 'rent' ? 'rent listings (PG too)' : 'listings for sale (plots too)'} are
          hidden, not deleted
        </li>
        <li>The {pending.label} menu, homepage tab and footer links go away</li>
        <li>
          {root} pages{' '}
          {action === 'redirect' ? 'send visitors to the homepage' : 'show page not found'}
        </li>
      </ul>
      <div className="mt-4">
        <OffAction value={action} onChange={setAction} />
      </div>
      <label htmlFor="confirm-word" className="field-label mt-4">
        Type <strong>{word}</strong> to confirm
      </label>
      <input
        id="confirm-word"
        className="field"
        autoComplete="off"
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn bg-danger text-white hover:bg-danger/90 disabled:opacity-50"
          disabled={typed.trim().toUpperCase() !== word}
          onClick={() => onConfirm(action)}
        >
          Yes, turn off
        </button>
      </div>
    </Modal>
  );
}
