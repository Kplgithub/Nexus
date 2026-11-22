import Link from 'next/link';
import { SHOW_LOCALITY_LINKS } from '@/lib/site';
import { ALL_ON, hrefOn, type SectionsOn } from '@/lib/sections';
import type { City } from '@nexus/shared';
import { NavLink } from './NavLink';
import { ChevronDown, SparklesIcon } from '../icons';

/**
 * Desktop navigation with MagicBricks-style dropdowns: property types, budgets,
 * popular localities and quick links for each deal. Pure CSS (hover and
 * focus-within), so it works before any JavaScript loads and with the keyboard.
 */
type Col = { title: string; links: { label: string; href: string }[] };
type Item = { label: string; href: string; cols?: Col[]; promo?: { title: string; text: string } };

function qs(base: string, params: Record<string, string>) {
  const s = new URLSearchParams(params).toString();
  return s ? `${base}?${s}` : base;
}

function fullMenu(cities: City[], farms: boolean): Item[] {
  const city = cities.length === 1 ? cities[0] : undefined;
  const top =
    city && SHOW_LOCALITY_LINKS
      ? [...city.localities]
          .sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
          .slice(0, 8)
      : [];
  const buy = city ? `/buy/${city.slug}` : '/buy';
  const rent = city ? `/rent/${city.slug}` : '/rent';
  const where = city ? ` in ${city.name}` : '';
  const places = (root: string): Col | null =>
    top.length
      ? {
          title: 'Popular localities',
          links: top.map((l) => ({ label: l.name, href: `${root}/${l.slug}` })),
        }
      : null;

  return [
    {
      label: 'Buy',
      href: '/buy',
      cols: [
        {
          title: 'Property type',
          links: [
            { label: `Flats${where}`, href: qs(buy, { propertyType: 'apartment' }) },
            { label: 'Independent houses', href: qs(buy, { propertyType: 'independent-house' }) },
            { label: 'Villas', href: qs(buy, { propertyType: 'villa' }) },
            { label: 'Builder floors', href: qs(buy, { propertyType: 'builder-floor' }) },
            { label: 'Plots and land', href: qs(buy, { propertyType: 'plot' }) },
            ...(farms
              ? [
                  { label: 'Farmhouses', href: qs(buy, { propertyType: 'farmhouse' }) },
                  { label: 'Farm land', href: qs(buy, { propertyType: 'farm-land' }) },
                ]
              : []),
          ],
        },
        {
          title: 'Budget',
          links: [
            { label: 'Under ₹30 Lakh', href: qs(buy, { maxPrice: '3000000' }) },
            { label: '₹30 – 50 Lakh', href: qs(buy, { minPrice: '3000000', maxPrice: '5000000' }) },
            {
              label: '₹50 Lakh – 1 Cr',
              href: qs(buy, { minPrice: '5000000', maxPrice: '10000000' }),
            },
            { label: '₹1 – 2 Cr', href: qs(buy, { minPrice: '10000000', maxPrice: '20000000' }) },
            { label: 'Above ₹2 Cr', href: qs(buy, { minPrice: '20000000' }) },
          ],
        },
        ...[places('/buy' + (city ? `/${city.slug}` : ''))].filter((c): c is Col => !!c),
        {
          title: 'Explore',
          links: [
            { label: 'Ready to move', href: qs(buy, { possession: 'ready' }) },
            { label: 'Owner properties', href: qs(buy, { postedBy: 'owner' }) },
            { label: 'Verified only', href: qs(buy, { verified: 'true' }) },
            { label: 'New projects', href: '/projects' },
            { label: 'Map search', href: qs(buy, { view: 'map' }) },
          ],
        },
      ],
      promo: {
        title: 'Search in your words',
        text: 'Type "3 BHK under 80 lakh in Jagatpura" and we find it.',
      },
    },
    {
      label: 'Rent',
      href: '/rent',
      cols: [
        {
          title: 'Property type',
          links: [
            { label: `Flats for rent${where}`, href: qs(rent, { propertyType: 'apartment' }) },
            { label: 'Houses for rent', href: qs(rent, { propertyType: 'independent-house' }) },
            { label: 'Furnished homes', href: qs(rent, { furnishing: 'furnished' }) },
            { label: 'PG for girls', href: qs(rent, { propertyType: 'pg', pgGender: 'female' }) },
            { label: 'PG for boys', href: qs(rent, { propertyType: 'pg', pgGender: 'male' }) },
          ],
        },
        {
          title: 'Monthly rent',
          links: [
            { label: 'Under ₹10,000', href: qs(rent, { maxPrice: '10000' }) },
            { label: '₹10,000 – 20,000', href: qs(rent, { minPrice: '10000', maxPrice: '20000' }) },
            { label: '₹20,000 – 40,000', href: qs(rent, { minPrice: '20000', maxPrice: '40000' }) },
            { label: 'Above ₹40,000', href: qs(rent, { minPrice: '40000' }) },
          ],
        },
        ...[places('/rent' + (city ? `/${city.slug}` : ''))].filter((c): c is Col => !!c),
        {
          title: 'Explore',
          links: [
            { label: 'Available now', href: qs(rent, { availableNow: 'true' }) },
            { label: 'Owner properties', href: qs(rent, { postedBy: 'owner' }) },
            { label: 'Verified only', href: qs(rent, { verified: 'true' }) },
            { label: 'Map search', href: qs(rent, { view: 'map' }) },
          ],
        },
      ],
      promo: {
        title: 'Rent smarter',
        text: 'Compare rent, deposit and furnishing, then talk to owners directly.',
      },
    },
    { label: 'New projects', href: '/projects' },
    {
      label: 'Commercial',
      href: '/commercial',
      cols: [
        {
          title: 'For rent',
          links: [
            {
              label: 'Office space',
              href: qs('/commercial', { listingType: 'rent', propertyType: 'office' }),
            },
            {
              label: 'Shops',
              href: qs('/commercial', { listingType: 'rent', propertyType: 'shop' }),
            },
            {
              label: 'Showrooms',
              href: qs('/commercial', { listingType: 'rent', propertyType: 'showroom' }),
            },
            {
              label: 'Co-working',
              href: qs('/commercial', { listingType: 'rent', propertyType: 'coworking' }),
            },
            {
              label: 'Whole buildings',
              href: qs('/commercial', { listingType: 'rent', propertyType: 'commercial-building' }),
            },
          ],
        },
        {
          title: 'For sale',
          links: [
            {
              label: 'Office space',
              href: qs('/commercial', { listingType: 'sale', propertyType: 'office' }),
            },
            {
              label: 'Shops',
              href: qs('/commercial', { listingType: 'sale', propertyType: 'shop' }),
            },
            {
              label: 'Showrooms',
              href: qs('/commercial', { listingType: 'sale', propertyType: 'showroom' }),
            },
            {
              label: 'Whole buildings',
              href: qs('/commercial', { listingType: 'sale', propertyType: 'commercial-building' }),
            },
          ],
        },
      ],
      promo: {
        title: 'For businesses',
        text: 'Offices, shops and showrooms on the main roads, with direct contact.',
      },
    },
    { label: 'Home loan', href: '/home-loan' },
    { label: 'Agents', href: '/agents' },
    { label: 'Locations', href: '/locations' },
    { label: 'Blog', href: '/blog' },
  ];
}

