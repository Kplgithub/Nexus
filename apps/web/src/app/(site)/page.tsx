import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { whatsappLink } from '@nexus/shared';
import { getFaqs, getHome, getLocations, getSettings } from '@/lib/api';
import { pageMetadata, websiteJsonLd } from '@/lib/seo';
import { HeroSearch } from '@/components/search/HeroSearch';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { FaqList, JsonLd, SectionHeading, faqJsonLd } from '@/components/ui';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import {
  ArrowRight,
  BuildingIcon,
  ChatIcon,
  HomeIcon,
  KeyIcon,
  MapPinIcon,
  SearchIcon,
  ShieldIcon,
  WarehouseIcon,
  WhatsAppIcon,
  CalendarIcon,
  LayersIcon,
} from '@/components/icons';

export const metadata: Metadata = pageMetadata({
  title: 'NEXUS Estate | Residential & Commercial Rentals in Jaipur',
  description:
    'Find flats, houses, villas, offices, shops and showrooms for rent in Jaipur. Search listings by locality and budget, and talk to the NEXUS Estate team.',
  path: '/',
});

const WHY = [
  {
    Icon: ShieldIcon,
    title: 'Listings we review first',
    text: 'Every property is checked by our team before it is published, and owner details stay private.',
  },
  {
    Icon: ChatIcon,
    title: 'One team to talk to',
    text: 'Call or message us for visits, questions and negotiation — you won’t be passed between strangers.',
  },
  {
    Icon: LayersIcon,
    title: 'Homes and business spaces',
    text: 'Apartments, independent houses and villas alongside offices, shops and showrooms in one place.',
  },
  {
    Icon: MapPinIcon,
    title: 'Local focus',
    text: 'We work locality by locality, so our suggestions reflect how each neighbourhood actually lives and trades.',
  },
];

const STEPS = [
  {
    Icon: SearchIcon,
    title: 'Search or tell us',
    text: 'Browse by locality, budget and type — or share your requirement and we’ll shortlist for you.',
  },
  {
    Icon: CalendarIcon,
    title: 'Visit',
    text: 'We confirm availability with the owner and arrange visits at a time that suits you.',
  },
  {
    Icon: ChatIcon,
    title: 'Agree terms',
    text: 'We help you understand rent, deposit, maintenance and lock-in before anything is signed.',
  },
  {
    Icon: KeyIcon,
    title: 'Move in',
    text: 'Finalise the paperwork with the owner and collect your keys.',
  },
];

