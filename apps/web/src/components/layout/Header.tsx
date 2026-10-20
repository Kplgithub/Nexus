import Link from 'next/link';
import { formatIndianPhone, type SiteSettings } from '@nexus/shared';
import { NAV_LINKS } from '@/lib/site';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { PhoneIcon } from '../icons';
import { NavLink } from './NavLink';

export function Header({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo height={58} priority />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <NavLink href={l.href}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${settings.phone}`}
            className="btn btn-ghost hidden xl:inline-flex"
            aria-label={`Call ${formatIndianPhone(settings.phone)}`}
          >
            <PhoneIcon size={18} />
            {formatIndianPhone(settings.phone)}
          </a>
          <Link href="/list-your-property" className="btn btn-primary hidden sm:inline-flex">
            List Your Property
          </Link>
          <MobileNav phone={settings.phone} />
        </div>
      </div>
    </header>
  );
}
