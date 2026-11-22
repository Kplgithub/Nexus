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
      className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[0.9375rem] font-medium transition-colors 2xl:px-3 ${
        active
          ? 'bg-brand-50 text-brand-800'
          : 'text-ink-soft hover:bg-surface hover:text-brand-800'
      }`}
    >
      {children}
    </Link>
  );
}
