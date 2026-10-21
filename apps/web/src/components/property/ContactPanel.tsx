'use client';

import Link from 'next/link';
import { useState } from 'react';
import { POSTER_LABELS, formatIndianPhone, whatsappLink, type ListingPoster } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { EnquiryForm } from '../forms/EnquiryForm';
import { BadgeCheckIcon, PhoneIcon, WhatsAppIcon } from '../icons';

type Revealed = { name: string; contactPerson: string; phone: string; whatsapp: string | null };

/**
 * Sidebar on the property page. NEXUS listings show the office number; listings
 * posted by owners, agents and builders reveal the poster's number only to
 * signed-in visitors (and log it as a lead for the poster).
 */
export function ContactPanel({
  propertyId,
  propertyTitle,
  slug,
  poster,
  closed,
  office,
  shareUrl,
}: {
  propertyId: string;
  propertyTitle: string;
  slug: string;
  poster: ListingPoster;
  closed: boolean;
  office: { phone: string; whatsapp: string };
  shareUrl: string;
}) {
  const { user, requireLogin } = useSession();
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const isNexus = poster.type === 'nexus';
  const displayName = isNexus
    ? 'NEXUS Estate'
    : poster.companyName || poster.name || POSTER_LABELS[poster.type];
  const waText = `Hello, I'm interested in "${propertyTitle}" (${shareUrl}). Is it available?`;

  async function reveal() {
    if (!user) return requireLogin('contact');
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiFetch<Revealed>(`/me/contact/${propertyId}`, { method: 'POST' });
      setRevealed(data);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: 'ERROR', message: 'Could not load contact details. Please try again.' },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-surface px-6 py-5">
        <p className="text-sm text-ink-muted">
          {isNexus ? 'Listed by' : `Posted by ${POSTER_LABELS[poster.type].toLowerCase()}`}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold">
          {displayName}
          {(isNexus || poster.verified) && (
            <BadgeCheckIcon size={18} className="text-accent-700" aria-label="Verified" />
          )}
        </p>
        {poster.memberSince && !isNexus && (
          <p className="text-xs text-ink-muted">
            On NEXUS Estate since{' '}
            {new Date(poster.memberSince).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="p-6">
        {closed ? (
          <p className="text-sm text-ink-soft">
            This listing is closed. Send an enquiry and we’ll suggest similar options.
          </p>
        ) : isNexus ? (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${office.phone}`} className="btn btn-outline">
              <PhoneIcon size={18} /> Call
            </a>
            <a
              href={whatsappLink(office.whatsapp, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <WhatsAppIcon size={18} /> WhatsApp
            </a>
            <p className="col-span-2 text-center text-xs text-ink-muted">
              {formatIndianPhone(office.phone)}
            </p>
          </div>
        ) : revealed ? (
          <div className="rounded-xl bg-accent-50 p-4">
            <p className="text-sm text-ink-soft">{revealed.contactPerson}</p>
            <p className="tabular mt-0.5 text-xl font-semibold">
              {formatIndianPhone(revealed.phone)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${revealed.phone}`} className="btn btn-primary btn-sm">
                <PhoneIcon size={16} /> Call
              </a>
              {revealed.whatsapp ? (
                <a
                  href={whatsappLink(revealed.whatsapp, waText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <WhatsAppIcon size={16} /> WhatsApp
                </a>
              ) : (
                <span />
              )}
            </div>
          </div>
        ) : poster.canRevealPhone ? (
          <div>
            <button
              type="button"
              onClick={() => void reveal()}
              disabled={busy}
              className="btn btn-primary w-full"
            >
              <PhoneIcon size={18} /> {busy ? 'Loading…' : 'View phone number'}
            </button>
            {!user && (
              <p className="mt-2 text-center text-xs text-ink-muted">Free account required</p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger"
              >
                {error.message}{' '}
                {error.code === 'PHONE_NOT_VERIFIED' && (
                  <Link href="/dashboard/profile#phone" className="font-semibold underline">
                    Verify now
                  </Link>
                )}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            {displayName} prefers to be contacted through the form below.
          </p>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" /> or send a message{' '}
          <span className="h-px flex-1 bg-line" />
        </div>
        <EnquiryForm
          type="property"
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          sourcePage={`/properties/${slug}`}
          submitLabel="Send enquiry"
          recipient={isNexus ? undefined : displayName}
        />
      </div>
    </div>
  );
}
