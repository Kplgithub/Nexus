'use client';

import Link from 'next/link';
import { formatINR, type DashboardStats } from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { useApi } from '@/components/admin/useApi';

export default function DashboardPage() {
  const { admin } = useAdmin();
  const { data, loading, error } = useApi<DashboardStats>('/admin/dashboard');

  return (
    <>
      <PageTitle title={`Welcome, ${admin.name.split(' ')[0]}`}>
        <Link href="/admin/properties/new" className="btn btn-primary">
          Add property
        </Link>
      </PageTitle>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && <p className="text-ink-muted">Loading…</p>}
      {data && (
        <div className="space-y-8">
          {data.properties.demo > 0 && (
            <p
              role="note"
              className="rounded-lg border border-warn/30 bg-warn-50 p-3 text-sm text-warn"
            >
              {data.properties.demo} demo listing(s) are in the database. Run{' '}
              <code>pnpm demo:remove</code> before launch.
            </p>
          )}
          <section
            aria-label="Property counts"
            className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6"
          >
            <Stat label="Total properties" value={data.properties.total} href="/admin/properties" />
            <Stat
              label="Published"
              value={data.properties.published}
              href="/admin/properties?status=published"
            />
            <Stat
              label="Drafts"
              value={data.properties.draft}
              href="/admin/properties?status=draft"
            />
            <Stat
              label="Rented"
              value={data.properties.rented}
              href="/admin/properties?status=rented"
            />
            <Stat
              label="Inactive"
              value={data.properties.inactive}
              href="/admin/properties?status=inactive"
            />
            <Stat
              label="Archived"
              value={data.properties.archived}
              href="/admin/properties?status=archived"
            />
          </section>
          <section aria-label="Lead counts" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Total enquiries" value={data.enquiries.total} href="/admin/enquiries" />
            <Stat
              label="New leads"
              value={data.enquiries.new}
              href="/admin/enquiries?status=new"
              highlight={data.enquiries.new > 0}
            />
            <Stat
              label="Contacted"
              value={data.enquiries.contacted}
              href="/admin/enquiries?status=contacted"
            />
            <Stat
              label="Follow-ups due"
              value={data.enquiries.followUpsDue}
              href="/admin/enquiries?followUpDue=true"
              highlight={data.enquiries.followUpsDue > 0}
            />
            <Stat
              label="New owner submissions"
              value={data.submissions.new}
              href="/admin/submissions"
              highlight={data.submissions.new > 0}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-semibold">Recently added properties</h2>
              <ul className="mt-3 divide-y divide-line">
                {data.recentProperties.length === 0 && (
                  <li className="py-3 text-sm text-ink-muted">No properties yet.</li>
                )}
                {data.recentProperties.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="truncate font-medium hover:text-brand"
                    >
                      {p.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-ink-muted">{formatINR(p.monthlyRent)}</span>
                      <StatusPill status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card p-5">
              <h2 className="font-semibold">Latest enquiries</h2>
              <ul className="mt-3 divide-y divide-line">
                {data.recentEnquiries.length === 0 && (
                  <li className="py-3 text-sm text-ink-muted">No enquiries yet.</li>
                )}
                {data.recentEnquiries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <Link
                      href={`/admin/enquiries?open=${e.id}`}
                      className="min-w-0 hover:text-brand"
                    >
                      <span className="font-medium">{e.name}</span>
                      <span className="block truncate text-ink-muted">
                        {e.property?.title ?? 'General enquiry'} ·{' '}
                        {new Date(e.createdAt).toLocaleString('en-IN')}
                      </span>
                    </Link>
                    <StatusPill status={e.status} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card block p-4 hover:border-brand ${highlight ? 'ring-2 ring-accent' : ''}`}
    >
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-brand-800">{value}</p>
    </Link>
  );
}
