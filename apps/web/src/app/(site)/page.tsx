import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { BlogPostCard, PropertyCard as Card, ProfileCard } from '@nexus/shared';
import { Carousel } from '@/components/Carousel';
import {
  AdviceTools,
  AgentsRail,
  BannerGrid,
  CitySnapshot,
  CountTiles,
  GuideSection,
  PostStrip,
  SectionHead,
  TILE_IMAGES,
  TopLocalities,
  WideBanners,
} from '@/components/home/HomeBlocks';
import { PropertyOptions } from '@/components/home/PropertyOptions';
import {
  getBlogPosts,
  getHome,
  getLocations,
  getSettings,
  listProfiles,
  searchProjects,
  searchProperties,
} from '@/lib/api';
import { pageMetadata, websiteJsonLd } from '@/lib/seo';
import { HeroSearch } from '@/components/search/HeroSearch';
import { PropertyCard } from '@/components/property/PropertyCard';
import { JsonLd } from '@/components/ui';
import { BadgeCheckIcon, SparklesIcon } from '@/components/icons';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cities = await getLocations();
  const where = cities.length === 1 ? ` in ${cities[0]!.name}` : '';
  // Keyword first, brand once: `absolute` skips the "%s | NEXUS Estate" template,
  // which used to give "NEXUS Estate | ... | NEXUS Estate".
  const title = where
    ? `Property${where}: Flats & Houses to Buy and Rent | NEXUS Estate`
    : 'NEXUS Estate | Buy, Rent & Sell Property';
  const meta = pageMetadata({
    title,
    description: `Flats, houses, villas, plots, offices and shops for sale and rent${where}. Every listing is reviewed before it goes live. Owners, agents and builders can list property here.`,
    path: '/',
  });
  return { ...meta, title: { absolute: title } };
}

/** Hawa Mahal, Jaipur (Unsplash License). Admins can set their own in Settings. */
const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=2000&q=75&auto=format&fit=crop';

/** Total matching listings for a query, or 0 if the API can't answer. */
async function total(qs: string) {
  try {
    return (await searchProperties(`${qs}&limit=1`)).meta.total;
  } catch {
    return 0;
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [settings, home, cities] = await Promise.all([getSettings(), getHome(), getLocations()]);
  const city = cities.length === 1 ? cities[0] : cities.find((c) => c.slug === 'jaipur');
  const cityName = city?.name ?? 'Jaipur';
  const citySlug = city?.slug ?? 'jaipur';

  const [ownerTotal, budgetTotal, projects, owners, agents, posts] = await Promise.all([
    total('postedBy=owner'),
    total('listingType=sale&maxPrice=5000000'),
    safe(() => searchProjects('limit=1'), { items: [], meta: { total: 0 } } as unknown as Awaited<
      ReturnType<typeof searchProjects>
    >),
    safe(() => searchProperties('postedBy=owner&limit=12&sort=newest'), {
      items: [] as Card[],
      meta: { total: 0 },
    } as unknown as Awaited<ReturnType<typeof searchProperties>>),
    safe(() => listProfiles('agent', 'limit=12'), {
      items: [] as ProfileCard[],
      meta: { total: 0 },
    } as unknown as Awaited<ReturnType<typeof listProfiles>>),
    safe(() => getBlogPosts('limit=7'), {
      items: [] as BlogPostCard[],
      meta: { total: 0 },
    } as unknown as Awaited<ReturnType<typeof getBlogPosts>>),
  ]);

  const banners = (settings.home.banners ?? []).filter((b) => b.active && b.imageUrl);
  const topBanner = banners.find((b) => b.placement === 'top');
  const middle = banners.filter((b) => b.placement === 'middle');
  const lower = banners.filter((b) => b.placement === 'lower');

  const fresh = [...home.recentSale, ...home.recentRent]
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 12);
  const projectTotal = projects.meta.total ?? 0;

  return (
    <>
      <JsonLd data={[websiteJsonLd(settings)]} />

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

      <CountTiles
        banner={topBanner}
        tiles={[
          {
            label: 'Owner properties',
            count: ownerTotal,
            href: '/buy?postedBy=owner',
            img: TILE_IMAGES.owner,
          },
          {
            label: 'New projects',
            count: projectTotal,
            href: '/projects',
            img: TILE_IMAGES.projects,
          },
          {
            label: 'Budget homes',
            count: budgetTotal,
            href: '/buy?maxPrice=5000000',
            img: TILE_IMAGES.budget,
          },
          {
            label: 'Homes for rent',
            count: home.counts.rent,
            href: '/rent',
            img: TILE_IMAGES.rent,
          },
        ]}
      />

      {owners.items.length > 0 && (
        <Rail
          id="owner"
          title="Popular owner properties"
          href="/buy?postedBy=owner"
          items={owners.items}
        />
      )}

      <AgentsRail agents={agents.items} cityName={cityName} />

      <WideBanners banners={middle} />

      {city && <TopLocalities city={city} />}

      {settings.home.showFeatured && home.featured.length > 0 && (
        <Rail
          id="featured"
          title={`Featured properties in ${cityName}`}
          href="/properties?featured=true"
          items={home.featured.slice(0, 12)}
        />
      )}

      <AdviceTools />

      <BannerGrid banners={lower} title="Offers & updates" />

      <GuideSection posts={posts.items} />

      {settings.home.showRecent && fresh.length > 0 && (
        <Rail
          id="fresh"
          title={`Fresh properties in ${cityName}`}
          href="/properties"
          items={fresh}
        />
      )}

      <CitySnapshot
        cityName={cityName}
        intro={city?.intro}
        stats={[
          { value: home.counts.sale, label: `Properties for sale in ${cityName}` },
          { value: home.counts.rent, label: `Properties for rent in ${cityName}` },
          { value: agents.meta.total ?? agents.items.length, label: `Agents in ${cityName}` },
          { value: projectTotal, label: `New projects in ${cityName}` },
        ]}
      />

      <PostStrip />

      <PropertyOptions city={citySlug} cityName={cityName} />
    </>
  );
}

function Rail({
  id,
  title,
  href,
  items,
}: {
  id: string;
  title: string;
  href: string;
  items: Card[];
}) {
  return (
    <section className="py-8 sm:py-10" aria-labelledby={`${id}-heading`}>
      <div className="container-page">
        <SectionHead
          id={`${id}-heading`}
          title={title}
          href={href}
          linkLabel="See all properties"
        />
        <Carousel label={title}>
          {items.map((p, i) => (
            <PropertyCard key={p.id} p={p} index={i} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
