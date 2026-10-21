'use client';

import { useState } from 'react';
import type { Faq } from '@nexus/shared';
import { FAQ_CATEGORIES } from '@nexus/shared';
import { PageTitle, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

const CATS: Faq['category'][] = [...FAQ_CATEGORIES];
const blank = {
  question: '',
  answer: '',
  category: 'general' as Faq['category'],
  sortOrder: 0,
  published: true,
  showOnHome: false,
};

export default function FaqsPage() {
  const { toast } = useAdmin();
  const { data, error, reload } = useApi<Faq[]>('/admin/faqs');
  const [editing, setEditing] = useState<(typeof blank & { id?: string }) | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...body } = editing;
    try {
      await apiFetch(id ? `/admin/faqs/${id}` : '/admin/faqs', {
        method: id ? 'PATCH' : 'POST',
        body,
      });
      toast('FAQ saved');
      setEditing(null);
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  async function remove(f: Faq) {
    if (!window.confirm(`Delete “${f.question}”?`)) return;
    try {
      await apiFetch(`/admin/faqs/${f.id}`, { method: 'DELETE' });
      toast('FAQ deleted');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  return (
    <>
      <PageTitle title="FAQs">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ ...blank })}>
          Add FAQ
        </button>
      </PageTitle>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={save} className="card mb-6 space-y-4 p-5">
          <div>
            <label htmlFor="fq-q" className="field-label">
              Question
            </label>
            <input
              id="fq-q"
              className="field"
              required
              minLength={5}
              maxLength={200}
              value={editing.question}
              onChange={(e) => setEditing({ ...editing, question: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="fq-a" className="field-label">
              Answer
            </label>
            <textarea
              id="fq-a"
              className="field"
              required
              minLength={5}
              maxLength={3000}
              value={editing.answer}
              onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="fq-c" className="field-label">
                Category
              </label>
              <select
                id="fq-c"
                className="field"
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value as Faq['category'] })
                }
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fq-o" className="field-label">
                Order
              </label>
              <input
                id="fq-o"
                type="number"
                min={0}
                className="field w-24"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand)]"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />{' '}
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand)]"
                checked={editing.showOnHome}
                onChange={(e) => setEditing({ ...editing, showOnHome: e.target.checked })}
              />{' '}
              Show on home page
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {data?.map((f) => (
          <li key={f.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{f.question}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{f.answer}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {f.category} · order {f.sortOrder} · {f.published ? 'published' : 'hidden'}
                {f.showOnHome ? ' · on home page' : ''}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditing({ ...f })}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                onClick={() => remove(f)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
