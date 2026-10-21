import type { City, SiteSettings } from '@nexus/shared';
import { NAV_LINKS } from '@/lib/site';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { NavLink } from './NavLink';
import { UserMenu } from './UserMenu';
import { CityMenu } from './CityMenu';

export function Header({ settings, cities }: { settings: SiteSettings; cities: City[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-[72px] items-center gap-3">
        <Logo height={54} priority />
        {cities.length > 0 && (
          <div className="hidden md:block">
            <CityMenu
              cities={cities.map((c) => ({ name: c.name, slug: c.slug, state: c.state }))}
            />
          </div>
        )}

        <nav aria-label="Main" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <NavLink href={l.href}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
          <MobileNav phone={settings.phone} />
        </div>
      </div>
    </header>
  );
}
