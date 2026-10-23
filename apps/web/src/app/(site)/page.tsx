import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { USER_ROLE_LABELS, type PropertyCard as Card } from '@nexus/shared';
import { getFaqs, getHome, getLocations, getSettings } from '@/lib/api';
import { pageMetadata, websiteJsonLd } from '@/lib/seo';
import { HeroSearch } from '@/components/search/HeroSearch';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { ProjectGrid } from '@/components/project/ProjectCard';
import { FaqList, JsonLd, faqJsonLd } from '@/components/ui';
import { JaipurFacade } from '@/components/art/JaipurFacade';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { ArrowRight, BadgeCheckIcon, BriefcaseIcon, CraneIcon, HomeIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const cities = await getLocations();
  const where = cities.length === 1 ? ` in ${cities[0]!.name}` : '';
  return pageMetadata({
    title: `NEXUS Estate | Property to Buy and Rent${where}`,
    description: `Flats, houses, villas, plots, offices and shops for sale and rent${where}. Every listing is reviewed before it goes live. Owners, agents and builders can post property free.`,
    path: '/',
  });
}

const POSTERS = [
  {
    role: 'individual' as const,
    Icon: HomeIcon,
    title: 'Owners',
    text: 'List a flat, house or shop you own — for sale or for rent. Your number stays hidden until you choose to show it.',
  },
  {
    role: 'agent' as const,
    Icon: BriefcaseIcon,
    title: 'Agents',
    text: 'Manage every client listing from one dashboard and receive enquiries as leads you can follow up.',
  },
  {
    role: 'builder' as const,
    Icon: CraneIcon,
    title: 'Builders',
    text: 'Showcase projects with RERA details, possession dates and floor-wise pricing for buyers to compare.',
  },
];

const REVIEW_STEPS = [
  ['Post', 'Add photos, price and details from your dashboard. Takes about ten minutes.'],
  ['Review', 'Our team checks the listing for accuracy before it is published.'],
  ['Go live', 'Buyers and tenants find it in search and contact you directly.'],
] as const;

