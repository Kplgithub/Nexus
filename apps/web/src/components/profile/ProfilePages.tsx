import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ProfileCard } from '@nexus/shared';
import {
  getProfile,
  listProfiles,
  searchProjects,
  searchProperties,
  type ProfileRole,
} from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { PropertyGrid } from '../property/PropertyCard';
import { ProjectGrid } from '../project/ProjectCard';
import { Breadcrumbs, EmptyState, JsonLd, Pagination } from '../ui';
import { BadgeCheckIcon, BriefcaseIcon, CraneIcon, MapPinIcon } from '../icons';

/** Agents' and builders' public pages share one layout; only the words differ. */
const WORDS = {
  agent: { root: '/agents', plural: 'Agents', one: 'agent', Icon: BriefcaseIcon },
  builder: { root: '/builders', plural: 'Builders', one: 'builder', Icon: CraneIcon },
} as const;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/* ---------------- Directory ---------------- */

export function directoryMetadata(role: ProfileRole, raw: Raw): Metadata {
  const w = WORDS[role];
  return pageMetadata({
    title: `Real estate ${w.plural.toLowerCase()} in Jaipur`,
    description:
      role === 'agent'
        ? 'Find property agents and brokers in Jaipur with live listings, experience and RERA details on NEXUS Estate.'
        : 'Builders and developers in Jaipur with their new projects, RERA registration and live listings on NEXUS Estate.',
    path: w.root,
    index: !one(raw.q) && !one(raw.page),
  });
}

