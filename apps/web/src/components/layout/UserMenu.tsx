'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { USER_ROLE_LABELS, canListProperty } from '@nexus/shared';
import { POST_PROPERTY_PATH } from '@/lib/site';
import { useSession } from '../session/SessionProvider';
import { UserNotificationBell } from './UserNotificationBell';
import {
  ChevronDown,
  GridIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  LogoutIcon,
  PlusIcon,
  SettingsIcon,
} from '../icons';

export function UserMenu() {
  const { user, loading, logout } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
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

  const postHref = user
    ? POST_PROPERTY_PATH
    : `/signup?next=${encodeURIComponent(POST_PROPERTY_PATH)}`;

  return (
    <div className="flex items-center gap-2">
      <Link href={postHref} className="btn btn-outline hidden border-brand/40 sm:inline-flex">
        <PlusIcon size={17} /> Post property
      </Link>

      {loading ? (
        <span className="hidden h-11 w-24 sm:block" aria-hidden />
      ) : !user ? (
        <div className="hidden items-center gap-1 sm:flex">
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </div>
      ) : (
        <>
          <UserNotificationBell />
          <div ref={ref} className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-brand"
            >
              <span className="grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                {user.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown size={14} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-lift">
                <div className="border-b border-line px-3 pb-3 pt-2">
                  <p className="truncate font-semibold">{user.companyName || user.name}</p>
                  <p className="text-xs text-ink-muted">{USER_ROLE_LABELS[user.role]}</p>
                </div>
                <ul className="py-1 text-sm" onClick={() => setOpen(false)}>
                  <MenuLink href="/dashboard" icon={<GridIcon size={17} />}>
                    Dashboard
                  </MenuLink>
                  {canListProperty(user.role) ? (
                    <>
                      <MenuLink href="/dashboard/listings" icon={<HomeIcon size={17} />}>
                        My listings
                      </MenuLink>
                      <MenuLink href="/dashboard/leads" icon={<InboxIcon size={17} />}>
                        Leads
                      </MenuLink>
                    </>
                  ) : (
                    <MenuLink href="/dashboard/enquiries" icon={<InboxIcon size={17} />}>
                      My enquiries
                    </MenuLink>
                  )}
                  <MenuLink href="/dashboard/saved" icon={<HeartIcon size={17} />}>
                    Saved
                  </MenuLink>
                  <MenuLink href="/dashboard/profile" icon={<SettingsIcon size={17} />}>
                    Profile and settings
                  </MenuLink>
                </ul>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2.5 rounded-lg border-t border-line px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-surface"
                >
                  <LogoutIcon size={17} /> Log out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-surface">
        <span className="text-brand">{icon}</span>
        {children}
      </Link>
    </li>
  );
}