export default async function HomePage() {
  const [settings, home, cities, faqs] = await Promise.all([
    getSettings(),
    getHome(),
    getLocations(),
    getFaqs({ home: true }),
  ]);
  const singleCity = cities.length === 1 ? cities[0] : undefined;
  const localityList = (singleCity?.localities ?? [])
    .slice()
    .sort(
      (a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0) || a.name.localeCompare(b.name),
    )
    .slice(0, 12);

  return (
    <>
      <JsonLd data={[websiteJsonLd(settings), ...(faqs.length ? [faqJsonLd(faqs)] : [])]} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <Image
          src={settings.home.heroImageUrl || '/images/hero-skyline.jpg'}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(1,42,51,0.55)_0%,rgba(1,42,51,0.85)_55%,#012a33_100%)]" />
        <div className="container-page pb-16 pt-16 sm:pb-24 sm:pt-24">
          <div className="max-w-3xl">
            {singleCity && (
              <p className="text-sm font-medium text-accent-100">
                Now listing in {singleCity.name}
              </p>
            )}
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-[3.6rem] lg:text-[4.25rem]">
              {settings.home.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              {settings.home.heroSubheadline}
            </p>
          </div>
          <div className="mt-12 max-w-5xl">
            <HeroSearch cities={cities} />
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/75">
            {home.counts.sale > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="sr-only">For sale</dt>
                <dd>
                  <Link href="/buy" className="hover:text-white">
                    <span className="tabular font-display text-2xl text-white">
                      {home.counts.sale}
                    </span>{' '}
                    {home.counts.sale === 1 ? 'property' : 'properties'} for sale
                  </Link>
                </dd>
              </div>
            )}
            {home.counts.rent > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="sr-only">For rent</dt>
                <dd>
                  <Link href="/rent" className="hover:text-white">
                    <span className="tabular font-display text-2xl text-white">
                      {home.counts.rent}
                    </span>{' '}
                    for rent
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex items-center gap-2">
              <BadgeCheckIcon size={18} className="text-accent" />
              Every listing reviewed before it goes live
            </div>
          </dl>
        </div>
      </section>

      {/* Featured */}
      {settings.home.showFeatured && home.featured.length > 0 && (
        <Rail
          id="featured"
          title="Featured"
          text="Selected by our team for location, condition and value."
          href="/properties"
          linkLabel="All properties"
          items={home.featured.slice(0, 6)}
        />
      )}

      {home.projects.length > 0 && (
        <section className="py-20" aria-labelledby="projects-heading">
          <div className="container-page">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="projects-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
                  New projects{singleCity ? ` in ${singleCity.name}` : ''}
                </h2>
                <p className="mt-2 text-ink-soft">
                  Builder projects with RERA details, floor plans and price lists.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                All new projects <ArrowRight size={16} />
              </Link>
            </div>
            <ProjectGrid items={home.projects.slice(0, 6)} />
          </div>
        </section>
      )}

      {settings.home.showRecent && home.recentSale.length > 0 && (
        <Rail
          id="sale"
          title="New to buy"
          text="The latest homes and spaces listed for sale."
          href="/buy"
          linkLabel="Browse all for sale"
          items={home.recentSale.slice(0, 6)}
          tinted
        />
      )}

      {settings.home.showRecent && home.recentRent.length > 0 && (
        <Rail
          id="rent"
          title="New to rent"
          text="Fresh rentals, from furnished studios to ready offices."
          href="/rent"
          linkLabel="Browse all rentals"
          items={home.recentRent.slice(0, 6)}
        />
      )}

      {/* Localities */}
      {singleCity && localityList.length > 0 && (
        <section className="border-t border-line py-20" aria-labelledby="loc-heading">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 id="loc-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
                Explore {singleCity.name} by neighbourhood
              </h2>
              {singleCity.intro && <p className="mt-4 text-ink-soft">{singleCity.intro}</p>}
              <Link href="/locations" className="btn btn-outline mt-6">
                See all localities
              </Link>
            </div>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {localityList.map((l) => (
                <li
                  key={l.slug}
                  className="flex items-center justify-between border-b border-line py-3.5"
                >
                  <Link
                    href={`/buy/${singleCity.slug}/${l.slug}`}
                    className="font-medium hover:text-brand"
                  >
                    {l.name}
                  </Link>
                  <span className="flex gap-4 text-sm">
                    <Link
                      href={`/buy/${singleCity.slug}/${l.slug}`}
                      className="text-brand hover:underline"
                    >
                      Buy
                    </Link>
                    <Link
                      href={`/rent/${singleCity.slug}/${l.slug}`}
                      className="text-brand hover:underline"
                    >
                      Rent
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Post property */}
      <section
        className="relative isolate overflow-hidden bg-brand-900 py-20 text-white"
        aria-labelledby="post-heading"
      >
        <JaipurFacade
          className="absolute inset-x-0 bottom-0 -z-10 h-2/3 w-full text-accent"
          opacity={0.12}
        />
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <h2 id="post-heading" className="text-[2.2rem] leading-tight sm:text-[2.75rem]">
                Have property to sell or rent out? List it free.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/75">
                Create an account as an owner, agent or builder and post from your own dashboard.
                Enquiries come straight to you.
              </p>
            </div>
            <ol className="grid gap-6 sm:grid-cols-3">
              {REVIEW_STEPS.map(([title, text], i) => (
                <li key={title} className="border-t border-white/20 pt-4">
                  <p className="tabular text-sm text-accent-100">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <ul className="mt-14 grid gap-4 md:grid-cols-3">
            {POSTERS.map(({ role, Icon, title, text }) => (
              <li key={role}>
                <Link
                  href={`/signup?role=${role}&next=${encodeURIComponent('/dashboard/listings/new')}`}
                  className="group flex h-full flex-col rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
                >
                  <Icon size={26} className="text-accent" />
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 flex-1 text-white/70">{text}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-100">
                    Sign up as{' '}
                    {role === 'individual' ? 'owner' : USER_ROLE_LABELS[role].toLowerCase()}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="container-page py-20" aria-labelledby="faq-heading">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <h2 id="faq-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
                Questions, answered
              </h2>
              <p className="mt-3 text-ink-soft">
                More about buying, renting and posting on NEXUS Estate.
              </p>
              <Link
                href="/faq"
                className="mt-5 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                All FAQs <ArrowRight size={16} />
              </Link>
            </div>
            <FaqList faqs={faqs} />
          </div>
        </section>
      )}

      {/* Callback */}
      <section className="container-page pb-8" aria-labelledby="cta-heading">
        <div className="grid gap-10 rounded-[1.5rem] bg-surface p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 id="cta-heading" className="text-[2rem] leading-tight">
              Not finding the right fit?
            </h2>
            <p className="mt-3 text-lg text-ink-soft">
              Tell us your budget, preferred area and timeline. Our team will call you back with
              options.
            </p>
          </div>
          <EnquiryForm type="general" sourcePage="/" submitLabel="Request a callback" compact />
        </div>
      </section>
    </>
  );
}

function Rail({
  id,
  title,
  text,
  href,
  linkLabel,
  items,
  tinted,
}: {
  id: string;
  title: string;
  text: string;
  href: string;
  linkLabel: string;
  items: Card[];
  tinted?: boolean;
}) {
  return (
    <section className={`py-20 ${tinted ? 'bg-surface' : ''}`} aria-labelledby={`${id}-heading`}>
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id={`${id}-heading`} className="text-[2rem] leading-tight sm:text-[2.4rem]">
              {title}
            </h2>
            <p className="mt-2 text-ink-soft">{text}</p>
          </div>
          <Link
            href={href}
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            {linkLabel} <ArrowRight size={16} />
          </Link>
        </div>
        <PropertyGrid items={items} />
      </div>
    </section>
  );
}