export async function ProfileDirectory({ role, raw }: { role: ProfileRole; raw: Raw }) {
  const w = WORDS[role];
  const q = (one(raw.q) ?? '').trim().slice(0, 80);
  const page = Math.max(1, Number(one(raw.page)) || 1);
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('page', String(page));
  qs.set('limit', '24');
  let items: ProfileCard[] = [];
  let totalPages = 1;
  let failed = false;
  try {
    const res = await listProfiles(role, qs.toString());
    items = res.items;
    totalPages = res.meta.totalPages;
  } catch {
    failed = true;
  }
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: w.plural, href: w.root },
  ];
  const hrefFor = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set('q', q);
    if (p > 1) s.set('page', String(p));
    return `${w.root}${s.size ? `?${s}` : ''}`;
  };

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[2rem] leading-tight sm:text-[2.6rem]">{w.plural} in Jaipur</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            {role === 'agent'
              ? 'Local agents with live listings on NEXUS Estate. Verified agents are shown first.'
              : 'Developers with projects and listings on NEXUS Estate. Check RERA details before you book.'}
          </p>
        </div>
        <form action={w.root} method="get" role="search" className="flex gap-2">
          <label htmlFor="profile-q" className="sr-only">
            Search {w.plural.toLowerCase()}
          </label>
          <input
            id="profile-q"
            name="q"
            defaultValue={q}
            className="field w-64"
            placeholder={`Search by name or company`}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </header>

      {failed ? (
        <EmptyState title="We couldn’t load this list right now">
          Please refresh in a moment.
        </EmptyState>
      ) : items.length ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${w.root}/${p.slug}`}
                  className="card flex h-full items-center gap-4 p-5 transition-colors hover:border-line-strong"
                >
                  <Avatar name={p.companyName || p.name} logoUrl={p.logoUrl} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{p.companyName || p.name}</span>
                      {p.verified && (
                        <BadgeCheckIcon
                          size={16}
                          className="shrink-0 text-accent-700"
                          aria-label="Verified"
                        />
                      )}
                    </span>
                    {p.companyName && (
                      <span className="block truncate text-sm text-ink-muted">{p.name}</span>
                    )}
                    <span className="mt-1 block text-xs text-ink-muted">
                      {[
                        `${p.listings} live ${p.listings === 1 ? 'listing' : 'listings'}`,
                        p.experienceYears ? `${p.experienceYears} yrs experience` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </>
      ) : (
        <EmptyState
          title={
            q
              ? `No ${w.plural.toLowerCase()} match “${q}”`
              : `No ${w.plural.toLowerCase()} listed yet`
          }
          action={
            <Link href="/signup" className="btn btn-primary">
              Join as {role === 'agent' ? 'an agent' : 'a builder'}
            </Link>
          }
        >
          {role === 'agent'
            ? 'Agents appear here once they have a live listing.'
            : 'Builders appear here once they sign up.'}
        </EmptyState>
      )}
    </div>
  );
}

/* ---------------- Profile ---------------- */

export async function profileMetadata(role: ProfileRole, slug: string): Promise<Metadata> {
  const p = await getProfile(role, slug);
  if (!p) return { title: 'Profile not found', robots: { index: false } };
  const name = p.companyName || p.name;
  const live = p.counts.sale + p.counts.rent + p.counts.projects;
  return pageMetadata({
    title: `${name}: ${role === 'agent' ? 'property agent' : 'builder'} in ${p.city?.name ?? 'Jaipur'}`,
    description:
      p.about?.slice(0, 160) ||
      `${name} on NEXUS Estate: ${p.counts.sale} for sale, ${p.counts.rent} for rent${role === 'builder' ? `, ${p.counts.projects} projects` : ''}.`,
    path: `${WORDS[role].root}/${p.slug}`,
    image: p.logoUrl ?? undefined,
    index: live > 0,
  });
}

export async function ProfilePage({ role, slug }: { role: ProfileRole; slug: string }) {
  const w = WORDS[role];
  const p = await getProfile(role, slug);
  if (!p) notFound();
  const name = p.companyName || p.name;
  const [listings, projects] = await Promise.all([
    searchProperties(`poster=${p.id}&limit=12`).catch(() => null),
    role === 'builder' ? searchProjects(`builder=${p.id}&limit=12`).catch(() => null) : null,
  ]);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: w.plural, href: w.root },
    { name, href: `${w.root}/${p.slug}` },
  ];
  const facts: [string, string][] = [];
  if (p.experienceYears) facts.push(['Experience', `${p.experienceYears} years`]);
  if (p.reraNumber) facts.push(['RERA registration', p.reraNumber]);
  if (p.city) facts.push(['Works in', p.city.name]);
  facts.push([
    'On NEXUS Estate since',
    new Date(p.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  ]);

  return (
    <div className="container-page pt-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name,
            url: absoluteUrl(`${w.root}/${p.slug}`),
            ...(p.logoUrl ? { logo: p.logoUrl } : {}),
            ...(p.city ? { areaServed: p.city.name } : {}),
          },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      <header className="mt-6 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-center">
        <Avatar name={name} logoUrl={p.logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="eyebrow">{role === 'agent' ? 'Property agent' : 'Builder & developer'}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[2rem] leading-tight sm:text-[2.4rem]">
            {name}
            {p.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 font-sans text-sm font-medium text-accent-700">
                <BadgeCheckIcon size={15} /> Verified
              </span>
            )}
          </h1>
          {p.companyName && <p className="mt-1 text-ink-soft">{p.name}</p>}
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            <li className="chip">{p.counts.sale} for sale</li>
            <li className="chip">{p.counts.rent} for rent</li>
            {role === 'builder' && <li className="chip">{p.counts.projects} projects</li>}
          </ul>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-14">
          {p.about && (
            <section aria-labelledby="about">
              <h2 id="about" className="text-2xl">
                About
              </h2>
              <p className="mt-3 max-w-[70ch] whitespace-pre-line text-ink-soft">{p.about}</p>
            </section>
          )}

          {projects && projects.items.length > 0 && (
            <section aria-labelledby="projects">
              <h2 id="projects" className="mb-6 text-2xl">
                Projects by {name}
              </h2>
              <ProjectGrid items={projects.items} />
            </section>
          )}

          <section aria-labelledby="listings">
            <h2 id="listings" className="mb-6 text-2xl">
              Listings by {name}
            </h2>
            {listings && listings.items.length > 0 ? (
              <PropertyGrid items={listings.items} columns={2} />
            ) : (
              <p className="text-ink-soft">No live listings right now.</p>
            )}
            {listings && listings.meta.total > listings.items.length && (
              <p className="mt-6 text-sm text-ink-muted">
                Showing the latest {listings.items.length} of {listings.meta.total} listings.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <dl className="space-y-3 text-sm">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              {p.website && (
                <div>
                  <dt className="text-ink-muted">Website</dt>
                  <dd>
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium text-brand hover:underline"
                    >
                      {p.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {p.localities.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPinIcon size={15} /> Localities
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {p.localities.map((l) => (
                    <li key={l.slug}>
                      <Link href={`/buy/${p.city!.slug}/${l.slug}`} className="chip text-xs">
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="px-1 text-xs text-ink-muted">
            To contact {name}, open any listing and use “View phone number” or send an enquiry.
            NEXUS Estate does not charge buyers or tenants for this.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Avatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl: string | null;
  size?: 'md' | 'lg';
}) {
  const cls = size === 'lg' ? 'size-24 text-3xl' : 'size-14 text-lg';
  if (logoUrl)
    return (
      <span
        className={`relative shrink-0 overflow-hidden rounded-xl border border-line bg-white ${cls}`}
      >
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes={size === 'lg' ? '96px' : '56px'}
          unoptimized
          className="object-contain p-1"
        />
      </span>
    );
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl bg-brand-50 font-display text-brand-800 ${cls}`}
    >
      {initials}
    </span>
  );
}
