'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-2 text-[0.9375rem] font-medium transition-colors ${
        active
          ? 'bg-brand-50 text-brand-800'
          : 'text-ink-soft hover:bg-surface hover:text-brand-800'
      }`}
    >
      {children}
    </Link>
  );
}
