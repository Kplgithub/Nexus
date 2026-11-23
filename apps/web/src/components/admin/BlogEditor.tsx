'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_PATH,
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  slugify,
  type AdminBlogPost,
  type BlogCategory,
  type BlogCover,
} from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { SITE_URL } from '@/lib/site';
import { Markdown } from '@/components/blog/Markdown';
import { canOptimise } from '@/components/blog/BlogCard';
import { PageTitle, StatusPill, useAdmin } from './AdminShell';
import { errMsg } from './useApi';

type UploadResult =
  | {
      ok: true;
      name: string;
      image: { url: string; publicId: string; width?: number; height?: number };
    }
  | { ok: false; name: string; error: string };

type Form = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: BlogCover | null;
  category: BlogCategory;
  tags: string;
  authorName: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const fromPost = (p?: AdminBlogPost, author = ''): Form => ({
  title: p?.title ?? '',
  slug: p?.slug ?? '',
  excerpt: p?.excerpt ?? '',
  content: p?.content ?? '',
  coverImage: p?.coverImage ?? null,
  category: p?.category ?? 'buying',
  tags: p?.tags.join(', ') ?? '',
  authorName: p?.authorName ?? author,
  featured: p?.featured ?? false,
  seoTitle: p?.seoTitle ?? '',
  seoDescription: p?.seoDescription ?? '',
});

function validImage(file: File) {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type))
    return 'Use a JPEG, PNG, WebP or AVIF image';
  if (file.size > IMAGE_MAX_BYTES) return 'Image is larger than 8 MB';
  return null;
}

