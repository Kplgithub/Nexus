import Link from 'next/link';
import { SHOW_LOCALITY_LINKS } from '@/lib/site';
import Image from 'next/image';
import { formatIndianPhone, whatsappLink, type City, type SiteSettings } from '@nexus/shared';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
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
  const localities = cities.flatMap((c) =>
    (SHOW_LOCALITY_LINKS ? c.localities : [])
      .filter((l) => (l.publishedCount ?? 0) > 0 || l.intro)
      .slice(0, 8)
      .map((l) => ({ ...l, city: c })),
  );
  const socials = SOCIAL.filter((s) => settings.social[s.key]);

  const explore = [
    ['/buy', 'Property for sale'],
    ['/rent', 'Property for rent'],
    ['/projects', 'New projects'],
    ['/commercial', 'Commercial property'],
    ['/rent?propertyType=pg', 'PG and hostels'],
    ['/buy?propertyType=plot', 'Plots'],
    ['/buy?view=map', 'Map search'],
    ['/locations', 'Browse by location'],
  ];
  const partners = [
    ['/post-property', 'Post property'],
    ['/agents', 'Find an agent'],
    ['/builders', 'Builders'],
    ['/dashboard', 'My dashboard'],
  ];
  const company = [
    ['/about', 'About NEXUS'],
    ['/contact', 'Contact'],
    ['/blog', 'Blog'],
    ['/faq', 'FAQs'],
    ['/privacy-policy', 'Privacy policy'],
    ['/terms-and-conditions', 'Terms & conditions'],
    ['/cookie-policy', 'Cookie policy'],
  ];

  return (
    <footer className="relative isolate mt-12 overflow-hidden bg-brand-900 text-white">
      <div className="nx-aurora opacity-40" aria-hidden />
      <div className="nx-grid opacity-60" aria-hidden />

      {/* CTA band */}
      <div className="container-page pt-12">
        <div className="nx-glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-[1.6rem] leading-tight sm:text-[1.9rem]">
              Have a property in {cities[0]?.name ?? 'your city'}?{' '}
              <span className="nx-ai-text">List it today.</span>
            </p>
            <p className="mt-1.5 text-sm text-white/70">
              Owners, agents and builders reach serious buyers and tenants. Every listing is
              reviewed before it goes live.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/post-property" className="btn btn-accent">
              <PlusIcon size={18} /> Post property
            </Link>
            <a
              href={whatsappLink(
                settings.whatsapp,
                'Hello NEXUS Estate, I would like to know more about a property.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn border border-white/25 text-white hover:bg-white/10"
            >
              <WhatsAppIcon size={18} /> Talk to an expert
            </a>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="inline-block rounded-xl bg-white px-3 py-2 shadow-sm"
            aria-label={`${settings.businessName} home`}
          >
            <Image
              src="/brand/nexus-logo.png"
              alt="NEXUS Estate | Rentals | Properties"
              width={96}
              height={80}
            />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
            Homes and commercial spaces to buy and rent
            {cities.length ? ` in ${cities.map((c) => c.name).join(', ')}` : ''}. Every listing is
            reviewed before it goes live.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a
                href={`tel:${settings.phone}`}
                className="group inline-flex items-center gap-3 font-semibold text-white"
              >
                <span className="grid size-9 place-items-center rounded-full bg-white/10 text-accent ring-1 ring-white/15 group-hover:bg-accent group-hover:text-brand-900">
                  <PhoneIcon size={16} />
                </span>
                {formatIndianPhone(settings.phone)}
              </a>
            </li>
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="group inline-flex items-center gap-3 text-white/80 hover:text-white"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-white/10 text-accent ring-1 ring-white/15 group-hover:bg-accent group-hover:text-brand-900">
                    <MailIcon size={16} />
                  </span>
                  {settings.email}
                </a>
              </li>
            )}
            {settings.showAddress && settings.address.line1 && (
              <li className="flex items-start gap-3 text-white/70">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-accent ring-1 ring-white/15">
                  <MapPinIcon size={16} />
                </span>
                <address className="pt-1.5 not-italic">
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
            {settings.businessHours && (
              <li className="pl-12 text-xs text-white/55">{settings.businessHours}</li>
            )}
          </ul>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-2" aria-label="Social media">
              {socials.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={settings.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-accent hover:text-brand-900"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterLinks title="Explore" links={explore} />
        <FooterLinks title="Owners, agents & builders" links={partners} />
        <FooterLinks title="Company" links={company} />
      </div>

      {localities.length > 0 && (
        <div className="border-t border-white/10">
          <nav aria-label="Popular locations" className="container-page py-7">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
              Popular locations
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {localities.map((l) => (
                <li key={`${l.city.slug}-${l.slug}`}>
                  <Link
                    className="inline-block rounded-full bg-white/[0.06] px-3 py-1.5 text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/15 hover:text-white"
                    href={`/buy/${l.city.slug}/${l.slug}`}
                  >
                    Property in {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <div className="border-t border-white/10 bg-black/20">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.businessName}. All rights reserved.
          </p>
          <p className="sm:max-w-2xl sm:text-right">
            NEXUS Estate is a listing platform. Listing details are shared by owners, agents and
            builders and should be confirmed before any payment. For new projects, check the RERA
            registration on{' '}
            <a
              href="https://rera.rajasthan.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              rera.rajasthan.gov.in
            </a>{' '}
            before you book.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
        {title}
      </h2>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link
              className="group inline-flex items-center gap-1.5 text-white/75 transition-colors hover:text-white"
              href={href!}
            >
              <span className="h-px w-0 bg-accent transition-all group-hover:w-3" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
