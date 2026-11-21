'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ADMIN_ROLE_LABELS, type ActivityItem, type AdminRef } from '@nexus/shared';
import { Avatar, PageTitle, Skeleton, SuperOnly, useAdmin } from '@/components/admin/AdminShell';
import { describeActivity } from '@/components/admin/activity';
import { useApi } from '@/components/admin/useApi';

const AREAS = [
  ['', 'Everything'],
  ['property', 'Listings'],
  ['enquiry', 'Leads'],
  ['visit', 'Site visits'],
  ['support', 'Support'],
  ['user', 'Website users'],
  ['team', 'Team'],
  ['blog', 'Blog'],
  ['payment', 'Payments'],
  ['admin', 'Sign-ins'],
] as const;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

function Inner() {
  const params = useSearchParams();
  const { admin } = useAdmin();
  const [actor, setActor] = useState(params.get('actor') ?? '');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const q = new URLSearchParams({
    page: String(page),
    ...(actor && { actor }),
    ...(entity && { entity }),
  });
  const { data, meta, loading, error } = useApi<ActivityItem[]>(`/admin/activity?${q}`);
  const people = useApi<AdminRef[]>('/admin/team/assignees');

  const groups: { day: string; items: ActivityItem[] }[] = [];
  for (const a of data ?? []) {
    const d = dayLabel(a.createdAt);
    if (groups.at(-1)?.day !== d) groups.push({ day: d, items: [] });
    groups.at(-1)!.items.push(a);
  }

  return (
    <>
      <PageTitle
        title="Activity log"
        sub="Every change made in the admin, newest first. Only Super Admins see this."
      />
      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <div>
          <label htmlFor="ac-who" className="field-label">
            Person
          </label>
          <select
            id="ac-who"
            className="field"
            value={actor}
            onChange={(e) => (setActor(e.target.value), setPage(1))}
          >
            <option value="">Everyone</option>
            {people.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ADMIN_ROLE_LABELS[p.role]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ac-what" className="field-label">
            Area
          </label>
          <select
            id="ac-what"
            className="field"
            value={entity}
            onChange={(e) => (setEntity(e.target.value), setPage(1))}
          >
            {AREAS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <Skeleton className="h-72 w-full" />}
      {data?.length === 0 && (
        <p className="card p-8 text-center text-ink-muted">Nothing recorded for this filter.</p>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.day} className="card overflow-hidden">
            <h2 className="border-b border-line bg-surface px-4 py-2.5 font-sans text-sm font-bold">
              {g.day}
            </h2>
            <ol>
              {g.items.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-3 border-b border-line px-4 py-3 text-sm last:border-0"
                >
                  <Avatar
                    name={a.actor?.name ?? a.actorEmail ?? '?'}
                    size={30}
                    tone={a.actor?.role === 'editor' ? 'accent' : 'navy'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">
                      <b>
                        {a.actor?.id === admin.id
                          ? 'You'
                          : (a.actor?.name ?? a.actorEmail ?? 'System')}
                      </b>{' '}
                      {a.actor && (
                        <span
                          className={`mr-1 rounded px-1.5 text-[10.5px] font-extrabold ${a.actor.role === 'editor' ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand'}`}
                        >
                          {ADMIN_ROLE_LABELS[a.actor.role]}
                        </span>
                      )}
                      {describeActivity(a)}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs font-semibold text-ink-muted"
                    dateTime={a.createdAt}
                  >
                    {time(a.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ActivityPage() {
  return (
    <SuperOnly>
      <Suspense>
        <Inner />
      </Suspense>
    </SuperOnly>
  );
}
