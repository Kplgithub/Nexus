'use client';

import { use } from 'react';
import type { AdminBlogPost } from '@nexus/shared';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { useApi } from '@/components/admin/useApi';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading } = useApi<AdminBlogPost>(
    /^[a-f0-9]{24}$/i.test(id) ? `/admin/blog/${id}` : null,
  );
  if (error || (!loading && !data))
    return (
      <p role="alert" className="rounded-lg bg-danger-50 p-4 text-danger">
        {error ?? 'Article not found'}
      </p>
    );
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  return <BlogEditor key={data.id} post={data} />;
}
