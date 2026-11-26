'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canListProperty, type OwnListing, type UserDashboard } from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { BellIcon } from '../icons';

type UserNotif = {
  id: string;
  title: string;
  body?: string;
  tone: 'success' | 'danger' | 'warn' | 'brand';
  href: string;
  at: string;
};

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function readStoredIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids].slice(-100)));
  } catch {
    /* ignore storage limits */
  }
}

function buildNotifications(
  listings: OwnListing[],
  dash: UserDashboard | null,
  supportUnread: number,
): UserNotif[] {
  const items: UserNotif[] = [];

  for (const p of listings) {
    const key = `${p.id}:${p.status}:${p.updatedAt}`;
    if (p.status === 'published') {
      items.push({
        id: key,
        title: `Approved & live: ${p.title}`,
        body:
          p.enquiryCount > 0
            ? `${p.enquiryCount} ${p.enquiryCount === 1 ? 'enquiry' : 'enquiries'} received`
            : 'Your property is now visible to buyers & tenants.',
        tone: 'success',
        href: `/dashboard/listings/${p.id}`,
        at: p.publishedAt ?? p.updatedAt,
      });
    } else if (p.status === 'rejected') {
      items.push({
        id: key,
        title: `Changes requested: ${p.title}`,
        body: p.moderationNote || 'Please update the listing details and resubmit.',
        tone: 'danger',
        href: `/dashboard/listings/${p.id}`,
        at: p.updatedAt,
      });
    } else if (p.status === 'pending') {
      items.push({
        id: key,
        title: `Under review: ${p.title}`,
        body: 'Our team is reviewing your property before it goes live.',
        tone: 'warn',
        href: '/dashboard/listings?status=pending',
        at: p.updatedAt,
      });
    } else if (p.awaitingPlan) {
      items.push({
        id: `${key}:plan`,
        title: `Plan needed: ${p.title}`,
        body: 'Choose a plan to submit this listing for approval.',
        tone: 'brand',
        href: `/dashboard/plans?saved=${p.id}`,
        at: p.updatedAt,
      });
    } else if (p.status === 'inactive') {
      items.push({
        id: key,
        title: `Listing paused: ${p.title}`,
        body: p.moderationNote || 'Currently hidden from search.',
        tone: 'warn',
        href: `/dashboard/listings/${p.id}`,
        at: p.updatedAt,
      });
    }
  }

  if (dash && dash.leads.unseen > 0) {
    items.push({
      id: `leads:${dash.leads.unseen}`,
      title: `${dash.leads.unseen} new ${dash.leads.unseen === 1 ? 'enquiry' : 'enquiries'}`,
      body: 'Open Leads to view buyer or tenant contact details.',
      tone: 'brand',
      href: '/dashboard/leads',
      at: new Date().toISOString(),
    });
  }

  if (supportUnread > 0) {
    items.push({
      id: `support:${supportUnread}`,
      title: `${supportUnread} unread support ${supportUnread === 1 ? 'reply' : 'replies'}`,
      body: 'Our support team replied to your ticket.',
      tone: 'brand',
      href: '/dashboard/support',
      at: new Date().toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}

const TONE_DOT: Record<UserNotif['tone'], string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  warn: 'bg-accent',
  brand: 'bg-brand',
};

/**
 * Notification bell for signed-in users: surfaces property approval/rejection
 * status, moderation notes, plan prompts, new leads, and support replies.
 */
export function UserNotificationBell() {
  const { user } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotif[] | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    user ? readStoredIds(`nexus_user_notifs_read:${user.id}`) : new Set(),
  );
  const box = useRef<HTMLDivElement>(null);

  const storageKey = user ? `nexus_user_notifs_read:${user.id}` : '';

  const load = useCallback(async () => {
    if (!user) return;
    const lister = canListProperty(user.role);
    const [propsRes, dashRes, supRes] = await Promise.allSettled([
      lister ? apiFetch<OwnListing[]>('/me/properties?limit=20') : Promise.resolve(null),
      lister ? apiFetch<UserDashboard>('/me/dashboard') : Promise.resolve(null),
      apiFetch<{ unread: number }>('/me/support/unread'),
    ]);
    const listings =
      propsRes.status === 'fulfilled' && propsRes.value ? propsRes.value.data : [];
    const dash = dashRes.status === 'fulfilled' && dashRes.value ? dashRes.value.data : null;
    const supportUnread =
      supRes.status === 'fulfilled' && supRes.value ? supRes.value.data.unread : 0;

    setReadIds(readStoredIds(`nexus_user_notifs_read:${user.id}`));
    setItems(buildNotifications(listings, dash, supportUnread));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [user, load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => (items ? items.filter((i) => !readIds.has(i.id)).length : 0),
    [items, readIds],
  );

  if (!user) return null;

  function markAllRead() {
    if (!items || !storageKey) return;
    const next = new Set(readIds);
    for (const item of items) next.add(item.id);
    setReadIds(next);
    saveStoredIds(storageKey, next);
  }

  function openItem(n: UserNotif) {
    setOpen(false);
    if (storageKey && !readIds.has(n.id)) {
      const next = new Set(readIds);
      next.add(n.id);
      setReadIds(next);
      saveStoredIds(storageKey, next);
    }
    router.push(n.href);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative grid size-10 place-items-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand hover:text-brand"
      >
        <BellIcon size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full border-2 border-white bg-accent px-1 text-center text-[10px] font-extrabold leading-[14px] text-brand-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-line bg-white text-ink shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">Notifications</p>
            {items && items.some((i) => !readIds.has(i.id)) && (
              <button
                type="button"
                className="text-xs font-bold text-brand hover:underline"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {!items && (
              <li className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</li>
            )}
            {items?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-muted">
                No updates yet. When you post a property, its approval status will appear here.
              </li>
            )}
            {items?.map((n) => {
              const unread = !readIds.has(n.id);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface ${
                      unread ? 'bg-brand-50/50' : ''
                    }`}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        unread ? TONE_DOT[n.tone] : 'bg-transparent'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] font-semibold text-ink-muted">
                        {timeAgo(n.at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
