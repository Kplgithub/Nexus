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
import { Carousel } from '../Carousel';
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
  href,
  linkLabel = 'See all',
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-sans text-lg font-semibold leading-tight sm:text-[1.375rem]">
          {title}
        </h2>
        <span className="mt-1.5 block h-[3px] w-8 rounded-full bg-accent" aria-hidden />
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
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
  const shown = tiles.slice(0, banner ? 3 : 4);
  return (
    <section aria-label="Browse property" className="container-page pt-6 sm:pt-8">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {shown.map((t, i) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className="nx-lift group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50"
            >
              <Image
                src={t.img}
                alt=""
                fill
                priority={i < 2}
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-md backdrop-blur sm:inset-x-3 sm:bottom-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold sm:text-base">
                    {t.label}
                  </span>
                  <span className="tabular block truncate text-xs text-ink-muted">
                    {t.count.toLocaleString('en-IN')} {t.unit}
                    <span className="hidden sm:inline"> · {t.hint}</span>
                  </span>
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-ink transition-transform group-hover:translate-x-0.5">
                  <ArrowRight size={14} />
                </span>
              </span>
            </Link>
          </li>
        ))}
        {banner && (
          <li>
            <SmartLink
              href={banner.link}
              label={banner.title || 'Offer'}
              className="nx-lift relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface"
            >
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                unoptimized={!canOptimise(banner.imageUrl)}
                className="object-cover"
              />
            </SmartLink>
          </li>
        )}
      </ul>
    </section>
  );
}

/* ---------------- Agents ---------------- */

export function AgentsRail({ agents, cityName }: { agents: ProfileCard[]; cityName: string }) {
  if (!agents.length) return null;
  return (
    <section className="py-5 sm:py-6" aria-labelledby="agents-heading">
      <div className="container-page">
        <SectionHead id="agents-heading" title={`Preferred agents in ${cityName}`} href="/agents" />
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
              className="flex h-full min-h-44 flex-col justify-between rounded-xl bg-gradient-to-br from-brand-800 to-brand p-4 text-white"
            >
              <span>
                <span className="block font-semibold">Are you an agent?</span>
                <span className="mt-1 block text-sm text-white/75">
                  List your properties and get leads from buyers and tenants in {cityName}.
                </span>
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-100">
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
    <section className="py-5 sm:py-6" aria-labelledby="updates-heading">
      <div className="container-page">
        <SectionHead id="updates-heading" title={title} />
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

export async function TopLocalities({ city }: { city: City }) {
  const top = [...city.localities]
    .filter((l) => (l.publishedCount ?? 0) > 0)
    .sort((a, b) => (b.publishedCount ?? 0) - (a.publishedCount ?? 0))
    .slice(0, 8);
  if (!top.length) return null;
  const insights = await Promise.all(top.map((l) => getLocalityInsights(city.slug, l.slug)));

  return (
    <section className="py-5 sm:py-6" aria-labelledby="localities-heading" id="top-localities">
      <div className="container-page">
        <SectionHead id="localities-heading" title={`Top localities in ${city.name}`} />
        <Carousel label="Top localities" slideClass={SLIDE}>
          {[
            <div
              key="intro"
              className="flex h-full flex-col justify-between rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-4"
            >
              <span>
                <span className="block text-lg font-semibold leading-snug text-brand-900">
                  Busiest areas in {city.name}
                </span>
                <span className="mt-2 block text-sm text-ink-soft">
                  Rates and rents worked out from live listings on NEXUS.
                </span>
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                <TrendingUpIcon size={16} /> Updated daily
              </span>
            </div>,
            ...top.map((l, i) => {
              const rate = insights[i]?.sale.medianPricePerSqft;
              const rent = insights[i]?.rent.medianRent;
              const n = l.publishedCount ?? 0;
              return (
                <Link
                  key={l.slug}
                  href={`/buy?city=${city.slug}&locality=${l.slug}`}
                  className="card nx-lift flex h-full flex-col gap-3 border-t-4 border-t-brand p-4"
                >
                  <span className="flex items-start gap-2">
                    <MapPinIcon size={18} className="mt-0.5 shrink-0 text-brand" />
                    <span className="font-semibold leading-snug">{l.name}</span>
                  </span>
                  <span className="grid gap-1 text-sm text-ink-soft">
                    <span>
                      {rate ? (
                        <>
                          <span className="font-semibold text-ink">{formatINR(rate)}</span> per sq
                          ft
                        </>
                      ) : (
                        'Price per sq ft: not enough data yet'
                      )}
                    </span>
                    {rent ? (
                      <span>
                        Typical rent{' '}
                        <span className="font-semibold text-ink">{formatINR(rent)}</span>
                        /month
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand">
                    {n} {n === 1 ? 'property' : 'properties'} <ArrowRight size={14} />
                  </span>
                </Link>
              );
            }),
          ]}
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

export function AdviceTools() {
  return (
    <section className="py-5 sm:py-6" aria-labelledby="tools-heading">
      <div className="container-page">
        <SectionHead id="tools-heading" title="Advice & tools" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {TOOLS.map(({ title, text, href, Icon }) => (
            <li key={title}>
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
    <section className="py-5 sm:py-6" aria-labelledby="guide-heading">
      <div className="container-page">
        <SectionHead id="guide-heading" title="Your real estate guide" href="/blog" />
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

/* ---------------- City snapshot ---------------- */

export function CitySnapshot({
  cityName,
  intro,
  stats,
}: {
  cityName: string;
  intro?: string;
  stats: { value: number; label: string }[];
}) {
  const shown = stats.filter((s) => s.value > 0);
  const text =
    intro ||
    `NEXUS Estate lists homes, plots and commercial spaces for sale and rent across ${cityName}. Every listing is reviewed by our team before it goes live, so you see real options from owners, agents and builders. Search by area, budget or property type, compare prices per sq ft and contact the poster directly.`;
  return (
    <section className="py-5 sm:py-6" aria-labelledby="snapshot-heading">
      <div className="container-page">
        <SectionHead id="snapshot-heading" title={`${cityName} property snapshot`} />
        <div className="card p-5 sm:p-6">
          <details className="group">
            <summary className="cursor-pointer list-none text-sm leading-relaxed text-ink-soft [&::-webkit-details-marker]:hidden">
              <span className="line-clamp-2 group-open:line-clamp-none">{text}</span>
              <span className="mt-1 inline-block font-semibold text-brand group-open:hidden">
                Read more
              </span>
            </summary>
          </details>
          {shown.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
              {shown.map((s) => (
                <div key={s.label}>
                  <dd className="tabular text-xl font-bold">{s.value.toLocaleString('en-IN')}</dd>
                  <dt className="text-xs text-ink-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Post property strip ---------------- */

export function PostStrip() {
  return (
    <section className="container-page py-6" aria-labelledby="post-strip-heading">
      <div className="flex flex-col gap-4 rounded-2xl bg-accent-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 id="post-strip-heading" className="font-sans text-xl font-semibold sm:text-2xl">
            Post your property on NEXUS
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Owners, agents and builders get genuine enquiries straight to their dashboard.
          </p>
        </div>
        <Link href="/post-property" className="btn btn-accent shrink-0">
          <PlusIcon size={18} /> Post property
        </Link>
      </div>
    </section>
  );
}