async function uploadOne(file: File) {
  const bad = validImage(file);
  if (bad) throw new Error(bad);
  const form = new FormData();
  form.append('files', file);
  const { data } = await apiFetch<UploadResult[]>('/admin/uploads', { method: 'POST', form });
  const r = data[0];
  if (!r) throw new Error('Upload failed');
  if (!r.ok) throw new Error(r.error);
  return r.image;
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs ${value.length > max ? 'text-danger' : 'text-ink-muted'}`}>
      {value.length}/{max}
    </span>
  );
}

type Tool =
  | { label: string; title: string; prefix: string | 'numbered' }
  | { label: string; title: string; wrap: [string, string, string] };

const TOOLS: Tool[] = [
  { label: 'H2', title: 'Section heading', prefix: '## ' },
  { label: 'H3', title: 'Sub-heading', prefix: '### ' },
  { label: 'B', title: 'Bold', wrap: ['**', '**', 'bold text'] },
  { label: 'I', title: 'Italic', wrap: ['_', '_', 'italic text'] },
  { label: 'Link', title: 'Insert link', wrap: ['[', '](https://)', 'link text'] },
  { label: '• List', title: 'Bulleted list', prefix: '- ' },
  { label: '1. List', title: 'Numbered list', prefix: 'numbered' },
  { label: '❝ Quote', title: 'Quote or tip box', prefix: '> ' },
  {
    label: 'Table',
    title: 'Insert table',
    wrap: [
      '\n| Locality | Avg. price / sq ft |\n| --- | --- |\n| Vaishali Nagar | ₹5,500 |\n',
      '',
      '',
    ],
  },
];

/** Create or edit a blog article. Content is Markdown with a live preview. */
export function BlogEditor({ post }: { post?: AdminBlogPost }) {
  const router = useRouter();
  const { toast, can, admin } = useAdmin();
  const [form, setForm] = useState<Form>(() => fromPost(post, admin.name));
  const [saved, setSaved] = useState<Form>(() => fromPost(post, admin.name));
  const [current, setCurrent] = useState<AdminBlogPost | undefined>(post);
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'inline' | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const inlineInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const readOnly = !can('editor');

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function setTitle(title: string) {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  }

  /** Wrap the selection (or insert a placeholder) in the textarea. */
  function wrap(before: string, after = '', placeholder = '') {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    set('content', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  /** Prefix each selected line, e.g. "## " or "- ". */
  function prefixLines(prefix: string | ((i: number) => string)) {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const start = value.lastIndexOf('\n', s - 1) + 1;
    const block = value.slice(start, e);
    const lines = block
      .split('\n')
      .map((l, i) => (typeof prefix === 'string' ? prefix : prefix(i)) + l);
    const next = value.slice(0, start) + lines.join('\n') + value.slice(e);
    set('content', next);
    requestAnimationFrame(() => el.focus());
  }

  function applyTool(t: Tool) {
    if ('wrap' in t) wrap(...t.wrap);
    else prefixLines(t.prefix === 'numbered' ? (i) => `${i + 1}. ` : t.prefix);
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    setUploading('cover');
    try {
      const img = await uploadOne(file);
      set('coverImage', { ...img, alt: form.coverImage?.alt || form.title });
      toast('Cover image uploaded. Remember to save.');
    } catch (err) {
      toast(err instanceof Error ? err.message : errMsg(err), 'error');
    } finally {
      setUploading(null);
      if (coverInput.current) coverInput.current.value = '';
    }
  }

  async function uploadInline(file?: File) {
    if (!file) return;
    setUploading('inline');
    try {
      const img = await uploadOne(file);
      const alt = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
      wrap(`\n![${alt}](${img.url})\n`);
    } catch (err) {
      toast(err instanceof Error ? err.message : errMsg(err), 'error');
    } finally {
      setUploading(null);
      if (inlineInput.current) inlineInput.current.value = '';
    }
  }

  async function save(status?: 'draft' | 'published') {
    setBusy(true);
    setErrors({});
    const body: Record<string, unknown> = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      category: form.category,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      authorName: form.authorName,
      featured: form.featured,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
    };
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (status) body.status = status;
    else if (!current) body.status = 'draft';
    try {
      const { data } = await apiFetch<AdminBlogPost>(
        current ? `/admin/blog/${current.id}` : '/admin/blog',
        { method: current ? 'PATCH' : 'POST', body },
      );
      const next = fromPost(data);
      setCurrent(data);
      setForm(next);
      setSaved(next);
      setSlugTouched(true);
      toast(
        status === 'published'
          ? current?.status === 'published'
            ? 'Article updated'
            : 'Article published'
          : status === 'draft' && current?.status === 'published'
            ? 'Article moved to drafts'
            : 'Saved',
      );
      if (!current) router.replace(`${ADMIN_PATH}/blog/${data.id}`);
    } catch (err) {
      const details = (err as { details?: Record<string, string[]> }).details;
      if (details) setErrors(details);
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current || !window.confirm(`Delete “${current.title}”? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/blog/${current.id}`, { method: 'DELETE' });
      setSaved(form);
      toast('Article deleted');
      router.replace(`${ADMIN_PATH}/blog`);
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  const fieldError = (k: string) =>
    errors[k]?.length ? (
      <p className="field-error" role="alert">
        {errors[k]!.join(', ')}
      </p>
    ) : null;

  const published = current?.status === 'published';
  const metaTitle = form.seoTitle || form.title || 'Article title';
  const metaDescription =
    form.seoDescription || form.excerpt || 'Add an excerpt or SEO description for search results.';

  return (
    <>
      <PageTitle title={current ? 'Edit article' : 'Write an article'}>
        {current && (
          <span className="self-center">
            <StatusPill status={current.status} />
          </span>
        )}
        {published && (
          <Link href={`/blog/${current!.slug}`} target="_blank" className="btn btn-outline">
            View live
          </Link>
        )}
        {current?.publishedAt && (
          <Link href={`${ADMIN_PATH}/blog/${current.id}/analytics`} className="btn btn-outline">
            Reader analytics
          </Link>
        )}
        <Link href={`${ADMIN_PATH}/blog`} className="btn btn-ghost">
          All articles
        </Link>
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card space-y-4 p-5">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bl-title" className="field-label">
                  Title
                </label>
                <Counter value={form.title} max={140} />
              </div>
              <input
                id="bl-title"
                className="field text-lg font-semibold"
                required
                maxLength={140}
                value={form.title}
                readOnly={readOnly}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10 things to check before buying a flat in Jaipur"
              />
              {fieldError('title')}
            </div>
            <div>
              <label htmlFor="bl-slug" className="field-label">
                URL
              </label>
              <div className="flex items-center gap-1 text-sm">
                <span className="shrink-0 text-ink-muted">
                  {SITE_URL.replace(/^https?:\/\//, '')}/blog/
                </span>
                <input
                  id="bl-slug"
                  className="field"
                  maxLength={100}
                  value={form.slug}
                  readOnly={readOnly}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  }}
                />
              </div>
              <p className="field-hint">
                {published
                  ? 'Changing the URL of a live article keeps the old link working (it redirects).'
                  : 'Made from the title. Short URLs with the main keyword work best.'}
              </p>
              {fieldError('slug')}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bl-excerpt" className="field-label">
                  Excerpt
                </label>
                <Counter value={form.excerpt} max={300} />
              </div>
              <textarea
                id="bl-excerpt"
                className="field"
                rows={2}
                maxLength={300}
                value={form.excerpt}
                readOnly={readOnly}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="One or two sentences shown on the blog page and in search results."
              />
              {fieldError('excerpt')}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
              <div role="tablist" aria-label="Editor mode" className="flex gap-1">
                {(['write', 'preview'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`chip capitalize ${tab === t ? 'chip-active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'write' && !readOnly && (
                <div className="flex flex-wrap gap-1" aria-label="Formatting">
                  {TOOLS.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      title={t.title}
                      aria-label={t.title}
                      className="btn btn-ghost btn-sm px-2 font-semibold"
                      onClick={() => applyTool(t)}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={uploading === 'inline'}
                    onClick={() => inlineInput.current?.click()}
                  >
                    {uploading === 'inline' ? 'Uploading…' : '+ Image'}
                  </button>
                  <input
                    ref={inlineInput}
                    type="file"
                    accept={IMAGE_MIME_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) => uploadInline(e.target.files?.[0])}
                  />
                </div>
              )}
            </div>
            {tab === 'write' ? (
              <textarea
                ref={textarea}
                aria-label="Article content (Markdown)"
                className="block min-h-[32rem] w-full resize-y border-0 p-5 font-mono text-[0.95rem] leading-relaxed focus:outline-none"
                value={form.content}
                readOnly={readOnly}
                onChange={(e) => set('content', e.target.value)}
                placeholder={
                  'Write your article here.\n\n## A section heading\n\nNormal paragraphs, **bold**, _italic_, [links](https://example.com) and lists:\n\n- Point one\n- Point two\n\n> A tip box for important advice.'
                }
              />
            ) : (
              <div className="min-h-[32rem] p-5">
                {form.content.trim() ? (
                  <Markdown source={form.content} className="max-w-[70ch]" />
                ) : (
                  <p className="text-ink-muted">Nothing to preview yet.</p>
                )}
              </div>
            )}
            <p className="border-t border-line px-5 py-2 text-xs text-ink-muted">
              Formatting uses Markdown: ## heading, **bold**, _italic_, - list, &gt; quote,
              [text](link).
              {fieldError('content')}
            </p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <h2 className="font-sans text-base font-semibold">Publish</h2>
            <p className="text-sm text-ink-soft">
              {published
                ? `Live since ${new Date(current!.publishedAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                : current
                  ? 'This article is a draft. Only staff can see it.'
                  : 'Save as a draft first, or publish straight away.'}
              {dirty && (
                <span className="block font-medium text-warn">You have unsaved changes.</span>
              )}
            </p>
            {!readOnly && (
              <div className="grid gap-2">
                {published ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy || !dirty}
                      onClick={() => save('published')}
                    >
                      Update article
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busy}
                      onClick={() => save('draft')}
                    >
                      Unpublish (move to drafts)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-accent"
                      disabled={busy}
                      onClick={() => save('published')}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busy || (!!current && !dirty)}
                      onClick={() => save()}
                    >
                      Save draft
                    </button>
                  </>
                )}
                {current && can('admin') && (
                  <button type="button" className="btn btn-ghost text-danger" onClick={remove}>
                    Delete article
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-sans text-base font-semibold">Cover image</h2>
            {form.coverImage ? (
              <>
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface">
                  <Image
                    src={form.coverImage.url}
                    alt={form.coverImage.alt || form.title}
                    fill
                    sizes="352px"
                    unoptimized={!canOptimise(form.coverImage.url)}
                    className="object-cover"
                  />
                </div>
                <div>
                  <label htmlFor="bl-alt" className="field-label">
                    Alt text
                  </label>
                  <input
                    id="bl-alt"
                    className="field"
                    maxLength={160}
                    value={form.coverImage.alt}
                    readOnly={readOnly}
                    onChange={(e) =>
                      set('coverImage', { ...form.coverImage!, alt: e.target.value })
                    }
                    placeholder="Describe the photo for screen readers and Google"
                  />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-ink-muted">
                No cover yet. A wide photo (1600×900) looks best.
              </p>
            )}
            {!readOnly && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={uploading === 'cover'}
                  onClick={() => coverInput.current?.click()}
                >
                  {uploading === 'cover'
                    ? 'Uploading…'
                    : form.coverImage
                      ? 'Replace image'
                      : 'Upload image'}
                </button>
                {form.coverImage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={() => set('coverImage', null)}
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={coverInput}
                  type="file"
                  accept={IMAGE_MIME_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => uploadCover(e.target.files?.[0])}
                />
              </div>
            )}
            {fieldError('coverImage')}
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-sans text-base font-semibold">Details</h2>
            <div>
              <label htmlFor="bl-cat" className="field-label">
                Category
              </label>
              <select
                id="bl-cat"
                className="field"
                value={form.category}
                disabled={readOnly}
                onChange={(e) => set('category', e.target.value as BlogCategory)}
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {BLOG_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bl-tags" className="field-label">
                Tags
              </label>
              <input
                id="bl-tags"
                className="field"
                value={form.tags}
                readOnly={readOnly}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="rera, home loan, vaishali nagar"
              />
              <p className="field-hint">Comma separated, up to 10.</p>
              {fieldError('tags')}
            </div>
            <div>
              <label htmlFor="bl-author" className="field-label">
                Author name
              </label>
              <input
                id="bl-author"
                className="field"
                maxLength={80}
                value={form.authorName}
                readOnly={readOnly}
                onChange={(e) => set('authorName', e.target.value)}
                placeholder="NEXUS Estate team"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand)]"
                checked={form.featured}
                disabled={readOnly}
                onChange={(e) => set('featured', e.target.checked)}
              />
              Feature at the top of the blog page
            </label>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-sans text-base font-semibold">Search engine (SEO)</h2>
            <div className="rounded-lg border border-line bg-white p-3">
              <p className="truncate text-xs text-ink-muted">
                {SITE_URL.replace(/^https?:\/\//, '')} › blog › {form.slug || '…'}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[1.05rem] text-[#1a0dab]">{metaTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{metaDescription}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bl-seot" className="field-label">
                  SEO title
                </label>
                <Counter value={form.seoTitle} max={70} />
              </div>
              <input
                id="bl-seot"
                className="field"
                maxLength={70}
                value={form.seoTitle}
                readOnly={readOnly}
                onChange={(e) => set('seoTitle', e.target.value)}
                placeholder="Defaults to the title"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bl-seod" className="field-label">
                  Meta description
                </label>
                <Counter value={form.seoDescription} max={170} />
              </div>
              <textarea
                id="bl-seod"
                className="field"
                rows={3}
                maxLength={170}
                value={form.seoDescription}
                readOnly={readOnly}
                onChange={(e) => set('seoDescription', e.target.value)}
                placeholder="Defaults to the excerpt"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
