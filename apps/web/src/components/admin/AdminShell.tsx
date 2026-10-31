'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AdminUser } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { CloseIcon, MenuIcon } from '../icons';

type Toast = { id: number; kind: 'success' | 'error'; text: string };
type Ctx = {
  admin: AdminUser;
  toast: (text: string, kind?: Toast['kind']) => void;
  can: (role: AdminUser['role']) => boolean;
};

const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminShell');
  return c;
};

const rank = { editor: 1, admin: 2, owner: 3 } as const;

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/locations', label: 'Locations' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/faqs', label: 'FAQs' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<{ admin: AdminUser }>('/admin/auth/me')
      .then(({ data }) => alive && setAdmin(data.admin))
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401)
          router.replace(`/admin/login?next=${encodeURIComponent(path)}`);
      });
    return () => {
      alive = false;
    };
    // Only on mount: session is re-validated by every API call anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  async function logout() {
    await apiFetch('/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
  }

  if (!admin) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href);

  return (
    <AdminCtx.Provider value={{ admin, toast, can: (r) => rank[admin.role] >= rank[r] }}>
      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
        <aside
          className={`${menu ? 'fixed inset-0 z-40 block' : 'hidden'} border-r border-line bg-white lg:static lg:block`}
        >
          <div className="flex items-center justify-between p-5">
            <Link href="/admin" aria-label="Admin home">
              <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={72} height={60} />
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm lg:hidden"
              onClick={() => setMenu(false)}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Admin">
            <ul className="space-y-0.5 px-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setMenu(false)}
                    aria-current={isActive(n.href) ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${isActive(n.href) ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-surface'}`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 border-t border-line p-5 text-sm">
            <p className="font-semibold">{admin.name}</p>
            <p className="text-ink-muted">
              {admin.email} · {admin.role}
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/" target="_blank" className="btn btn-outline btn-sm">
                View site
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setMenu(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <span className="font-semibold">NEXUS Admin</span>
            <span className="w-10" />
          </header>
          <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
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

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
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
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-surface'}`}
    >
      {status}
    </span>
  );
}
