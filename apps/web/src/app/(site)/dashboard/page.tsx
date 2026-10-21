'use client';

import Link from 'next/link';
import { formatIndianPhone, type UserDashboard } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { SectionTitle } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/components/session/SessionProvider';
import { POST_PROPERTY_PATH } from '@/lib/site';

export default function DashboardOverview() {
  const { user } = useSession();
  const { data, error } = useApi<UserDashboard>('/me/dashboard');
  if (!user) return null;

  const live = data?.listings.published ?? 0;
  const stats = data
    ? [
        { label: 'Live listings', value: live, href: '/dashboard/listings?status=published' },
        {
          label: 'In review',
          value: data.listings.pending,
          href: '/dashboard/listings?status=pending',
        },
        {
          label: 'New leads',
          value: data.leads.unseen,
          href: '/dashboard/leads',
          accent: data.leads.unseen > 0,
        },
        { label: 'Saved properties', value: data.saved, href: '/dashboard/saved' },
      ]
    : [];

  return (
    <div className="space-y-10">
      {!user.phoneVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-50 p-4 text-sm">
          <p className="text-warn">
            Verify your mobile number {formatIndianPhone(user.phone)} to post listings and see
            owners’ contact details.
          </p>
          <Link href="/dashboard/profile#phone" className="btn btn-outline btn-sm">
            Verify now
          </Link>
        </div>
      )}

      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}

      <section aria-label="Summary">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {(data
            ? stats
            : Array.from({ length: 4 }, (_, i) => ({ label: '', value: 0, href: '#', key: i }))
          ).map((s, i) => (
            <div key={s.label || i} className="bg-white p-5">
              {data ? (
                <Link href={s.href} className="group block">
                  <dt className="text-sm text-ink-muted">{s.label}</dt>
                  <dd
                    className={`tabular mt-1 font-display text-[2.2rem] leading-none ${'accent' in s && s.accent ? 'text-accent-700' : 'text-brand-900'} group-hover:text-brand`}
                  >
                    {s.value}
                  </dd>
                </Link>
              ) : (
                <div className="skeleton h-14" />
              )}
            </div>
          ))}
        </dl>
        {data && (
          <p className="mt-3 text-sm text-ink-muted">
            You can have up to {data.listingLimit} active listings ({data.listings.total} created so
            far).
          </p>
        )}
      </section>

      {data && data.listings.total === 0 && (
        <section className="rounded-2xl bg-brand-900 p-8 text-white sm:p-10">
          <h2 className="text-[1.8rem] leading-tight">Post your first property</h2>
          <p className="mt-2 max-w-lg text-white/75">
            Sale or rent, residential or commercial. It takes about ten minutes, and our team
            reviews it before it goes live.
          </p>
          <Link href={POST_PROPERTY_PATH} className="btn btn-accent mt-6">
            Start listing
          </Link>
        </section>
      )}

      {data && data.listings.rejected > 0 && (
        <p className="rounded-xl border border-danger/30 bg-danger-50 p-4 text-sm text-danger">
          {data.listings.rejected} listing{data.listings.rejected === 1 ? ' needs' : 's need'}{' '}
          changes before they can go live.{' '}
          <Link href="/dashboard/listings?status=rejected" className="font-semibold underline">
            See what to fix
          </Link>
        </p>
      )}

      <section>
        <SectionTitle
          title="Latest leads"
          text="People who enquired about or viewed the contact for your listings."
        >
          <Link href="/dashboard/leads" className="btn btn-outline btn-sm">
            All leads
          </Link>
        </SectionTitle>
        {data && data.recentLeads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted">
            No leads yet. They’ll appear here as soon as someone enquires about one of your live
            listings.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {data?.recentLeads.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {l.name}
                    {!l.seen && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-brand-900">
                        New
                      </span>
                    )}
                  </p>
                  <p className="truncate text-ink-muted">
                    {l.type === 'contact' ? 'Viewed your number' : 'Sent an enquiry'}
                    {l.property ? ` for ${l.property.title}` : ''}
                  </p>
                </div>
                <a
                  href={`tel:${l.phone}`}
                  className="tabular font-medium text-brand hover:underline"
                >
                  {formatIndianPhone(l.phone)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
