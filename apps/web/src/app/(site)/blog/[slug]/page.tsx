import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BLOG_CATEGORY_LABELS, type BlogPostCard, type PublicBlogPost } from '@nexus/shared';
import { getBlogPost, getSettings } from '@/lib/api';
import { sectionsOn } from '@/lib/sections';
import { absoluteUrl } from '@/lib/site';
import { blogPostingJsonLd, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { BlogCard, BlogMeta, canOptimise } from '@/components/blog/BlogCard';
import { Markdown } from '@/components/blog/Markdown';
import { ReadTracker } from '@/components/blog/ReadTracker';
import { Breadcrumbs, JsonLd } from '@/components/ui';
import {
  FacebookIcon,
  HomeIcon,
  KeyIcon,
  LinkedinIcon,
  PlusIcon,
  WhatsAppIcon,
  XIcon,
} from '@/components/icons';

// Cache each page after its first visit and refresh it in the background once a minute (ISR).
// No paths are built ahead of time, so builds stay fast and do not need the API.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const res = await getBlogPost(slug);
  if (!res) notFound();
  if (res.redirectTo) permanentRedirect(`/blog/${res.redirectTo}`);
  return res as { post: PublicBlogPost; related: BlogPostCard[] };
}

/** Plain-text summary for meta tags when the editor left the SEO description empty. */
function summary(p: PublicBlogPost) {
  if (p.seoDescription) return p.seoDescription;
  if (p.excerpt) return p.excerpt;
  const text = p.content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, '')}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await getBlogPost(slug).catch(() => null);
  if (!res?.post) return { title: 'Article not found', robots: { index: false } };
  const p = res.post;
  const meta = pageMetadata({
    title: p.seoTitle || p.title,
    description: summary(p),
    path: `/blog/${p.slug}`,
    image: p.coverImage?.url,
    type: 'article',
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: 'article',
      ...(p.publishedAt ? { publishedTime: p.publishedAt } : {}),
      modifiedTime: p.updatedAt,
      ...(p.authorName ? { authors: [p.authorName] } : {}),
      tags: p.tags,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [{ post: p, related }, settings] = await Promise.all([load(slug), getSettings()]);
  const on = sectionsOn(settings);
  const url = absoluteUrl(`/blog/${p.slug}`);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: BLOG_CATEGORY_LABELS[p.category], href: `/blog?category=${p.category}` },
    { name: p.title, href: `/blog/${p.slug}` },
  ];
  const share = [
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${p.title} ${url}`)}`,
      Icon: WhatsAppIcon,
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Icon: FacebookIcon,
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}`,
      Icon: XIcon,
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Icon: LinkedinIcon,
    },
  ];

  return (
    <article className="pb-4">
      <JsonLd data={[breadcrumbJsonLd(crumbs), blogPostingJsonLd(p)]} />

      <header className="container-page pt-8">
        <Breadcrumbs items={crumbs} />
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <Link
            href={`/blog?category=${p.category}`}
            className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 hover:bg-brand-100"
          >
            {BLOG_CATEGORY_LABELS[p.category]}
          </Link>
          <h1 className="mt-4 text-[2rem] font-bold leading-tight text-ink sm:text-[2.75rem]">
            {p.title}
          </h1>
          {p.excerpt && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{p.excerpt}</p>}
          <div className="mt-5 flex justify-center">
            <BlogMeta post={p} />
          </div>
        </div>
        {p.coverImage && (
          <div className="relative mx-auto mt-8 aspect-[16/9] max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <Image
              src={p.coverImage.url}
              alt={p.coverImage.alt || p.title}
              fill
              priority
              sizes="(min-width: 1100px) 1024px, 100vw"
              unoptimized={!canOptimise(p.coverImage.url)}
              className="object-cover"
            />
          </div>
        )}
      </header>

      <div className="container-page mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14 xl:max-w-6xl">
        <div className="min-w-0">
          <div id="article-body">
            <Markdown source={p.content} className="mx-auto max-w-[70ch] text-[1.0625rem]" />
          </div>
          <ReadTracker postId={p.id} bodyId="article-body" />

          <footer className="mx-auto mt-10 max-w-[70ch] border-t border-line pt-6">
            {p.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {p.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/blog?tag=${encodeURIComponent(t)}`} className="chip" rel="tag">
                      #{t}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-ink-soft">Share this article</span>
              {share.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-line text-brand transition hover:border-brand hover:bg-brand-50"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </footer>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Find property">
          <div className="relative isolate overflow-hidden rounded-2xl bg-brand-900 p-6 text-white">
            <div className="nx-aurora opacity-80" aria-hidden />
            <p className="relative font-display text-xl leading-snug">
              Looking for a property in Jaipur?
            </p>
            <p className="relative mt-2 text-sm leading-relaxed text-white/75">
              Verified homes, plots and offices with direct owner and builder contact.
            </p>
            <div className="relative mt-5 grid gap-2">
              {on.buy && (
                <Link href="/buy" className="btn btn-accent justify-start">
                  <HomeIcon size={18} /> Buy a property
                </Link>
              )}
              {on.rent && (
                <Link
                  href="/rent"
                  className="btn justify-start bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
                >
                  <KeyIcon size={18} /> Rent a home
                </Link>
              )}
              <Link
                href="/post-property"
                className="btn justify-start bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
              >
                <PlusIcon size={18} /> Post property
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="related-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="related-heading" className="text-2xl font-bold">
              Keep reading
            </h2>
            <Link href="/blog" className="font-semibold text-brand hover:underline">
              All articles
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
