import Image from 'next/image';
import Link from 'next/link';
import { Carousel } from '@/components/Carousel';
import { Collections } from '@/components/home/Collections';
import { PriceTable } from '@/components/home/PriceTable';
import { WhyNexus } from '@/components/home/WhyNexus';
import type { Metadata } from 'next';
import { USER_ROLE_LABELS, whatsappLink, type PropertyCard as Card } from '@nexus/shared';
import { getFaqs, getHome, getLocations, getSettings } from '@/lib/api';
import { pageMetadata, websiteJsonLd } from '@/lib/seo';
import { HeroSearch } from '@/components/search/HeroSearch';
import { PropertyCard } from '@/components/property/PropertyCard';
import { ProjectGrid } from '@/components/project/ProjectCard';
import { FaqList, JsonLd, faqJsonLd } from '@/components/ui';
import { JaipurFacade } from '@/components/art/JaipurFacade';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import {
  ArrowRight,
  BadgeCheckIcon,
  BedDoubleIcon,
  BriefcaseIcon,
  BuildingIcon,
  CraneIcon,
  HomeIcon,
  KeyIcon,
  MapPinIcon,
  PlotIcon,
  PhoneIcon,
  PlusIcon,
  CalculatorIcon,
  ChatIcon,
  ClockIcon,
  SparklesIcon,
  TrendingUpIcon,
  WhatsAppIcon,
} from '@/components/icons';

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

/** Hawa Mahal, Jaipur (Unsplash License). Admins can set their own in Settings. */
const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=2000&q=75&auto=format&fit=crop';

const CATEGORIES = [
  { href: '/buy', label: 'Buy', hint: 'Flats, houses, villas', Icon: HomeIcon },
  { href: '/rent', label: 'Rent', hint: 'Homes to rent', Icon: KeyIcon },
  { href: '/projects', label: 'New projects', hint: 'RERA, price lists', Icon: CraneIcon },
  {
    href: '/rent?propertyType=pg',
    label: 'PG & co-living',
    hint: 'Beds with meals',
    Icon: BedDoubleIcon,
  },
  { href: '/buy?propertyType=plot', label: 'Plots', hint: 'JDA approved & more', Icon: PlotIcon },
  { href: '/commercial', label: 'Commercial', hint: 'Offices, shops', Icon: BuildingIcon },
  {
    href: '/post-property',
    label: 'Post property',
    hint: 'Free for owners',
    Icon: PlusIcon,
    accent: true,
  },
];

const TOOLS = [
  {
    title: 'AI smart search',
    text: 'Type it the way you would say it, like "2 BHK under 25k in Malviya Nagar". We turn it into the right filters.',
    href: '/buy',
    cta: 'Try it above',
    Icon: SparklesIcon,
  },
  {
    title: 'Map search',
    text: 'See every listing on the map and compare neighbourhoods before you visit.',
    href: '/buy?view=map',
    cta: 'Open the map',
    Icon: MapPinIcon,
  },
  {
    title: 'Locality insights',
    text: 'Average prices, rents and nearby schools, hospitals and markets for each area.',
    href: '/locations',
    cta: 'Explore areas',
    Icon: TrendingUpIcon,
  },
  {
    title: 'EMI calculator',
    text: 'Every home for sale shows the monthly EMI. Adjust down payment, rate and tenure.',
    href: '/buy',
    cta: 'Browse homes',
    Icon: CalculatorIcon,
  },
];

