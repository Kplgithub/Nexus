import Image from 'next/image';
import Link from 'next/link';
import {
  formatINR,
  type BlogPostCard,
  type City,
  type HomeBanner,
  type ProfileCard,
} from '@nexus/shared';
import { getLocalityInsights } from '@/lib/api';
import { hrefOn, type SectionsOn } from '@/lib/sections';
import { Carousel } from '../Carousel';
import { JaipurFacade } from '../art/JaipurFacade';
import { Avatar } from '../profile/ProfilePages';
import { canOptimise, formatBlogDate } from '../blog/BlogCard';
import {
  ArrowRight,
  BadgeCheckIcon,
  CalculatorIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '../icons';

/* ---------------- Shared heading ---------------- */

export function SectionHead({
  id,
  title,
  eyebrow,
  sub,
  href,
  linkLabel = 'See all',
  light = false,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  sub?: string;
  href?: string;
  linkLabel?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
      <div className="max-w-2xl">
        {eyebrow && (
          <p
            className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${light ? 'text-accent-100' : 'text-accent-700'}`}
          >
            <span className="h-px w-6 bg-current" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2
          id={id}
          className={`mt-1 text-[1.6rem] leading-tight sm:text-[2rem] ${light ? 'text-white' : 'text-brand-900'}`}
        >
          {title}
        </h2>
        {sub && (
          <p className={`mt-1.5 text-sm sm:text-base ${light ? 'text-white/70' : 'text-ink-soft'}`}>
            {sub}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            light
              ? 'border-white/25 text-white hover:bg-white/10'
              : 'border-line bg-white text-brand hover:border-brand hover:bg-brand hover:text-white'
          }`}
        >
          {linkLabel} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

/** Slide widths for compact home rails: about 1.4 cards on phones, 5 on wide screens. */
export const SLIDE =
  'w-[70%] sm:w-[calc(33.333%-0.84rem)] lg:w-[calc(25%-0.94rem)] xl:w-[calc(20%-1rem)]';

const isExternal = (href: string) => /^https?:\/\//.test(href);

function SmartLink({
  href,
  className,
  children,
  label,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return isExternal(href) ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={label}
    >
      {children}
    </a>
  ) : (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

/* ---------------- Grids that stay full when a site section is off ---------------- */

const LG_COLS = ['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4'];

/** Large screens: one column per tile up to four. */
export const lgCols = (n: number) => LG_COLS[Math.min(Math.max(n, 1), 4)];

/** Two columns on phones: an odd last tile takes the whole row instead of leaving a hole. */
export const phoneSpan = (i: number, n: number) =>
  n % 2 === 1 && i === n - 1 ? 'col-span-2 lg:col-span-1' : '';

/* ---------------- Photo tiles with counts ---------------- */

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=700&h=520&fit=crop&q=70&auto=format`;

export type CountTile = {
  label: string;
  hint: string;
  count: number;
  unit: string;
  href: string;
  img: string;
};

export const TILE_IMAGES = {
  owner: u('1583847268964-b28dc8f51f92'),
  projects: u('1545324418-cc1a3fa10c00'),
  budget: u('1600596542815-ffad4c1539a9'),
  rent: u('1616594039964-ae9021a400a0'),
};

export function CountTiles({ tiles, banner }: { tiles: CountTile[]; banner?: HomeBanner }) {
  return (
    <section aria-label="Browse property" className="container-page pt-6 sm:pt-8">
      <ul className={`grid grid-cols-2 gap-2.5 sm:gap-4 ${lgCols(tiles.length)}`}>
        {tiles.map((t, i) => (
          <li key={t.label} className={phoneSpan(i, tiles.length)}>
            <Link
              href={t.href}
              className="nx-lift group flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2 sm:gap-3 sm:p-2.5"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:size-20">
                <Image
                  src={t.img}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="80px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="tabular block text-lg font-bold leading-none text-brand sm:text-xl">
                  {t.count.toLocaleString('en-IN')}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold leading-tight sm:text-base">
                  {t.label}
                </span>
                <span className="hidden truncate text-xs text-ink-muted sm:block">{t.hint}</span>
              </span>
              <ArrowRight
                size={18}
                className="mr-1.5 hidden shrink-0 text-ink-muted transition-transform sm:block group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </Link>
          </li>
        ))}
      </ul>
      {banner && (
        <SmartLink
          href={banner.link}
          label={banner.title || 'Offer'}
          className="nx-lift relative mt-4 block aspect-[16/4] overflow-hidden rounded-2xl bg-surface sm:aspect-[16/2.5]"
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            sizes="(min-width: 1280px) 1232px, 100vw"
            unoptimized={!canOptimise(banner.imageUrl)}
            className="object-cover"
          />
        </SmartLink>
      )}
    </section>
  );
}

/* ---------------- Agents ---------------- */

export function AgentsRail({ agents, cityName }: { agents: ProfileCard[]; cityName: string }) {
  if (!agents.length) return null;
  return (
    <section className="py-8 sm:py-10" aria-labelledby="agents-heading">
      <div className="container-page">
        <SectionHead
          id="agents-heading"
          eyebrow="Trusted partners"
          title={`Agents who know ${cityName}`}
          href="/agents"
          linkLabel="All agents"
        />
        <Carousel label="Preferred agents" slideClass={SLIDE}>
          {[
            ...agents.map((a) => (
              <Link
                key={a.id}
                href={`/agents/${a.slug}`}
                className="card nx-lift flex h-full flex-col overflow-hidden"
              >
                <span className="flex items-center gap-3 bg-brand-50 p-4">
                  <Avatar name={a.companyName || a.name} logoUrl={a.logoUrl} />
                  <span className="min-w-0">
                    {a.verified && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-accent-700">
                        <BadgeCheckIcon size={14} /> Verified agent
                      </span>
                    )}
                    <span className="block truncate font-semibold">{a.name}</span>
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-3 p-4">
                  {a.companyName && (
                    <span className="truncate text-sm font-medium text-ink-soft">
                      {a.companyName}
                    </span>
                  )}
                  <span className="mt-auto flex gap-6">
                    <span>
                      <span className="tabular block text-xl font-bold">{a.listings}</span>
                      <span className="text-xs text-ink-muted">Live listings</span>
                    </span>
                    {a.experienceYears ? (
                      <span>
                        <span className="tabular block text-xl font-bold">{a.experienceYears}</span>
                        <span className="text-xs text-ink-muted">Years experience</span>
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            )),
            <Link
              key="join"
              href="/signup?role=agent"
              className="group relative isolate flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-xl p-4 text-white"
            >
              <Image
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=520&fit=crop&q=70&auto=format"
                alt=""
                fill
                sizes="(min-width: 1280px) 240px, 70vw"
                className="-z-20 object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span
                className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-900/95 via-brand-900/70 to-brand-800/30"
                aria-hidden
              />
              <span>
                <span className="block font-semibold">Are you an agent?</span>
                <span className="mt-1 block text-sm text-white/85">
                  List your properties and get leads from buyers and tenants in {cityName}.
                </span>
              </span>
              <span className="mt-4 inline-flex items-center gap-1 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-ink">
                Join as agent <ArrowRight size={14} />
              </span>
            </Link>,
          ]}
        </Carousel>
      </div>
    </section>
  );
}

/* ---------------- Admin banners ---------------- */

export function WideBanners({ banners }: { banners: HomeBanner[] }) {
  if (!banners.length) return null;
  return (
    <section className="container-page grid gap-4 py-6" aria-label="Offers">
      {banners.map((b) => (
        <BannerCard key={b.id} b={b} wide />
      ))}
    </section>
  );
}

export function BannerGrid({ banners, title }: { banners: HomeBanner[]; title: string }) {
  if (!banners.length) return null;
  return (
    <section className="py-8 sm:py-10" aria-labelledby="updates-heading">
      <div className="container-page">
        <SectionHead id="updates-heading" eyebrow="Offers" title={title} />
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <BannerCard key={b.id} b={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BannerCard({ b, wide = false }: { b: HomeBanner; wide?: boolean }) {
  const hasText = Boolean(b.title || b.text || b.buttonLabel);
  return (
    <SmartLink
      href={b.link}
      label={b.title || undefined}
      className={`nx-lift group relative flex overflow-hidden rounded-2xl border border-line bg-white ${
        wide ? 'flex-col md:flex-row' : 'flex-col sm:flex-row'
      }`}
    >
      <span
        className={`relative block shrink-0 overflow-hidden bg-surface ${
          wide
            ? 'aspect-[16/7] md:aspect-auto md:w-[58%]'
            : 'aspect-[16/7] sm:aspect-auto sm:min-h-40 sm:w-[48%]'
        } ${hasText ? '' : 'w-full sm:w-full md:w-full'}`}
      >
        <Image
          src={b.imageUrl}
          alt={b.title}
          fill
          sizes={wide ? '(min-width: 768px) 60vw, 100vw' : '(min-width: 768px) 50vw, 100vw'}
          unoptimized={!canOptimise(b.imageUrl)}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </span>
      {hasText && (
        <span className="flex flex-1 flex-col justify-center gap-2 p-5 sm:p-6">
          {b.title && (
            <span className="text-lg font-semibold leading-snug sm:text-xl">{b.title}</span>
          )}
          {b.text && <span className="text-sm leading-relaxed text-ink-soft">{b.text}</span>}
          {b.buttonLabel && (
            <span className="btn btn-primary btn-sm mt-2 self-start">{b.buttonLabel}</span>
          )}
        </span>
      )}
    </SmartLink>
  );
}

/* ---------------- Top localities ---------------- */

export async function TopLocalities({ city, root = '/buy' }: { city: City; root?: string }) {
  const top = [...city.localities]
    .filter((l) => (l.publishedCount ?? 0) > 0)
    .sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
    .slice(0, 8);
  if (!top.length) return null;
  const insights = await Promise.all(top.map((l) => getLocalityInsights(city.slug, l.slug)));

  return (
    <section
      className="relative isolate overflow-hidden bg-brand-900 py-10 text-white sm:py-12"
      aria-labelledby="localities-heading"
      id="top-localities"
    >
      <div className="nx-aurora opacity-60" aria-hidden />
      <div className="nx-grid opacity-50" aria-hidden />
      <div className="container-page">
        <SectionHead
          id="localities-heading"
          eyebrow="Area guide"
          title={`${city.name}'s most searched areas`}
          sub="Price per sq ft and typical rent, worked out from live listings."
          light
        />
        <Carousel label="Top localities" slideClass={SLIDE}>
          {top.map((l, i) => {
            const rate = insights[i]?.sale.medianPricePerSqft;
            const rent = insights[i]?.rent.medianRent;
            const n = l.publishedCount ?? 0;
            return (
              <Link
                key={l.slug}
                href={`${root}?city=${city.slug}&locality=${l.slug}`}
                className="group flex h-full flex-col gap-3 rounded-xl bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/[0.12]"
              >
                <span className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-ink">
                    <MapPinIcon size={16} />
                  </span>
                  <span className="truncate font-semibold">{l.name}</span>
                </span>
                <span className="grid gap-2 border-t border-white/10 pt-3 text-sm">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-white/60">Per sq ft</span>
                    <span className="tabular font-semibold">{rate ? formatINR(rate) : '—'}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-white/60">Rent / month</span>
                    <span className="tabular font-semibold">{rent ? formatINR(rent) : '—'}</span>
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent-100">
                  {n} {n === 1 ? 'property' : 'properties'}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}

/* ---------------- Advice & tools ---------------- */

const TOOLS = [
  {
    title: 'AI search',
    text: 'Type what you need in your own words, in English or Hindi, and see matching homes.',
    href: '/search',
    Icon: SparklesIcon,
  },
  {
    title: 'Map search',
    text: 'See every listing on the map and compare areas before you visit.',
    href: '/buy?view=map',
    Icon: MapPinIcon,
  },
  {
    title: 'Rates & trends',
    text: 'Price per sq ft and typical rents in the busiest areas, from live listings.',
    href: '#top-localities',
    Icon: TrendingUpIcon,
  },
  {
    title: 'EMI on every home',
    text: 'Each home for sale shows the monthly EMI. Change down payment, rate and tenure.',
    href: '/buy',
    Icon: CalculatorIcon,
  },
];

export function AdviceTools({ on }: { on: SectionsOn }) {
  const tools = TOOLS.map((t) =>
    t.href === '/buy?view=map' && !on.buy && on.rent ? { ...t, href: '/rent?view=map' } : t,
  ).filter((t) => hrefOn(t.href, on));
  return (
    <section className="py-8 sm:py-10" aria-labelledby="tools-heading">
      <div className="container-page">
        <SectionHead
          id="tools-heading"
          eyebrow="Smart tools"
          title="Search smarter, decide faster"
        />
        <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${lgCols(tools.length)}`}>
          {tools.map(({ title, text, href, Icon }, i) => (
            <li key={title} className={phoneSpan(i, tools.length)}>
              <Link href={href} className="card nx-lift flex h-full flex-col p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Icon size={20} />
                </span>
                <span className="mt-3 font-semibold">{title}</span>
                <span className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
                  {text}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  View now <ArrowRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Real estate guide (blog) ---------------- */

export function GuideSection({ posts }: { posts: BlogPostCard[] }) {
  if (!posts.length) return null;
  const visual = posts.slice(0, 2);
  const rest = posts.slice(2);
  const list = (rest.length >= 3 ? rest : posts).slice(0, 5);
  return (
    <section className="py-8 sm:py-10" aria-labelledby="guide-heading">
      <div className="container-page">
        <SectionHead
          id="guide-heading"
          eyebrow="Guides"
          title="Read before you buy or rent"
          href="/blog"
          linkLabel="All articles"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card border-t-4 border-t-brand p-5">
            <h3 className="font-semibold">Latest articles</h3>
            <ul className="mt-3 divide-y divide-line">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="flex items-start gap-2 py-2.5 text-sm hover:text-brand"
                  >
                    <ArrowRight size={14} className="mt-1 shrink-0 text-accent-700" />
                    <span className="line-clamp-2">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/blog"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card border-t-4 border-t-brand p-5">
            <h3 className="font-semibold">Buying & renting guides</h3>
            <ul className="mt-3 grid gap-4">
              {visual.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`} className="group flex gap-4">
                    <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg bg-brand-50 sm:w-36">
                      {p.coverImage && (
                        <Image
                          src={p.coverImage.url}
                          alt={p.coverImage.alt || p.title}
                          fill
                          sizes="144px"
                          unoptimized={!canOptimise(p.coverImage.url)}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-3 text-sm font-semibold group-hover:text-brand">
                        {p.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {formatBlogDate(p.publishedAt)} · {p.readingMinutes} min read
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        Read article <ArrowRight size={12} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Browse by property type ---------------- */

const TYPES = [
  {
    label: 'Flats',
    hint: 'Apartments to buy',
    q: 'buy',
    t: 'apartment',
    img: '1545324418-cc1a3fa10c00',
  },
  {
    label: 'Villas',
    hint: 'Space and privacy',
    q: 'buy',
    t: 'villa',
    img: '1613490493576-7fde63acd811',
  },
  {
    label: 'Independent houses',
    hint: 'Own a full home',
    q: 'buy',
    t: 'independent-house',
    img: '1580587771525-78b9dba3b914',
  },
  {
    label: 'Plots',
    hint: 'JDA approved and more',
    q: 'buy',
    t: 'plot',
    img: '1500382017468-9049fed747ef',
  },
  {
    label: 'Flats for rent',
    hint: 'Furnished and unfurnished',
    q: 'rent',
    t: 'apartment',
    img: '1560448204-e02f11c3d0e2',
  },
  {
    label: 'PG & hostels',
    hint: 'Beds with meals',
    q: 'rent',
    t: 'pg',
    img: '1555854877-bab0e564b8d5',
  },
  {
    label: 'Offices',
    hint: 'Buy or rent',
    q: 'rent',
    t: 'office',
    img: '1497366216548-37526070297c',
  },
  {
    label: 'Shops',
    hint: 'Showrooms and retail',
    q: 'rent',
    t: 'shop',
    img: '1604719312566-8912e9227c6a',
  },
] as const;

/**
 * Wide tiles fill the last row when switched-off sections leave fewer than 8 types:
 * 2 columns on phones, 4 from small screens up.
 */
function typeSpan(i: number, n: number): { li: string; tile: string } {
  const phoneWide = n % 2 === 1 && i === n - 1;
  const r = n % 4;
  const lastRow = i >= n - r;
  const smSpan = r === 1 && lastRow ? 4 : (r === 2 && lastRow) || (r === 3 && i === n - 1) ? 2 : 1;
  const li = [
    phoneWide ? 'col-span-2' : '',
    { 1: phoneWide ? 'sm:col-span-1' : '', 2: 'sm:col-span-2', 4: 'sm:col-span-4' }[smSpan],
  ];
  const tile = [
    phoneWide ? 'aspect-[8/3]' : 'aspect-[4/3]',
    { 1: phoneWide ? 'sm:aspect-[4/3]' : '', 2: 'sm:aspect-[8/3]', 4: 'sm:aspect-[16/3]' }[smSpan],
  ];
  return { li: li.filter(Boolean).join(' '), tile: tile.filter(Boolean).join(' ') };
}

export function PropertyTypes({
  city,
  cityName,
  on,
}: {
  city: string;
  cityName: string;
  on: SectionsOn;
}) {
  const types = TYPES.filter((x) => hrefOn(`/${x.q}?propertyType=${x.t}`, on));
  if (!types.length) return null;
  return (
    <section className="py-8 sm:py-10" aria-labelledby="types-heading">
      <div className="container-page">
        <SectionHead
          id="types-heading"
          eyebrow="Browse"
          title="Find your kind of space"
          sub={`Homes, plots and workspaces across ${cityName}.`}
        />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {types.map((x, i) => (
            <li key={x.label} className={typeSpan(i, types.length).li}>
              <Link
                href={`/${x.q}?city=${city}&propertyType=${x.t}`}
                className={`nx-lift group relative block overflow-hidden rounded-2xl bg-brand-900 ${typeSpan(i, types.length).tile}`}
              >
                <Image
                  src={`https://images.unsplash.com/photo-${x.img}?w=600&h=450&fit=crop&q=70&auto=format`}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
                  aria-hidden
                />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white sm:p-4">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold leading-tight sm:text-lg">
                      {x.label}
                    </span>
                    <span className="block truncate text-xs text-white/80 sm:text-sm">
                      {x.hint}
                    </span>
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-accent group-hover:text-ink">
                    <ArrowRight size={14} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Post property strip ---------------- */

export function PostStrip({ cityName }: { cityName: string }) {
  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="post-strip-heading">
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-[#0B1A3F] p-6 text-white sm:p-10">
        <JaipurFacade
          className="absolute inset-x-0 bottom-0 -z-10 h-3/4 w-full text-accent"
          opacity={0.14}
        />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-100">
              <span className="h-px w-6 bg-current" aria-hidden />
              For owners, agents and builders
            </p>
            <h2
              id="post-strip-heading"
              className="mt-2 text-[1.75rem] leading-tight sm:text-[2.25rem]"
            >
              Have a property in {cityName}? Put it in front of serious buyers.
            </h2>
            <p className="mt-2 text-white/75">
              Post from your dashboard. Our team reviews it, and enquiries come straight to you.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/post-property" className="btn btn-accent">
              <PlusIcon size={18} /> Post property
            </Link>
            <Link
              href="/signup?role=agent"
              className="btn border border-white/25 text-white hover:bg-white/10"
            >
              Join as agent
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
