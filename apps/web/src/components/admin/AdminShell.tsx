'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ADMIN_PATH,
  adminHref,
  ADMIN_ROLE_LABELS,
  isSuperAdmin,
  type AdminBadges,
  type AdminNotification,
  type AdminUser,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { A, type AdminIconName } from './AdminIcons';

type Toast = { id: number; kind: 'success' | 'error'; text: string };
type Ctx = {
  admin: AdminUser;
  toast: (text: string, kind?: Toast['kind']) => void;
  can: (role: AdminUser['role']) => boolean;
  /** Super Admin (owner or admin). */
  isSuper: boolean;
  badges: AdminBadges | null;
  refreshBadges: () => void;
};

const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminShell');
  return c;
};

const rank = { editor: 1, admin: 2, owner: 3 } as const;

type NavItem = {
  href: string;
  label: string;
  icon: AdminIconName;
  badge?: (b: AdminBadges) => number;
  superOnly?: boolean;
};

const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ href: ADMIN_PATH, label: 'Dashboard', icon: 'home' }] },
  {
    group: 'Listings',
    items: [
      {
        href: `${ADMIN_PATH}/review`,
        label: 'Review queue',
        icon: 'review',
        badge: (b) => b.review + b.projects,
      },
      { href: `${ADMIN_PATH}/properties`, label: 'Properties', icon: 'building' },
      { href: `${ADMIN_PATH}/projects`, label: 'Projects', icon: 'crane' },
      { href: `${ADMIN_PATH}/featured`, label: 'Featured', icon: 'star' },
      { href: `${ADMIN_PATH}/reports`, label: 'Reports', icon: 'flag', badge: (b) => b.reports },
    ],
  },
  {
    group: 'Leads & people',
    items: [
      { href: `${ADMIN_PATH}/enquiries`, label: 'Enquiries', icon: 'inbox', badge: (b) => b.leads },
      { href: `${ADMIN_PATH}/visits`, label: 'Site visits', icon: 'calendar' },
      { href: `${ADMIN_PATH}/users`, label: 'Website users', icon: 'users' },
      { href: `${ADMIN_PATH}/user-journey`, label: 'User journey', icon: 'funnel' },
      {
        href: `${ADMIN_PATH}/verification`,
        label: 'Verification',
        icon: 'badge',
        badge: (b) => b.verification,
      },
      { href: `${ADMIN_PATH}/support`, label: 'Support', icon: 'chat', badge: (b) => b.support },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: `${ADMIN_PATH}/blog`, label: 'Blog', icon: 'pen' },
      { href: `${ADMIN_PATH}/locations`, label: 'Locations & SEO', icon: 'pin' },
      { href: `${ADMIN_PATH}/faqs`, label: 'FAQs', icon: 'help' },
      { href: `${ADMIN_PATH}/search-insights`, label: 'Search insights', icon: 'search' },
    ],
  },
  {
    group: 'Super Admin',
    items: [
      { href: `${ADMIN_PATH}/team`, label: 'Team', icon: 'team', superOnly: true },
      { href: `${ADMIN_PATH}/activity`, label: 'Activity log', icon: 'clock', superOnly: true },
      { href: `${ADMIN_PATH}/payments`, label: 'Plans & payments', icon: 'rupee', superOnly: true },
      { href: `${ADMIN_PATH}/alerts`, label: 'Alerts', icon: 'bell', superOnly: true },
      { href: `${ADMIN_PATH}/settings`, label: 'Settings', icon: 'cog', superOnly: true },
    ],
  },
];

