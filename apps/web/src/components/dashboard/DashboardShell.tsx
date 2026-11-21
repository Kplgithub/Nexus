'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { USER_ROLE_LABELS } from '@nexus/shared';
import { POST_PROPERTY_PATH } from '@/lib/site';
import { useSession } from '../session/SessionProvider';
import {
  BadgeCheckIcon,
  CraneIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  LayersIcon,
  PlusIcon,
  SendIcon,
  SettingsIcon,
} from '../icons';

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: GridIcon },
  { href: '/dashboard/listings', label: 'My listings', Icon: HomeIcon },
  { href: '/dashboard/projects', label: 'My projects', Icon: CraneIcon, builderOnly: true },
  { href: '/dashboard/leads', label: 'Leads', Icon: InboxIcon },
  { href: '/dashboard/saved', label: 'Saved', Icon: HeartIcon },
  { href: '/dashboard/enquiries', label: 'My enquiries', Icon: SendIcon },
  { href: '/dashboard/plans', label: 'My plan', Icon: LayersIcon },
  { href: '/dashboard/profile', label: 'Profile & security', Icon: SettingsIcon },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading, requireLogin } = useSession();

  useEffect(() => {
    if (!loading && !user) requireLogin();
  }, [loading, user, requireLogin]);

  if (loading || !user) {
    return (
      <div className="container-page py-16" aria-busy="true">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton mt-6 h-40 w-full" />
      </div>
    );
  }

  const active = (href: string) =>
    href === '/dashboard' ? path === '/dashboard' : path.startsWith(href);
  const display = user.role === 'individual' ? user.name : user.companyName || user.name;

  return (
    <div className="container-page pb-10 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm text-ink-muted">{USER_ROLE_LABELS[user.role]} account</p>
          <h1 className="mt-1 flex items-center gap-2 text-[1.9rem] leading-tight">
            {display}
            {user.verified && (
              <BadgeCheckIcon size={22} className="text-accent-700" aria-label="Verified" />
            )}
          </h1>
        </div>
        <Link href={POST_PROPERTY_PATH} className="btn btn-primary">
          <PlusIcon size={18} /> Post a property
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav
          aria-label="Dashboard"
          className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
        >
          <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
            {NAV.filter((n) => !('builderOnly' in n) || user.role === 'builder').map(
              ({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active(href) ? 'page' : undefined}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active(href) ? 'bg-brand-900 text-white' : 'text-ink-soft hover:bg-surface'
                    }`}
                  >
                    <Icon size={18} /> {label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
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
