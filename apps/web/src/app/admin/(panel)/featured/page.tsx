'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FEATURE_DAYS, formatPrice, type AdminProperty, type FeaturedListing } from '@nexus/shared';
import { PageTitle, Skeleton, useAdmin } from '@/components/admin/AdminShell';
import { A } from '@/components/admin/AdminIcons';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function FeaturedPage() {
  const { toast } = useAdmin();
  const { data, loading, error, reload } = useApi<FeaturedListing[]>('/admin/featured');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState<number>(30);
  const [busy, setBusy] = useState<string | null>(null);
  const search = useApi<AdminProperty[]>(
    query ? `/admin/properties?status=published&limit=8&q=${encodeURIComponent(query)}` : null,
  );

  async function feature(id: string, d: number, title: string) {
    setBusy(id);
    try {
      await apiFetch(`/admin/properties/${id}/feature`, { method: 'POST', body: { days: d } });
      toast(d ? `“${title}” is featured for ${d} days` : `“${title}” removed from featured`);
      reload();
      search.reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  const featuredIds = new Set(data?.map((f) => f.id));

  return (
    <>
      <PageTitle
        title="Featured listings"
        sub="Featured listings show first in search and on the homepage. They come off by themselves on the end date."
      />

      <section className="card mb-5 p-4 sm:p-5">
        <h2 className="font-sans text-base font-bold">Feature a listing</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <label htmlFor="ft-q" className="sr-only">
            Find a live listing
          </label>
          <input
            id="ft-q"
            className="field"
            placeholder="Find a live listing by title or locality"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label htmlFor="ft-days" className="sr-only">
            For how long
          </label>
          <select
            id="ft-days"
            className="field"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {FEATURE_DAYS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline">
            Find
          </button>
        </form>
        {query && search.loading && <Skeleton className="mt-3 h-16 w-full" />}
        {search.data?.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">No live listing matches.</p>
        )}
        <ul className="mt-3 divide-y divide-line">
          {search.data?.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <b className="block truncate">{p.title}</b>
                <span className="text-ink-muted">
                  {p.locality.name} · {formatPrice(p.price, p.listingType)}
                </span>
              </span>
              {featuredIds.has(p.id) ? (
                <span className="text-xs font-bold text-accent-700">Already featured</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm gap-1"
                  disabled={busy === p.id}
                  onClick={() => feature(p.id, days, p.title)}
                >
                  <A.star width={15} height={15} /> Feature {days} days
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <Skeleton className="h-48 w-full" />}
      {data && data.length === 0 && (
        <section className="card px-4 py-8 text-center text-ink-muted">
          Nothing is featured right now.
        </section>
      )}
      {data && data.length > 0 && (
        <section className="card overflow-x-auto">
          <table className="adm-table min-w-[40rem]">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Price</th>
                <th>Posted by</th>
                <th>Ends</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => {
                const left = daysLeft(f.featuredUntil);
                return (
                  <tr key={f.id}>
                    <td>
                      <Link
                        href={`/admin/properties/${f.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {f.title}
                      </Link>
                      <span className="block text-xs text-ink-muted">{f.localityName}</span>
                    </td>
                    <td className="whitespace-nowrap">{formatPrice(f.price, f.listingType)}</td>
                    <td>{f.postedBy?.name ?? 'NEXUS'}</td>
                    <td className="whitespace-nowrap">
                      {f.featuredUntil ? (
                        <>
                          {new Date(f.featuredUntil).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          <span
                            className={`block text-xs font-bold ${left !== null && left <= 3 ? 'text-warn' : 'text-ink-muted'}`}
                          >
                            {left} day{left === 1 ? '' : 's'} left
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-muted">No end date</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy === f.id}
                        onClick={() => feature(f.id, 30, f.title)}
                        title="Restart for 30 days from today"
                      >
                        +30 days
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        disabled={busy === f.id}
                        onClick={() => feature(f.id, 0, f.title)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
