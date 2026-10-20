'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatIndianPhone } from '@nexus/shared';
import { NAV_LINKS } from '@/lib/site';
import { CloseIcon, MenuIcon, PhoneIcon } from '../icons';

export function MobileNav({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

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
            </ul>
          </nav>
          <div className="space-y-2 border-t border-line p-4">
            <Link href="/list-your-property" className="btn btn-primary w-full">
              List Your Property
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
