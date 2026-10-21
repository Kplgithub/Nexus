import Link from 'next/link';
import Image from 'next/image';
import { formatIndianPhone, whatsappLink, type City, type SiteSettings } from '@nexus/shared';
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
  const localities = cities.flatMap((c) =>
    c.localities
      .filter((l) => (l.publishedCount ?? 0) > 0 || l.intro)
      .slice(0, 8)
      .map((l) => ({ ...l, city: c })),
  );
  const socials = SOCIAL.filter((s) => settings.social[s.key]);

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Image
            src="/brand/nexus-logo.png"
            alt="NEXUS Estate | Rentals | Properties"
            width={130}
            height={108}
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
            Homes and commercial spaces to buy and rent
            {cities.length ? ` in ${cities.map((c) => c.name).join(', ')}` : ''}. Every listing is
            reviewed before it goes live.
          </p>
          {socials.length > 0 && (
            <ul className="mt-5 flex gap-2" aria-label="Social media">
              {socials.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={settings.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-line bg-white text-brand hover:border-brand"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Explore">
          <h2 className="font-sans text-sm font-semibold text-ink">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ['/buy', 'Property for sale'],
              ['/rent', 'Property for rent'],
              ['/commercial', 'Commercial property'],
              ['/properties', 'All properties'],
              ['/locations', 'Browse by location'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link className="text-ink-soft hover:text-brand" href={href!}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-sans text-sm font-semibold text-ink">
            Owners, agents &amp; builders
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/post-property">
                Post property free
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/dashboard">
                My dashboard
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="font-sans text-sm font-semibold text-ink">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/about">
                About NEXUS
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/faq">
                FAQs
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/privacy-policy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/terms-and-conditions">
                Terms &amp; conditions
              </Link>
            </li>
            <li>
              <Link className="text-ink-soft hover:text-brand" href="/cookie-policy">
                Cookie policy
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold text-ink">Talk to us</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-2 font-semibold text-brand-800 hover:text-brand"
              >
                <PhoneIcon size={18} /> {formatIndianPhone(settings.phone)}
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
                className="inline-flex items-center gap-2 text-ink-soft hover:text-brand"
              >
                <WhatsAppIcon size={18} /> WhatsApp us
              </a>
            </li>
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 text-ink-soft hover:text-brand"
                >
                  <MailIcon size={18} /> {settings.email}
                </a>
              </li>
            )}
            {settings.showAddress && settings.address.line1 && (
              <li className="flex gap-2 text-ink-soft">
                <MapPinIcon size={18} className="mt-0.5 shrink-0" />
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
            {settings.businessHours && <li className="text-ink-muted">{settings.businessHours}</li>}
          </ul>
        </div>
      </div>

      {localities.length > 0 && (
        <div className="border-t border-line">
          <nav aria-label="Popular locations" className="container-page py-6">
            <h2 className="sr-only">Popular locations</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {localities.map((l) => (
                <li key={`${l.city.slug}-${l.slug}`}>
                  <Link
                    className="text-ink-muted hover:text-brand"
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

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.businessName}. All rights reserved.
          </p>
          <p>
            Listing details are shared by owners, agents and builders and should be confirmed before
            any payment.
          </p>
        </div>
      </div>
    </footer>
  );
}
