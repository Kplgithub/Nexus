'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatIndianPhone } from '@nexus/shared';
import { NAV_LINKS, POST_PROPERTY_PATH } from '@/lib/site';
import { useSession } from '../session/SessionProvider';
import { CloseIcon, MenuIcon, PhoneIcon } from '../icons';

export function MobileNav({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user, logout } = useSession();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>
      <dialog
        id="mobile-nav"
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Close when clicking the backdrop or following a link.
          const target = e.target as HTMLElement;
          if (target === dialogRef.current || target.closest('a')) setOpen(false);
        }}
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none bg-white p-0 backdrop:bg-black/40"
        aria-label="Menu"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={60} height={50} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 py-3">
            <ul>
              <li>
                <Link
                  href="/"
                  className="block rounded-lg px-3 py-3 text-lg font-medium hover:bg-surface"
                >
                  Home
                </Link>
              </li>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={path === l.href ? 'page' : undefined}
                    className="block rounded-lg px-3 py-3 text-lg font-medium hover:bg-surface aria-[current=page]:text-brand"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/faq"
                  className="block rounded-lg px-3 py-3 text-lg font-medium hover:bg-surface"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="block rounded-lg px-3 py-3 text-lg font-medium hover:bg-surface"
                >
                  Contact
                </Link>
              </li>
            </ul>
            <div className="mt-3 border-t border-line pt-3">
              {user ? (
                <ul>
                  <li className="px-3 pb-2 text-sm text-ink-muted">Signed in as {user.name}</li>
                  {[
                    ['/dashboard', 'Dashboard'],
                    ['/dashboard/listings', 'My listings'],
                    ...(user.role === 'builder' ? [['/dashboard/projects', 'My projects']] : []),
                    ['/dashboard/leads', 'Leads'],
                    ['/dashboard/saved', 'Saved'],
                    ['/dashboard/profile', 'Profile and settings'],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link
                        href={href!}
                        className="block rounded-lg px-3 py-2.5 font-medium hover:bg-surface"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        void logout();
                      }}
                      className="block w-full rounded-lg px-3 py-2.5 text-left font-medium text-ink-soft hover:bg-surface"
                    >
                      Log out
                    </button>
                  </li>
                </ul>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-1">
                  <Link href="/login" className="btn btn-outline">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn btn-primary">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
          <div className="space-y-2 border-t border-line p-4">
            <Link
              href={
                user ? POST_PROPERTY_PATH : `/signup?next=${encodeURIComponent(POST_PROPERTY_PATH)}`
              }
              className="btn btn-primary w-full"
            >
              Post property
            </Link>
            <a href={`tel:${phone}`} className="btn btn-outline w-full">
              <PhoneIcon size={18} /> {formatIndianPhone(phone)}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