export default async function HomePage() {
  const [settings, home, cities, faqs] = await Promise.all([
    getSettings(),
    getHome(),
    getLocations(),
    getFaqs({ home: true }),
  ]);
  const city = cities[0];
  const topLocalities = (city?.localities ?? [])
    .filter((l) => (l.publishedCount ?? 0) > 0 || l.intro)
    .sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
    .slice(0, 8);

  return (
    <>
      <JsonLd data={[websiteJsonLd(settings), ...(faqs.length ? [faqJsonLd(faqs)] : [])]} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-800">
        <Image
          src={settings.home.heroImageUrl || '/images/hero-skyline.jpg'}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-800/40 via-brand-800/70 to-brand-800" />
        <div className="container-page pb-12 pt-16 sm:pt-24">
          <div className="max-w-3xl">
            <p className="eyebrow !text-accent-100">Rentals · {city?.name ?? 'Jaipur'}</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem]">
              {settings.home.heroHeadline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
              {settings.home.heroSubheadline}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/properties" className="btn btn-accent">
                Explore Properties <ArrowRight size={18} />
              </Link>
              <Link
                href="/list-your-property"
                className="btn border border-white/40 text-white hover:bg-white/10"
              >
                List Your Property
              </Link>
            </div>
          </div>
          <div className="mt-10">
            <HeroSearch cities={cities} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16" aria-labelledby="cat-heading">
        <SectionHeading id="cat-heading" eyebrow="Browse" title="What are you looking for?" />
        <div className="grid gap-5 md:grid-cols-3">
          <CategoryTile
            href="/residential"
            Icon={HomeIcon}
            title="Residential Rentals"
            text="Apartments, builder floors, independent houses, villas and furnished homes."
          />
          <CategoryTile
            href="/commercial"
            Icon={BuildingIcon}
            title="Commercial Rentals"
            text="Offices, retail shops, showrooms, co-working and commercial buildings."
          />
          <div className="card flex flex-col bg-surface p-6 opacity-90">
            <WarehouseIcon size={30} className="text-ink-muted" />
            <h3 className="mt-4 text-xl font-semibold">Industrial Rentals</h3>
            <p className="mt-2 flex-1 text-ink-soft">
              Warehouses and sheds — coming soon. Tell us your requirement and we’ll help.
            </p>
            <Link
              href="/contact?topic=industrial"
              className="mt-4 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              Share a requirement <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {settings.home.showFeatured && home.featured.length > 0 && (
        <section className="bg-surface py-16" aria-labelledby="featured-heading">
          <div className="container-page">
            <SectionHeading
              id="featured-heading"
              eyebrow="Handpicked"
              title="Featured properties"
              action={
                <Link href="/properties" className="btn btn-outline">
                  View all
                </Link>
              }
            />
            <PropertyGrid items={home.featured.slice(0, 6)} />
          </div>
        </section>
      )}

      {/* Recent */}
      {settings.home.showRecent && home.recent.length > 0 && (
        <section className="container-page py-16" aria-labelledby="recent-heading">
          <SectionHeading
            id="recent-heading"
            eyebrow="Just listed"
            title="Recently added"
            action={
              <Link href="/properties" className="btn btn-outline">
                See all listings
              </Link>
            }
          />
          <PropertyGrid items={home.recent.slice(0, 6)} />
        </section>
      )}

      {/* Locations */}
      {city && topLocalities.length > 0 && (
        <section className="container-page py-16" aria-labelledby="loc-heading">
          <SectionHeading
            id="loc-heading"
            eyebrow="Neighbourhoods"
            title={`Browse rentals across ${city.name}`}
            action={
              <Link href={`/rentals/${city.slug}`} className="btn btn-outline">
                All {city.name} locations
              </Link>
            }
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topLocalities.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/rentals/${city.slug}/${l.slug}`}
                  className="card flex items-center justify-between gap-3 p-4 hover:border-brand"
                >
                  <span className="flex items-center gap-2.5 font-semibold">
                    <MapPinIcon size={18} className="text-brand" /> {l.name}
                  </span>
                  {(l.publishedCount ?? 0) > 0 && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                      {l.publishedCount} {l.publishedCount === 1 ? 'listing' : 'listings'}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Why */}
      <section className="bg-brand-800 py-16 text-white" aria-labelledby="why-heading">
        <div className="container-page">
          <p className="eyebrow !text-accent-100">Why NEXUS</p>
          <h2 id="why-heading" className="mt-2 max-w-2xl text-3xl font-bold sm:text-[2.125rem]">
            Renting is a big decision. We keep it straightforward.
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="rounded-[var(--radius-card)] border border-white/15 bg-white/5 p-6"
              >
                <Icon size={28} className="text-accent" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-white/80">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="container-page py-16" aria-labelledby="process-heading">
        <SectionHeading id="process-heading" eyebrow="How it works" title="Our rental process" />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-accent-50 font-display text-lg font-bold text-brand-800">
                  {i + 1}
                </span>
                <Icon size={22} className="text-brand" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Services */}
      <section className="bg-surface py-16" aria-labelledby="services-heading">
        <div className="container-page">
          <SectionHeading
            id="services-heading"
            eyebrow="Services"
            title="Residential and commercial rentals"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card p-7">
              <HomeIcon size={28} className="text-brand" />
              <h3 className="mt-4 text-xl font-semibold">For families and professionals</h3>
              <p className="mt-2 text-ink-soft">
                Whether you need a furnished 1 BHK near work, a family flat close to schools, or an
                independent house with parking, we shortlist homes that match your budget and
                routine — and arrange visits around your schedule.
              </p>
              <Link
                href="/residential"
                className="mt-5 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                Residential rentals <ArrowRight size={16} />
              </Link>
            </article>
            <article className="card p-7">
              <BuildingIcon size={28} className="text-brand" />
              <h3 className="mt-4 text-xl font-semibold">For businesses</h3>
              <p className="mt-2 text-ink-soft">
                From a retail shop with street frontage to a ready-to-move office for a growing
                team, we help you compare location, carpet area, power backup, parking and lock-in
                terms before you commit.
              </p>
              <Link
                href="/commercial"
                className="mt-5 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                Commercial rentals <ArrowRight size={16} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Owners */}
      <section className="container-page py-16" aria-labelledby="owners-heading">
        <div className="grid items-center gap-8 overflow-hidden rounded-[1.25rem] bg-accent-50 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow">For property owners</p>
            <h2 id="owners-heading" className="mt-2 text-3xl font-bold">
              Have a property to rent out?
            </h2>
            <p className="mt-3 max-w-xl text-lg text-ink-soft">
              Share a few details and our team will get in touch to understand your property, agree
              how it should be presented, and connect you with suitable tenants. Your phone number
              is never published.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/list-your-property" className="btn btn-primary">
              List Your Property
            </Link>
            <a
              href={whatsappLink(
                settings.whatsapp,
                'Hello NEXUS Estate, I want to list my property for rent.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <WhatsAppIcon size={18} /> WhatsApp us
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="container-page py-16" aria-labelledby="faq-heading">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="eyebrow">FAQs</p>
              <h2 id="faq-heading" className="mt-2 text-3xl font-bold">
                Questions people ask us
              </h2>
              <p className="mt-3 text-ink-soft">Can’t find what you need?</p>
              <Link
                href="/faq"
                className="mt-4 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                All FAQs <ArrowRight size={16} />
              </Link>
            </div>
            <FaqList faqs={faqs} />
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="container-page py-8" aria-labelledby="cta-heading">
        <div className="grid gap-10 rounded-[1.25rem] border border-line bg-white p-8 shadow-card sm:p-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Talk to our team</p>
            <h2 id="cta-heading" className="mt-2 text-3xl font-bold">
              Tell us what you’re looking for
            </h2>
            <p className="mt-3 text-lg text-ink-soft">
              Share your budget, preferred locality and timeline. We’ll call you back with options
              that fit.
            </p>
          </div>
          <EnquiryForm type="general" sourcePage="/" submitLabel="Request a callback" compact />
        </div>
      </section>
    </>
  );
}

function CategoryTile({
  href,
  Icon,
  title,
  text,
}: {
  href: string;
  Icon: typeof HomeIcon;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group card flex flex-col p-6 transition-shadow hover:border-brand hover:shadow-lift"
    >
      <Icon size={30} className="text-brand" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-ink-soft">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brand">
        Find a rental{' '}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
