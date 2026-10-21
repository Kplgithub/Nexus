'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatIndianPhone, whatsappLink, type ReceivedLead } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { SectionTitle } from '@/components/dashboard/DashboardShell';
import { MailIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons';
import { apiFetch } from '@/lib/client-api';

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const { data, meta, error, loading } = useApi<ReceivedLead[]>(`/me/leads?page=${page}&limit=20`);

  // Opening the page counts as seeing these leads.
  useEffect(() => {
    const unseen = data?.filter((l) => !l.seen).map((l) => l.id) ?? [];
    if (unseen.length)
      void apiFetch('/me/leads/seen', { method: 'POST', body: { ids: unseen } }).catch(
        () => undefined,
      );
  }, [data]);

  return (
    <div>
      <SectionTitle
        title="Leads"
        text="Enquiries for your listings, and people who viewed your number. Reply quickly — it makes a difference."
      />
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && !data && <div className="skeleton h-40" />}
      {data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-ink-muted">
          No leads yet. Leads appear here when someone enquires about one of your live listings.
        </p>
      )}
      <ul className="space-y-3">
        {data?.map((l) => (
          <li key={l.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {l.name}
                  {!l.seen && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-brand-900">
                      New
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-muted">
                  {l.type === 'contact' ? 'Viewed your phone number' : 'Sent an enquiry'}
                  {l.property && (
                    <>
                      {' '}
                      for{' '}
                      <Link
                        href={`/properties/${l.property.slug}`}
                        className="text-brand hover:underline"
                      >
                        {l.property.title}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <p className="text-xs text-ink-muted">
                {new Date(l.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                · {l.leadId}
              </p>
            </div>
            {l.type !== 'contact' && l.message && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-surface p-3 text-sm text-ink-soft">
                {l.message}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${l.phone}`} className="btn btn-outline btn-sm">
                <PhoneIcon size={15} /> {formatIndianPhone(l.phone)}
              </a>
              <a
                href={whatsappLink(
                  l.phone,
                  `Hello ${l.name}, regarding your enquiry${l.property ? ` for "${l.property.title}"` : ''} on NEXUS Estate.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <WhatsAppIcon size={15} /> WhatsApp
              </a>
              {l.email && (
                <a href={`mailto:${l.email}`} className="btn btn-ghost btn-sm">
                  <MailIcon size={15} /> Email
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex justify-between">
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
      )}
    </div>
  );
}
