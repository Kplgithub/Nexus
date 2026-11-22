import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  blogSearchSchema,
  type BlogPostCard,
} from '@nexus/shared';
import { getBlogPosts } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL, absoluteUrl } from '@/lib/site';
import { BlogCard, BlogLead } from '@/components/blog/BlogCard';
import { Breadcrumbs, EmptyState, JsonLd, Pagination } from '@/components/ui';
import { SparklesIcon } from '@/components/icons';

type Raw = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Raw> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parse(raw: Raw) {
  return blogSearchSchema.parse({
    category: first(raw.category),
    tag: first(raw.tag),
    page: first(raw.page),
    limit: '12',
  });
}

const DESCRIPTION =
  'Guides, market updates and expert tips on buying, renting and investing in property in Jaipur, from the NEXUS Estate team.';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const s = parse(await searchParams);
  const label = s.category ? BLOG_CATEGORY_LABELS[s.category] : null;
  return pageMetadata({
    title: label ? `${label} articles | NEXUS Estate blog` : 'Real estate blog: guides and tips',
    description: label
      ? `${label} articles from NEXUS Estate: practical advice for property buyers, tenants and owners in Jaipur.`
      : DESCRIPTION,
    path: s.category ? `/blog?category=${s.category}` : '/blog',
    // Category pages are indexable; tag filters and deeper pages are crawled but not indexed.
    index: !s.tag && s.page === 1,
  });
}

export default async function BlogPage({ searchParams }: Props) {
  const s = parse(await searchParams);
  let items: BlogPostCard[] = [];
  let totalPages = 1;
  let failed = false;
  try {
    const api = new URLSearchParams({ page: String(s.page), limit: String(s.limit) });
    if (s.category) api.set('category', s.category);
    if (s.tag) api.set('tag', s.tag);
    const res = await getBlogPosts(api.toString());
    items = res.items;
    totalPages = res.meta.totalPages;
  } catch {
    failed = true;
  }

  const filtered = !!(s.category || s.tag);
  const showLead = !filtered && s.page === 1 && items.length > 0;
  const lead = showLead ? (items.find((p) => p.featured) ?? items[0]!) : null;
  const rest = lead ? items.filter((p) => p.id !== lead.id) : items;

  const hrefFor = (p: number) => {
    const n = new URLSearchParams();
    if (s.category) n.set('category', s.category);
    if (s.tag) n.set('tag', s.tag);
    if (p > 1) n.set('page', String(p));
    return `/blog${n.size ? `?${n}` : ''}`;
  };
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
  ];
  const heading = s.tag
    ? `Articles tagged “${s.tag}”`
    : s.category
      ? BLOG_CATEGORY_LABELS[s.category]
      : 'Real estate guides and insights';

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'NEXUS Estate blog',
            url: absoluteUrl('/blog'),
            description: DESCRIPTION,
            publisher: { '@id': `${SITE_URL}/#organization` },
            inLanguage: 'en-IN',
          },
        ]}
      />
      <header className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div className="nx-aurora" aria-hidden />
        <div className="nx-grid" aria-hidden />
        <div className="container-page relative pb-8 pt-6 sm:pb-10">
          <Breadcrumbs items={crumbs} dark />
          <p className="nx-rise mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
            <SparklesIcon size={14} className="text-accent" /> NEXUS Insights
          </p>
          {/* No entrance animation on the heading: it is the LCP element on phones. */}
          <h1 className="mt-3 max-w-3xl text-[1.9rem] leading-tight text-white sm:text-[2.6rem]">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-white/75">
            {DESCRIPTION}
          </p>
          <nav aria-label="Blog categories" className="nx-scroll-x -mx-1 mt-6">
            <ul className="flex gap-2 px-1 pb-1">
              <li>
                <CategoryChip href="/blog" active={!s.category && !s.tag} label="All articles" />
              </li>
              {BLOG_CATEGORIES.map((c) => (
                <li key={c}>
                  <CategoryChip
                    href={`/blog?category=${c}`}
                    active={s.category === c}
                    label={BLOG_CATEGORY_LABELS[c]}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div className="container-page pt-10">
        {failed ? (
          <EmptyState title="The blog could not be loaded">
            Please refresh the page in a moment.
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState
            title={filtered ? 'No articles here yet' : 'Articles are on their way'}
            action={
              <>
                {filtered && (
                  <Link href="/blog" className="btn btn-outline">
                    All articles
                  </Link>
                )}
                <Link href="/properties" className="btn btn-primary">
                  Browse properties
                </Link>
              </>
            }
          >
            Our team is writing guides on buying, renting and investing in Jaipur.
          </EmptyState>
        ) : (
          <>
            {lead && (
              <div className="mb-10">
                <BlogLead post={lead} />
              </div>
            )}
            {rest.length > 0 && (
              <section aria-label="Articles">
                {lead && <h2 className="mb-5 text-2xl font-bold">More articles</h2>}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <BlogCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}
            <Pagination page={s.page} totalPages={totalPages} hrefFor={hrefFor} />
          </>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition ${
        active
          ? 'bg-accent text-ink ring-accent'
          : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
      }`}
    >
      {label}
    </Link>
  );
}
