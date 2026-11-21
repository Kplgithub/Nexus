import type { City, SiteSettings } from '@nexus/shared';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { MegaMenu } from './MegaMenu';
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
          <div>
            <CityMenu
              cities={cities.map((c) => ({ name: c.name, slug: c.slug, state: c.state }))}
            />
          </div>
        )}

        <MegaMenu cities={cities} />

        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
          <MobileNav phone={settings.phone} />
        </div>
      </div>
    </header>
  );
}
