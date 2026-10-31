import Image from 'next/image';
import Link from 'next/link';
import { BLOG_CATEGORY_LABELS, type BlogPostCard } from '@nexus/shared';

export function formatBlogDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
}

const OPTIMISED_HOSTS = ['res.cloudinary.com', 'images.unsplash.com'];
/** next/image only optimises allow-listed hosts; anything else is shown as-is. */
export const canOptimise = (url: string) => {
  if (url.startsWith('/')) return true;
  try {
    return OPTIMISED_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

function Cover({
  post,
  sizes,
  priority,
}: {
  post: BlogPostCard;
  sizes: string;
  priority?: boolean;
}) {
  return post.coverImage ? (
    <Image
      src={post.coverImage.url}
      alt={post.coverImage.alt || post.title}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!canOptimise(post.coverImage.url)}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
    />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand to-brand-900">
      <div className="nx-aurora opacity-70" aria-hidden />
      <span className="absolute bottom-4 left-4 font-display text-2xl text-white/90">NEXUS</span>
    </div>
  );
}

export function BlogMeta({ post, light = false }: { post: BlogPostCard; light?: boolean }) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 text-sm ${light ? 'text-white/75' : 'text-ink-muted'}`}
    >
      {post.publishedAt && (
        <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
      )}
      <span aria-hidden>·</span>
      <span>{post.readingMinutes} min read</span>
      {post.authorName && (
        <>
          <span aria-hidden>·</span>
          <span>By {post.authorName}</span>
        </>
      )}
    </p>
  );
}

export function BlogCard({ post }: { post: BlogPostCard }) {
  return (
    <article className="nx-lift group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface">
        <Cover post={post} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm">
          {BLOG_CATEGORY_LABELS[post.category]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-brand">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto pt-4">
          <BlogMeta post={post} />
        </div>
      </div>
    </article>
  );
}

/** Large card for the newest (or featured) article at the top of the blog. */
export function BlogLead({ post }: { post: BlogPostCard }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[1.25fr_1fr]">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface lg:aspect-auto lg:min-h-[22rem]">
        <Cover post={post} sizes="(min-width: 1024px) 60vw, 100vw" priority />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
        <p className="flex items-center gap-2">
          <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent-700">
            {post.featured ? 'Featured' : 'Latest'}
          </span>
          <span className="text-sm font-semibold text-brand">
            {BLOG_CATEGORY_LABELS[post.category]}
          </span>
        </p>
        <h2 className="mt-4 text-2xl font-bold leading-tight text-ink group-hover:text-brand sm:text-[2rem]">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">{post.excerpt}</p>
        )}
        <div className="mt-5">
          <BlogMeta post={post} />
        </div>
        <span className="mt-6 inline-flex w-fit items-center gap-1 font-semibold text-brand">
          Read article →
        </span>
      </div>
    </article>
  );
}