/** The menu without anything from a switched-off site section, and no empty columns. */
function menu(cities: City[], on: SectionsOn, farms: boolean): Item[] {
  return fullMenu(cities, farms)
    .filter((item) => hrefOn(item.href, on))
    .map((item) => {
      const cols = item.cols
        ?.map((c) => ({ ...c, links: c.links.filter((l) => hrefOn(l.href, on)) }))
        .filter((c) => c.links.length > 0);
      return { ...item, cols: cols?.length ? cols : undefined };
    });
}

export function MegaMenu({
  cities,
  on = ALL_ON,
  farms = false,
}: {
  cities: City[];
  on?: SectionsOn;
  /** Admin switch: farm links in the Buy menu. */
  farms?: boolean;
}) {
  return (
    <nav aria-label="Main" className="relative ml-4 hidden xl:block">
      <ul className="flex items-center gap-0.5">
        {menu(cities, on, farms).map((item) =>
          item.cols ? (
            <li key={item.href} className="group">
              <div className="flex items-center">
                <NavLink href={item.href}>
                  <span className="inline-flex items-center gap-1">
                    {item.label}
                    <ChevronDown
                      size={14}
                      className="opacity-60 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                    />
                  </span>
                </NavLink>
              </div>
              {/* The padding bridges the gap so the panel stays open while the pointer moves. */}
              <div className="invisible absolute left-0 top-full z-50 pt-3 opacity-0 transition duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="flex translate-y-1 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-20px_rgb(30_64_175/0.35)] transition-transform duration-200 group-hover:translate-y-0">
                  <div className="flex gap-6 p-6 xl:gap-8">
                    {item.cols.map((col) => (
                      <div key={col.title} className="w-40 xl:w-44">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          {col.title}
                        </p>
                        <ul className="mt-3 space-y-1">
                          {col.links.map((l) => (
                            <li key={l.label}>
                              <Link
                                href={l.href}
                                className="-mx-2 block rounded-md px-2 py-1.5 text-sm text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
                              >
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {item.promo && (
                    <div className="relative isolate hidden w-56 overflow-hidden bg-brand-900 p-6 text-white xl:block">
                      <div className="nx-aurora" aria-hidden />
                      <SparklesIcon size={22} className="relative text-accent" />
                      <p className="relative mt-3 font-display text-lg leading-snug">
                        {item.promo.title}
                      </p>
                      <p className="relative mt-2 text-sm leading-relaxed text-white/75">
                        {item.promo.text}
                      </p>
                      <Link
                        href={item.href}
                        className="relative mt-4 inline-flex rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-800 hover:bg-accent-50"
                      >
                        Browse all
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ) : (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
