'use client';

import Link from 'next/link';
import type { SentEnquiry } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { SectionTitle } from '@/components/dashboard/DashboardShell';

export default function MyEnquiriesPage() {
  const { data, error, loading } = useApi<SentEnquiry[]>('/me/enquiries?limit=50');
  return (
    <div>
      <SectionTitle
        title="My enquiries"
        text="Messages you’ve sent and contacts you’ve viewed while signed in."
      />
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && !data && <div className="skeleton h-40" />}
      {data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-ink-muted">
          You haven’t contacted anyone yet.
        </p>
      )}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {data?.map((e) => (
          <li key={e.id} className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                {e.property ? (
                  <Link href={`/properties/${e.property.slug}`} className="hover:text-brand">
                    {e.property.title}
                  </Link>
                ) : (
                  'General enquiry'
                )}
              </p>
              <p className="text-xs text-ink-muted">
                {new Date(e.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·{' '}
                {e.leadId}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {e.type === 'contact' ? 'You viewed the contact number.' : e.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