const TABS: NavItem[] = [
  { href: ADMIN_PATH, label: 'Home', icon: 'home' },
  {
    href: `${ADMIN_PATH}/review`,
    label: 'Review',
    icon: 'review',
    badge: (b) => b.review + b.projects,
  },
  { href: `${ADMIN_PATH}/enquiries`, label: 'Leads', icon: 'inbox', badge: (b) => b.leads },
  { href: `${ADMIN_PATH}/support`, label: 'Support', icon: 'chat', badge: (b) => b.support },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export function Avatar({
  name,
  tone = 'brand',
  size = 34,
}: {
  name: string;
  tone?: 'brand' | 'accent' | 'navy';
  size?: number;
}) {
  const bg =
    tone === 'accent'
      ? 'bg-accent text-black'
      : tone === 'navy'
        ? 'bg-brand-800 text-white'
        : 'bg-brand text-white';
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${bg}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState(false);
  const [badges, setBadges] = useState<AdminBadges | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ admin: AdminUser }>('/admin/auth/me')
      .then(({ data }) => alive && setAdmin(data.admin))
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401)
          router.replace(`${ADMIN_PATH}/login?next=${encodeURIComponent(path)}`);
      });
    return () => {
      alive = false;
    };
    // Only on mount: session is re-validated by every API call anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBadges = useCallback(() => {
    apiFetch<AdminBadges>('/admin/badges')
      .then(({ data }) => setBadges(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!admin) return;
    refreshBadges();
    const t = setInterval(refreshBadges, 60_000);
    return () => clearInterval(t);
  }, [admin, refreshBadges]);

  // The mobile menu closes when moving between pages.
  const [menuPath, setMenuPath] = useState(path);
  if (menuPath !== path) {
    setMenuPath(path);
    setMenu(false);
  }
  // Fresh numbers when moving between pages.
  useEffect(() => {
    if (admin) refreshBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  async function logout() {
    await apiFetch('/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(`${ADMIN_PATH}/login`);
  }

  if (!admin) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <span className="size-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand" />
          <p className="text-sm text-ink-muted">Opening admin…</p>
        </div>
      </div>
    );
  }

  const isSuper = isSuperAdmin(admin.role);
  const isActive = (href: string) =>
    href === ADMIN_PATH ? path === ADMIN_PATH : path.startsWith(href);
  const current = NAV.flatMap((g) => g.items).find((n) => isActive(n.href));

  const navLinks = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.superOnly || isSuper),
  })).filter((g) => g.items.length);

  // The listing editor has its own fixed save bar at the bottom.
  const editing =
    path.startsWith(ADMIN_PATH) && /^\/properties\/[^/]+$/.test(path.slice(ADMIN_PATH.length));

  const sidebar = (
    <div className="adm-side flex h-full flex-col text-[#c9d3ee]">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3.5">
        <Link
          href={ADMIN_PATH}
          aria-label="Admin home"
          className="shrink-0 rounded-[10px] bg-white px-1.5 py-1"
        >
          <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={44} height={36} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">NEXUS Estate</p>
          <p className="text-xs text-[#93a3cf]">Admin · Jaipur</p>
        </div>
        <button
          type="button"
          className="ml-auto rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        >
          <A.close />
        </button>
      </div>
      <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {navLinks.map((g) => (
          <div key={g.group ?? 'main'}>
            {g.group && (
              <p className="px-2.5 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[.09em] text-[#7f8fbd]">
                {g.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((n) => {
                const on = isActive(n.href);
                const count = badges && n.badge ? n.badge(badges) : 0;
                const Icon = A[n.icon];
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={on ? 'page' : undefined}
                      className={`adm-link ${on ? 'adm-link-on' : ''}`}
                    >
                      <Icon />
                      <span className="truncate">{n.label}</span>
                      {count > 0 && (
                        <span className="adm-count" aria-label={`${count} waiting`}>
                          {count > 99 ? '99+' : count}
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
      <div className="m-3 mt-1 flex items-center gap-2.5 rounded-xl bg-white/[.06] p-2.5">
        <Avatar name={admin.name} tone="accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-white">{admin.name}</p>
          <p className="text-xs">{ADMIN_ROLE_LABELS[admin.role]}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg p-2 hover:bg-white/10 hover:text-white"
          aria-label="Sign out"
          title="Sign out"
        >
          <A.logout />
        </button>
      </div>
    </div>
  );

  return (
    <AdminCtx.Provider
      value={{
        admin,
        toast,
        can: (r) => rank[admin.role] >= rank[r],
        isSuper,
        badges,
        refreshBadges,
      }}
    >
      <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
        {menu && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMenu(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[min(18rem,86vw)] shadow-lift">
              {sidebar}
            </div>
          </div>
        )}

        <div className={`min-w-0 lg:pb-0 ${editing ? '' : 'pb-20'}`}>
          {/* Phone header */}
          <header className="adm-mtop sticky top-0 z-30 flex items-center gap-2.5 px-3 py-2.5 text-white lg:hidden">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white/10"
              onClick={() => setMenu(true)}
              aria-label="Open menu"
            >
              <A.menu width={22} height={22} />
            </button>
            <span className="rounded-md bg-white px-1 py-0.5">
              <Image src="/brand/nexus-logo.png" alt="" width={30} height={25} />
            </span>
            <b className="flex-1 truncate text-[15px]">{current?.label ?? 'Admin'}</b>
            <NotificationBell dark onChange={refreshBadges} unread={badges?.unread ?? 0} />
          </header>

          {/* Desktop top bar */}
          <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-line bg-white/95 px-7 py-3 backdrop-blur lg:flex">
            <p className="text-sm font-semibold text-ink-muted">
              Admin <span className="text-line-strong">/</span>{' '}
              <span className="text-ink">{current?.label ?? ''}</span>
            </p>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell onChange={refreshBadges} unread={badges?.unread ?? 0} />
              <Link href="/" target="_blank" className="btn btn-outline btn-sm gap-1.5">
                <A.external width={16} height={16} />
                View site
              </Link>
            </div>
          </header>

          <main className="mx-auto max-w-[1240px] p-4 sm:p-6 lg:px-7 lg:py-7">{children}</main>
        </div>

        {/* Phone tab bar (hidden on the listing editor, which has its own save bar) */}
        {!editing && (
          <nav
            aria-label="Quick links"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white px-1 pb-[max(.6rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
          >
            {TABS.map((t) => {
              const on = isActive(t.href);
              const count = badges && t.badge ? t.badge(badges) : 0;
              const Icon = A[t.icon];
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10.5px] font-bold ${on ? 'text-brand' : 'text-ink-muted'}`}
                >
                  <Icon width={22} height={22} />
                  {t.label}
                  {count > 0 && (
                    <span className="absolute -top-0.5 right-[18%] rounded-md bg-accent px-1 text-[9.5px] text-black">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10.5px] font-bold text-ink-muted"
            >
              <A.menu width={22} height={22} />
              More
            </button>
          </nav>
        )}
      </div>

      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lift ${t.kind === 'error' ? 'bg-danger text-white' : 'bg-brand-800 text-white'}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </AdminCtx.Provider>
  );
}

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function NotificationBell({
  unread,
  onChange,
  dark,
}: {
  unread: number;
  onChange: () => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    apiFetch<{ items: AdminNotification[] }>('/admin/notifications')
      .then(({ data }) => setItems(data.items))
      .catch(() => setItems([]));
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function readAll() {
    await apiFetch('/admin/notifications/read', { method: 'POST', body: { all: true } }).catch(
      () => undefined,
    );
    setItems((xs) => xs?.map((x) => ({ ...x, read: true })) ?? null);
    onChange();
  }

  async function openItem(n: AdminNotification) {
    setOpen(false);
    if (!n.read)
      await apiFetch('/admin/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(
        () => undefined,
      );
    onChange();
    if (n.link) router.push(adminHref(n.link));
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={
          dark
            ? 'relative grid size-9 place-items-center rounded-lg hover:bg-white/10'
            : 'relative grid size-[38px] place-items-center rounded-[10px] border border-line bg-white text-ink-soft hover:border-brand'
        }
      >
        <A.bell width={19} height={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full border-2 border-white bg-accent px-1 text-center text-[10px] font-extrabold leading-[14px] text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-14 z-50 overflow-hidden rounded-xl border border-line bg-white text-ink shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">Notifications</p>
            {items?.some((i) => !i.read) && (
              <button type="button" className="text-xs font-bold text-brand" onClick={readAll}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {!items && <li className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</li>}
            {items?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-muted">
                You are all caught up.
              </li>
            )}
            {items?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-surface ${n.read ? '' : 'bg-brand-50/60'}`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                    {n.body && (
                      <span className="block truncate text-xs text-ink-muted">{n.body}</span>
                    )}
                    <span className="mt-0.5 block text-[11px] font-semibold text-ink-muted">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PageTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight sm:text-[30px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-success-50 text-success',
  draft: 'bg-surface text-ink-soft ring-1 ring-line',
  rented: 'bg-brand-50 text-brand-800',
  sold: 'bg-brand-50 text-brand-800',
  pending: 'bg-accent-50 text-accent-700',
  rejected: 'bg-danger-50 text-danger',
  active: 'bg-success-50 text-success',
  blocked: 'bg-danger-50 text-danger',
  inactive: 'bg-warn-50 text-warn',
  archived: 'bg-surface text-ink-muted',
  new: 'bg-accent-50 text-accent-700',
  contacted: 'bg-brand-50 text-brand-800',
  qualified: 'bg-success-50 text-success',
  closed: 'bg-surface text-ink-muted',
  spam: 'bg-danger-50 text-danger',
  open: 'bg-warn-50 text-warn',
  resolved: 'bg-success-50 text-success',
  dismissed: 'bg-surface text-ink-muted',
  scheduled: 'bg-brand-50 text-brand-800',
  done: 'bg-success-50 text-success',
  cancelled: 'bg-surface text-ink-muted',
  'no-show': 'bg-danger-50 text-danger',
  verified: 'bg-success-50 text-success',
  unverified: 'bg-accent-50 text-accent-700',
  paid: 'bg-success-50 text-success',
  refunded: 'bg-surface text-ink-muted',
  failed: 'bg-danger-50 text-danger',
  created: 'bg-surface text-ink-muted',
  called: 'bg-brand-50 text-brand-800',
  'sent-to-bank': 'bg-brand-50 text-brand-800',
  sanctioned: 'bg-success-50 text-success',
  'not-eligible': 'bg-surface text-ink-muted',
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS_STYLES[status] ?? 'bg-surface'}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label ?? status.replace(/-/g, ' ')}
    </span>
  );
}

/** Grey placeholder blocks while data loads. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

/** Shown on Super-Admin pages when a Sub-admin opens the link directly. */
export function SuperOnly({ children }: { children: React.ReactNode }) {
  const { isSuper } = useAdmin();
  if (isSuper) return <>{children}</>;
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <A.team width={36} height={36} className="mx-auto text-brand" />
      <h1 className="mt-3 text-2xl">Super Admin only</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This page is for Super Admins. Ask a Super Admin if something here needs changing.
      </p>
      <Link href={ADMIN_PATH} className="btn btn-primary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
}
