'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {
  USER_ROLE_LABELS,
  canListProperty,
  isBusinessRole,
  type UserDashboard,
} from '@nexus/shared';
import { useApi } from '../admin/useApi';
import { BecomeOwner } from './BecomeOwner';
import { useSession } from '../session/SessionProvider';
import {
  BadgeCheckIcon,
  BoltIcon,
  CraneIcon,
  CrownIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  LogoutIcon,
  ReceiptIcon,
  SendIcon,
  SettingsIcon,
} from '../icons';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof GridIcon;
  /** Builders only. */
  builderOnly?: boolean;
  /** Owners, agents and builders only: hidden from buyer/tenant accounts. */
  listerOnly?: boolean;
  /** Short label for the phone menu. */
  short?: string;
  badge?: 'listings' | 'leads';
};

type NavGroup = { title: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: null,
    items: [
      { href: '/dashboard', label: 'Overview', Icon: GridIcon },
      {
        href: '/dashboard/listings',
        label: 'My listings',
        Icon: HomeIcon,
        listerOnly: true,
        badge: 'listings',
      },
      { href: '/dashboard/projects', label: 'My projects', Icon: CraneIcon, builderOnly: true },
      {
        href: '/dashboard/leads',
        label: 'Leads',
        Icon: InboxIcon,
        listerOnly: true,
        badge: 'leads',
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        href: '/dashboard/plans',
        label: 'Plan & usage',
        short: 'Membership',
        Icon: CrownIcon,
        listerOnly: true,
      },
      {
        href: '/dashboard/feature',
        label: 'Feature a listing',
        short: 'Feature',
        Icon: BoltIcon,
        listerOnly: true,
      },
      { href: '/dashboard/payments', label: 'Payments', Icon: ReceiptIcon, listerOnly: true },
    ],
  },
  {
    title: 'My activity',
    items: [
      { href: '/dashboard/saved', label: 'Saved', Icon: HeartIcon },
      { href: '/dashboard/enquiries', label: 'My enquiries', Icon: SendIcon },
    ],
  },
  {
    title: 'Account',
    items: [{ href: '/dashboard/profile', label: 'Profile & security', Icon: SettingsIcon }],
  },
];

/** Pages a buyer/tenant account cannot use. */
const LISTER_PATHS = [
  '/dashboard/listings',
  '/dashboard/projects',
  '/dashboard/leads',
  '/dashboard/plans',
  '/dashboard/feature',
  '/dashboard/payments',
];

/** The posting wizard (new listing or edit). */
const FOCUS_PATH = /^\/dashboard\/listings\/[^/]+$/;

type DashCtx = { data?: UserDashboard; error?: string; reload: () => void };
const DashboardDataContext = createContext<DashCtx>({ reload: () => undefined });