const ASSIST = [
  { Icon: ClockIcon, title: 'Quick callback', text: 'A real person calls you, not a bot.' },
  { Icon: BadgeCheckIcon, title: 'Reviewed listings', text: 'Only options our team has checked.' },
  { Icon: KeyIcon, title: 'Visit support', text: 'We help you plan site visits.' },
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

      {/* Hero: compact, search first */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <Image
          src={settings.home.heroImageUrl || HERO_FALLBACK}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-25 mix-blend-luminosity"
        />
        <div className="nx-aurora" aria-hidden />
        <div className="nx-grid" aria-hidden />
        <div className="container-page pb-8 pt-7 sm:pb-10 sm:pt-9">
          <div className="mx-auto max-w-3xl text-center">
            <p className="nx-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/90">
              <SparklesIcon size={14} className="text-accent" />
              <span className="nx-ai-text font-bold">NEXUS AI search</span>
              <span className="hidden text-white/60 sm:inline">· just type what you need</span>
            </p>
            <h1 className="mt-3 text-[1.75rem] leading-[1.1] sm:text-[2.25rem] lg:text-[2.6rem]">
              {settings.home.heroHeadline}
            </h1>
            <p className="mx-auto mt-2 hidden max-w-2xl text-[0.95rem] text-white/70 md:block">
              {settings.home.heroSubheadline}
            </p>
          </div>
          <div className="mx-auto mt-5 max-w-4xl sm:mt-6">
            <HeroSearch cities={cities} />
          </div>
          <dl className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/75">
            {home.counts.sale > 0 && (
              <div>
                <dt className="sr-only">For sale</dt>
                <dd>
                  <Link href="/buy" className="hover:text-white">
                    <span className="tabular font-semibold text-white">{home.counts.sale}</span> for
                    sale
                  </Link>
                </dd>
              </div>
            )}
            {home.counts.rent > 0 && (
              <div>
                <dt className="sr-only">For rent</dt>
                <dd>
                  <Link href="/rent" className="hover:text-white">
                    <span className="tabular font-semibold text-white">{home.counts.rent}</span> for
                    rent
                  </Link>
                </dd>
              </div>
            )}
            {home.projects.length > 0 && (
              <div>
                <dt className="sr-only">New projects</dt>
                <dd>
                  <Link href="/projects" className="hover:text-white">
                    <span className="tabular font-semibold text-white">{home.projects.length}</span>{' '}
                    new {home.projects.length === 1 ? 'project' : 'projects'}
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Quality</dt>
              <dd className="flex items-center gap-1.5">
                <BadgeCheckIcon size={16} className="text-accent" />
                Every listing reviewed before it goes live
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Quick categories */}
      <section aria-label="Browse by category" className="border-b border-line bg-white">
        <div className="container-page">
          <ul className="nx-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 py-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
            {CATEGORIES.map(({ href, label, hint, Icon, accent }) => (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  className={`nx-lift group flex h-full w-32 flex-col gap-2.5 rounded-2xl border p-3 sm:w-auto sm:gap-3 sm:p-4 ${
                    accent
                      ? 'border-transparent bg-gradient-to-br from-brand to-brand-800 text-white'
                      : 'border-line bg-white hover:border-brand-100'
                  }`}
                >
                  <span
                    className={`grid size-9 place-items-center rounded-xl sm:size-10 ${
                      accent
                        ? 'bg-white/15 text-white'
                        : 'bg-brand-50 text-brand group-hover:bg-brand group-hover:text-white'
                    } transition-colors`}
                  >
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="block text-[0.9375rem] font-semibold leading-tight">
                      {label}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${accent ? 'text-white/75' : 'text-ink-muted'}`}
                    >
                      {hint}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Collections city={singleCity?.slug} />

      {/* Featured */}
      {settings.home.showFeatured && home.featured.length > 0 && (
        <Rail
          id="featured"
          title="Featured"
          text="Selected by our team for location, condition and value."
          href="/properties"
          linkLabel="All properties"
          items={home.featured.slice(0, 12)}
        />
      )}

      {home.projects.length > 0 && (
        <section className="py-14 sm:py-16" aria-labelledby="projects-heading">
          <div className="container-page">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2
                  id="projects-heading"
                  className="text-[1.75rem] leading-tight sm:text-[2.15rem]"
                >
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
          items={home.recentSale.slice(0, 12)}
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
          items={home.recentRent.slice(0, 12)}
        />
      )}

      {/* Smart tools */}
      <section className="py-16 sm:py-20" aria-labelledby="tools-heading">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700">
              <SparklesIcon size={16} /> Smarter property search
            </p>
            <h2 id="tools-heading" className="mt-2 text-[1.9rem] leading-tight sm:text-[2.3rem]">
              Tools that do the homework for you
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map(({ title, text, href, cta, Icon }) => (
              <li key={title}>
                <Link
                  href={href}
                  className="nx-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-6"
                >
                  <span
                    className="absolute -right-10 -top-10 size-32 rounded-full bg-accent-50 transition-transform duration-500 group-hover:scale-125"
                    aria-hidden
                  />
                  <span className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-brand text-white shadow-md">
                    <Icon size={22} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-semibold">{title}</h3>
                  <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">
                    {text}
                  </p>
                  <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    {cta}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {singleCity && <PriceTable city={singleCity} />}

      {/* Localities */}
      {singleCity && localityList.length > 0 && (
        <section className="bg-surface py-16 sm:py-20" aria-labelledby="loc-heading">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_2.2fr]">
            <div>
              <h2 id="loc-heading" className="text-[1.75rem] leading-tight sm:text-[2.15rem]">
                Explore {singleCity.name} by neighbourhood
              </h2>
              {singleCity.intro && <p className="mt-4 text-ink-soft">{singleCity.intro}</p>}
              <Link href="/locations" className="btn btn-outline mt-6">
                See all localities
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {localityList.map((l) => (
                <li key={l.slug}>
                  <div className="nx-lift group relative flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
                    <div className="min-w-0">
                      <Link
                        href={`/buy/${singleCity.slug}/${l.slug}`}
                        className="font-semibold after:absolute after:inset-0 hover:text-brand"
                      >
                        {l.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {l.publishedCount
                          ? `${l.publishedCount} ${l.publishedCount === 1 ? 'listing' : 'listings'}`
                          : 'Listings coming soon'}
                      </p>
                    </div>
                    <span className="relative z-10 flex shrink-0 gap-1.5 text-xs font-semibold">
                      <Link
                        href={`/buy/${singleCity.slug}/${l.slug}`}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-brand hover:bg-brand hover:text-white"
                      >
                        Buy
                      </Link>
                      <Link
                        href={`/rent/${singleCity.slug}/${l.slug}`}
                        className="rounded-full bg-accent-50 px-2.5 py-1 text-accent-700 hover:bg-accent hover:text-ink"
                      >
                        Rent
                      </Link>
                    </span>
                  </div>
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

      <WhyNexus />

      {/* FAQs */}

      {faqs.length > 0 && (
        <section className="bg-surface py-16 sm:py-20" aria-labelledby="faq-heading">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.7fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700">
                <ChatIcon size={16} /> FAQs
              </p>
              <h2 id="faq-heading" className="mt-2 text-[1.9rem] leading-tight sm:text-[2.3rem]">
                Questions, answered
              </h2>
              <p className="mt-3 max-w-sm text-ink-soft">
                Everything about buying, renting and posting property on NEXUS Estate.
              </p>
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-brand to-brand-900 p-6 text-white shadow-[var(--shadow-lift)]">
                <p className="font-semibold">Still have a question?</p>
                <p className="mt-1 text-sm text-white/75">
                  Our Jaipur team is happy to help, on call or WhatsApp.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={`tel:${settings.phone}`}
                    className="btn btn-sm bg-white text-brand-900 hover:bg-brand-50"
                  >
                    <PhoneIcon size={16} /> Call us
                  </a>
                  <a
                    href={whatsappLink(
                      settings.whatsapp,
                      'Hello NEXUS Estate, I have a question about a property.',
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1ebe5a]"
                  >
                    <WhatsAppIcon size={16} /> WhatsApp
                  </a>
                </div>
              </div>
              <Link
                href="/faq"
                className="mt-6 inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                See all FAQs <ArrowRight size={16} />
              </Link>
            </div>
            <FaqList faqs={faqs} />
          </div>
        </section>
      )}

      {/* Callback */}
      <section className="container-page pb-4 pt-6" aria-labelledby="cta-heading">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-brand-900 text-white">
          <div className="nx-aurora opacity-80" aria-hidden />
          <div className="nx-grid" aria-hidden />
          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:p-14">
            <div>
              <p className="nx-glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <SparklesIcon size={14} className="text-accent" /> Free property assistance
              </p>
              <h2 id="cta-heading" className="mt-4 text-[2rem] leading-tight sm:text-[2.6rem]">
                Not finding the right fit?{' '}
                <span className="nx-ai-text">We&apos;ll find it for you.</span>
              </h2>
              <p className="mt-4 max-w-md text-white/75">
                Share your budget, preferred area and timeline. A NEXUS property expert will call
                you back with handpicked options.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {ASSIST.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-accent ring-1 ring-white/15">
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block text-xs leading-relaxed text-white/65">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5 text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:p-7">
              <h3 className="text-lg font-semibold">Request a free callback</h3>
              <p className="mb-5 mt-1 text-sm text-ink-muted">
                Usually within one working day. No spam, ever.
              </p>
              <EnquiryForm type="general" sourcePage="/" submitLabel="Request a callback" compact />
            </div>
          </div>
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
    <section
      className={`py-14 sm:py-16 ${tinted ? 'bg-surface' : ''}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="container-page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id={`${id}-heading`} className="text-[1.75rem] leading-tight sm:text-[2.15rem]">
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
        <Carousel label={title}>
          {items.map((p, i) => (
            <PropertyCard key={p.id} p={p} index={i} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
