'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  BLOG_STATUSES,
  type AdminBlogPost,
} from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { canOptimise } from '@/components/blog/BlogCard';
import { apiFetch } from '@/lib/client-api';

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

/** Blog articles: drafts and published, newest edits first. */
export default function AdminBlogPage() {
  const { toast, can } = useAdmin();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) qs.set('status', status);
  if (category) qs.set('category', category);
  if (search) qs.set('q', search);
  const { data, meta, loading, error, reload } = useApi<AdminBlogPost[]>(`/admin/blog?${qs}`);

  async function setPostStatus(p: AdminBlogPost, next: 'draft' | 'published') {
    try {
      await apiFetch(`/admin/blog/${p.id}`, { method: 'PATCH', body: { status: next } });
      toast(next === 'published' ? 'Article published' : 'Article moved to drafts');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  async function remove(p: AdminBlogPost) {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/blog/${p.id}`, { method: 'DELETE' });
      toast('Article deleted');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  return (
    <>
      <PageTitle title="Blog">
        <Link href="/blog" target="_blank" className="btn btn-outline">
          View blog
        </Link>
        {can('editor') && (
          <Link href="/admin/blog/new" className="btn btn-primary">
            Write article
          </Link>
        )}
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1">
          {['', ...BLOG_STATUSES].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              role="tab"
              aria-selected={status === s}
              className={`chip capitalize ${status === s ? 'chip-active' : ''}`}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s ? (s === 'draft' ? 'Drafts' : 'Published') : 'All'}
            </button>
          ))}
        </div>
        <select
          aria-label="Category"
          className="field w-auto"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {BLOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BLOG_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
        >
          <input
            type="search"
            aria-label="Search titles"
            placeholder="Search titles"
            className="field w-56"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            Search
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card p-10 text-center text-ink-muted">
          No articles yet.{' '}
          {can('editor') && (
            <Link href="/admin/blog/new" className="font-semibold text-brand hover:underline">
              Write the first one
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {(data ?? []).map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface">
              {p.coverImage ? (
                <Image
                  src={p.coverImage.url}
                  alt=""
                  fill
                  sizes="112px"
                  unoptimized={!canOptimise(p.coverImage.url)}
                  className="object-cover"
                />
              ) : (
                <span className="grid h-full place-items-center text-xs text-ink-muted">
                  No cover
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={p.status} />
                {p.featured && (
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
                    Featured
                  </span>
                )}
                <span className="text-sm text-ink-muted">{BLOG_CATEGORY_LABELS[p.category]}</span>
              </div>
              <h2 className="mt-1 truncate font-sans text-base font-semibold">
                <Link href={`/admin/blog/${p.id}`} className="hover:text-brand">
                  {p.title}
                </Link>
              </h2>
              <p className="text-xs text-ink-muted">
                {p.status === 'published' ? `Published ${fmt(p.publishedAt)}` : 'Draft'} · edited{' '}
                {fmt(p.updatedAt)} · {p.readingMinutes} min read
                {p.authorName ? ` · ${p.authorName}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.status === 'published' && (
                <Link href={`/blog/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm">
                  View
                </Link>
              )}
              <Link href={`/admin/blog/${p.id}`} className="btn btn-outline btn-sm">
                Edit
              </Link>
              {can('editor') &&
                (p.status === 'published' ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPostStatus(p, 'draft')}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    onClick={() => setPostStatus(p, 'published')}
                  >
                    Publish
                  </button>
                ))}
              {can('admin') && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => remove(p)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {meta.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