/** The poster's dashboard numbers, loaded once by the shell (owners, agents and builders only). */
export function useDashboardData() {
  return useContext(DashboardDataContext);
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading, requireLogin, logout } = useSession();
  const lister = !!user && canListProperty(user.role);
  const dash = useApi<UserDashboard>(lister ? '/me/dashboard' : null);
  const reloadDash = dash.reload;
  const ctx = useMemo<DashCtx>(
    () => ({ data: dash.data, error: dash.error, reload: reloadDash }),
    [dash.data, dash.error, reloadDash],
  );

  useEffect(() => {
    if (!loading && !user) requireLogin();
  }, [loading, user, requireLogin]);

  // Keep the current page's pill in view in the phone menu.
  const pills = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = pills.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const ul = pills.current;
    if (el && ul) ul.scrollLeft = el.offsetLeft - (ul.clientWidth - el.clientWidth) / 2;
  }, [path, user]);

  if (loading || !user) {
    return (
      <div className="bg-[#f4f6fb]">
        <div className="container-page grid gap-6 py-8 lg:grid-cols-[16rem_1fr]" aria-busy="true">
          <div className="skeleton hidden h-96 rounded-2xl lg:block" />
          <div>
            <div className="skeleton h-44 rounded-3xl" />
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const active = (href: string) =>
    href === '/dashboard' ? path === '/dashboard' : path.startsWith(href);
  const display = isBusinessRole(user.role) ? user.companyName || user.name : user.name;
  const blocked = !lister && LISTER_PATHS.some((p) => path.startsWith(p));
  const show = (n: NavItem) =>
    (!n.builderOnly || user.role === 'builder') && (!n.listerOnly || lister);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(show) })).filter(
    (g) => g.items.length > 0,
  );
  const badge = (b: NavItem['badge']) => {
    const d = dash.data;
    if (!d || !b) return null;
    if (b === 'listings')
      return d.listings.total > 0 ? { text: String(d.listings.total), hot: false } : null;
    return d.leads.unseen > 0 ? { text: `${d.leads.unseen} new`, hot: true } : null;
  };

  // Posting or editing a listing gets the full width, without the dashboard menu.
  if (FOCUS_PATH.test(path) && !blocked) {
    return (
      <DashboardDataContext.Provider value={ctx}>
        <div className="min-h-[70vh] bg-[#f4f6fb]">
          <div className="container-page pb-12 pt-6 lg:pt-8">{children}</div>
        </div>
      </DashboardDataContext.Provider>
    );
  }

  return (
    <DashboardDataContext.Provider value={ctx}>
      <div className="min-h-[70vh] bg-[#f4f6fb]">
        {/* Phone and tablet: one scrolling row of menu pills. */}
        <nav
          aria-label="Dashboard"
          className="sticky top-[72px] z-20 border-b border-line bg-white lg:hidden"
        >
          <ul
            ref={pills}
            className="container-page relative flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]"
          >
            {groups
              .flatMap((g) => g.items)
              .map((n) => {
                const b = badge(n.badge);
                return (
                  <li key={n.href} className="shrink-0">
                    <Link
                      href={n.href}
                      aria-current={active(n.href) ? 'page' : undefined}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold ${
                        active(n.href) ? 'bg-brand text-white' : 'bg-[#f4f6fb] text-ink-soft'
                      }`}
                    >
                      {n.short ?? n.label}
                      {b?.hot && (
                        <span
                          className={`rounded-full px-1.5 text-[11px] ${active(n.href) ? 'bg-white/20' : 'bg-accent text-brand-900'}`}
                        >
                          {b.text.replace(' new', '')}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        <div className="container-page grid gap-6 pb-12 pt-5 lg:grid-cols-[16rem_1fr] lg:pt-7">
          <aside className="hidden self-start rounded-2xl border border-[#e6eaf2] bg-white px-3 py-4 lg:sticky lg:top-24 lg:block">
            <div className="flex items-center gap-3 border-b border-[#eef1f6] px-2 pb-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-brand to-brand-900 text-sm font-extrabold text-white">
                {initialsOf(display)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-bold">{display}</p>
                {user.verified ? (
                  <p className="flex items-center gap-1 text-xs font-bold text-brand">
                    <BadgeCheckIcon size={13} /> Verified{' '}
                    {USER_ROLE_LABELS[user.role].toLowerCase()}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">{USER_ROLE_LABELS[user.role]} account</p>
                )}
              </div>
            </div>
            <nav aria-label="Dashboard menu">
              {groups.map((g) => (
                <div key={g.title ?? 'main'}>
                  {g.title ? (
                    <p className="mx-2.5 mb-1.5 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink-muted/80">
                      {g.title}
                    </p>
                  ) : (
                    <div className="h-2.5" />
                  )}
                  <ul>
                    {g.items.map(({ href, label, Icon, badge: bk }) => {
                      const b = badge(bk);
                      const on = active(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            aria-current={on ? 'page' : undefined}
                            className={`my-px flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-semibold transition-colors ${
                              on ? 'bg-brand-50 text-brand' : 'text-ink-soft hover:bg-[#f4f6fb]'
                            }`}
                          >
                            <Icon size={18} />
                            <span className="flex-1">{label}</span>
                            {b && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${b.hot ? 'bg-accent text-brand-900' : 'bg-[#eef1f6] text-ink-soft'}`}
                              >
                                {b.text}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-[11px] border-t border-[#eef1f6] px-3 pb-1 pt-3.5 text-sm font-semibold text-danger hover:bg-danger-50"
            >
              <LogoutIcon size={18} /> Log out
            </button>
          </aside>
          <main className="min-w-0">{blocked ? <BecomeOwner /> : children}</main>
        </div>
      </div>
    </DashboardDataContext.Provider>
  );
}

export function SectionTitle({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[1.6rem] leading-tight">{title}</h2>
        {text && <p className="mt-1 text-sm text-ink-muted">{text}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-surface text-ink-soft ring-1 ring-line',
  pending: 'bg-accent-50 text-accent-700',
  published: 'bg-success-50 text-success',
  rejected: 'bg-danger-50 text-danger',
  rented: 'bg-brand-50 text-brand-800',
  sold: 'bg-brand-50 text-brand-800',
  inactive: 'bg-warn-50 text-warn',
  archived: 'bg-surface text-ink-muted',
};

export function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status] ?? 'bg-surface'}`}
    >
      {label}
    </span>
  );
}
