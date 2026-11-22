import Link from 'next/link';
import { SHOW_LOCALITY_LINKS } from '@/lib/site';
import { hrefOn, sectionsOn } from '@/lib/sections';
import {
  farmOn,
  formatIndianPhone,
  whatsappLink,
  type City,
  type SiteSettings,
} from '@nexus/shared';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
  XIcon,
  YoutubeIcon,
} from '../icons';

const SOCIAL = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon },
  { key: 'x', label: 'X', Icon: XIcon },
] as const;

export function Footer({ settings, cities }: { settings: SiteSettings; cities: City[] }) {
  const year = new Date().getFullYear();
  const city = cities[0];
  const cityName = city?.name ?? 'Jaipur';
  const citySlug = city?.slug ?? 'jaipur';
  const localities = cities.flatMap((c) =>
    (SHOW_LOCALITY_LINKS ? c.localities : [])
      .filter((l) => (l.publishedCount ?? 0) > 0 || l.intro)
      .slice(0, 8)
      .map((l) => ({ ...l, city: c })),
  );
  const socials = SOCIAL.filter((s) => settings.social[s.key]);
  const on = sectionsOn(settings);
  const shown = (links: [string, string][]) => links.filter(([href]) => hrefOn(href, on));

  const property: [string, string][] = [
    [`/buy?city=${citySlug}`, `Property for sale in ${cityName}`],
    [`/rent?city=${citySlug}`, `Property for rent in ${cityName}`],
    [`/buy?city=${citySlug}&propertyType=apartment`, `Flats in ${cityName}`],
    [`/buy?city=${citySlug}&propertyType=plot`, `Plots in ${cityName}`],
    ...(farmOn(settings.farms, 'menu')
      ? ([[`/buy?city=${citySlug}&propertyType=farmhouse,farm-land`, `Farms in ${cityName}`]] as [
          string,
          string,
        ][])
      : []),
    [`/rent?city=${citySlug}&propertyType=pg`, `PG in ${cityName}`],
    ['/commercial', `Commercial property in ${cityName}`],
    ...localities.map((l): [string, string] => [
      `/buy/${l.city.slug}/${l.slug}`,
      `Property in ${l.name}`,
    ]),
  ];
  const projects: [string, string][] = [
    ['/projects', `New projects in ${cityName}`],
    ['/builders', `Builders in ${cityName}`],
    [`/buy?city=${citySlug}&possession=under-construction`, 'Under construction homes'],
    [`/buy?city=${citySlug}&possession=ready`, 'Ready to move homes'],
  ];
  const services: [string, string][] = [
    ['/post-property', 'Post property'],
    ['/agents', 'Find an agent'],
    ['/home-loan', 'Home loan'],
    ['/home-loan#calculators', 'EMI calculator'],
    ['/search', 'AI search'],
    ['/buy?view=map', 'Map search'],
  ];
  const bottom: [string, string][] = [
    ['/sitemap.xml', 'Sitemap'],
    ['/terms-and-conditions', 'Terms & Conditions'],
    ['/privacy-policy', 'Privacy Policy'],
    ['/cookie-policy', 'Cookie Policy'],
    ['/blog', 'Blog'],
    ['/about', 'About Us'],
    ['/contact', 'Contact Us'],
    ['/faq', 'FAQs'],
    ['/dashboard', 'My Dashboard'],
  ];

  return (
    <footer className="mt-12 border-t border-line bg-surface text-ink">
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <h2 className="font-sans text-base font-semibold">About {settings.businessName}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {settings.businessName} helps you buy, sell and rent homes, plots and commercial spaces
            in {cityName}. Every listing is reviewed by our team before it goes live.{' '}
            <Link href="/about" className="font-semibold text-brand hover:underline">
              Read more
            </Link>
          </p>

          <h2 className="mt-6 font-sans text-base font-semibold">Contact us</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-2 hover:text-brand"
              >
                <PhoneIcon size={15} /> {formatIndianPhone(settings.phone)}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink(
                  settings.whatsapp,
                  'Hello NEXUS Estate, I would like to know more about a property.',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-brand"
              >
                <WhatsAppIcon size={15} /> WhatsApp us
              </a>
            </li>
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 hover:text-brand"
                >
                  <MailIcon size={15} /> {settings.email}
                </a>
              </li>
            )}
            {settings.showAddress && settings.address.line1 && (
              <li className="flex items-start gap-2">
                <MapPinIcon size={15} className="mt-0.5 shrink-0" />
                <address className="not-italic">
                  {[
                    settings.address.line1,
                    settings.address.line2,
                    `${settings.address.city} ${settings.address.pincode}`.trim(),
                    settings.address.state,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </address>
              </li>
            )}
          </ul>

          {socials.length > 0 && (
            <ul className="mt-5 flex gap-2" aria-label="Social media">
              {socials.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={settings.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-accent hover:text-ink"
                  >
                    <Icon size={16} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-6">
          <InlineLinks title={`Properties in ${cityName}`} links={shown(property)} />
          <InlineLinks
            title={on.projects ? `New projects in ${cityName}` : `Homes in ${cityName}`}
            links={shown(projects)}
          />
          <InlineLinks title="Property services" links={shown(services)} />
        </div>
      </div>

      <nav aria-label="Site links" className="border-t border-line bg-[#eef0f3]">
        <ul className="container-page flex flex-wrap gap-x-5 gap-y-2 py-4 text-sm text-ink-soft">
          {bottom.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="hover:text-brand">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page py-4 text-xs leading-relaxed text-ink-muted">
        Disclaimer: {settings.businessName} is a listing platform. Listing details are shared by
        owners, agents and builders and should be confirmed before any payment. For new projects,
        check the RERA registration on{' '}
        <a
          href="https://rera.rajasthan.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-brand"
        >
          rera.rajasthan.gov.in
        </a>{' '}
        before you book.
      </div>

      <div className="bg-brand-900 text-white/75">
        <p className="container-page py-3 text-xs">
          © {year} {settings.businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function InlineLinks({ title, links }: { title: string; links: [string, string][] }) {
  if (!links.length) return null;
  return (
    <nav aria-label={title}>
      <h2 className="font-sans text-base font-semibold">{title}</h2>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-brand">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
