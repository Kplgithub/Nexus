'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  LISTING_VISIBILITY,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  USER_ROLE_LABELS,
  formatIndianPhone,
  formatPrice,
  type AdminProperty,
  type City,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import {
  Check,
  Field,
  Group,
  ListingFields,
  ListingPreview,
  adminPayload,
  formFromListing,
  type ListingFormState,
} from '../listing/ListingForm';
import { StatusPill, useAdmin } from './AdminShell';
import { useApi } from './useApi';

export function PropertyEditor({ property }: { property?: AdminProperty }) {
  const router = useRouter();
  const { toast } = useAdmin();
  const [f, setFState] = useState<ListingFormState>(() => formFromListing(property));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { data: cities } = useApi<City[]>('/admin/locations');

  const setF = (fn: (s: ListingFormState) => ListingFormState) => {
    setFState(fn);
    setDirty(true);
  };
  const set = <K extends keyof ListingFormState>(k: K, v: ListingFormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];
  const errorList = useMemo(() => Object.entries(errors), [errors]);
  const userListing = !!property?.postedBy;
  const statuses = PROPERTY_STATUSES.filter((s) =>
    f.listingType === 'sale' ? s !== 'rented' : s !== 'sold',
  );

  async function save(statusOverride?: AdminProperty['status']) {
    setSaving(true);
    setErrors({});
    const body = adminPayload(f, statusOverride);
    try {
      const { data } = property
        ? await apiFetch<AdminProperty>(`/admin/properties/${property.id}`, {
            method: 'PATCH',
            body,
          })
        : await apiFetch<AdminProperty>('/admin/properties', { method: 'POST', body });
      toast(statusOverride === 'published' ? 'Saved and published' : 'Saved');
      setDirty(false);
      if (!property) router.replace(`/admin/properties/${data.id}`);
      else {
        setFState(formFromListing(data));
        router.refresh();
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.details) setErrors(e.details);
      toast(e instanceof ApiClientError ? e.message : 'Save failed', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6 pb-28"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{property ? 'Edit property' : 'New property'}</h1>
          {property && (
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
              <StatusPill status={property.status} /> /properties/{property.slug}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/properties" className="btn btn-ghost">
            Back
          </Link>
          {property && ['published', 'rented', 'sold'].includes(property.status) && (
            <a
              href={`/properties/${property.slug}`}
              target="_blank"
              rel="noopener"
              className="btn btn-outline"
            >
              View live
            </a>
          )}
        </div>
      </div>

      {property?.postedBy && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-ink-muted">
              Posted by {USER_ROLE_LABELS[property.postedBy.role]}
            </p>
            <p className="font-semibold">
              {property.poster.companyName ? `${property.poster.companyName} — ` : ''}
              {property.postedBy.name}
            </p>
            <p className="text-sm text-ink-soft">
              {formatIndianPhone(property.postedBy.phone)} · {property.postedBy.email}
            </p>
          </div>
          <Link href={`/admin/users/${property.postedBy.id}`} className="btn btn-outline btn-sm">
            View user
          </Link>
        </section>
      )}

      {property?.status === 'pending' && <ModerationBar property={property} />}

      {errorList.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-50 p-4 text-sm text-danger"
        >
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc pl-5">
            {errorList.map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {v[0]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Group title="Publishing">
        <div className="grid gap-4 md:grid-cols-3">
          <Field error={err('status')} id="status" label="Status">
            <select
              id="status"
              className="field"
              value={f.status}
              onChange={(e) => set('status', e.target.value as ListingFormState['status'])}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {PROPERTY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={err('listingVisibility')}
            id="listingVisibility"
            label="Visibility"
            hint="Unlisted = only people with the link can see it."
          >
            <select
              id="listingVisibility"
              className="field"
              value={f.listingVisibility}
              onChange={(e) =>
                set('listingVisibility', e.target.value as ListingFormState['listingVisibility'])
              }
            >
              {LISTING_VISIBILITY.map((v) => (
                <option key={v} value={v}>
                  {v === 'public' ? 'Public' : 'Unlisted'}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-1">
            <Check
              checked={f.featured}
              onChange={(v) => set('featured', v)}
              label="Feature on the home page"
            />
            <Check
              checked={f.verified}
              onChange={(v) => set('verified', v)}
              label="Mark as verified (details checked by our team)"
            />
          </div>
        </div>
        {userListing && (
          <p className="mt-3 text-sm text-ink-muted">
            This listing belongs to a user. Use the review buttons above to approve or reject it, so
            the poster is notified.
          </p>
        )}
      </Group>

      <ListingFields
        f={f}
        setF={setF}
        errors={errors}
        cities={cities ?? []}
        uploadPath="/admin/uploads"
        showBusinessHints
      />

      <Group title="Preview">
        <p className="mb-4 text-sm text-ink-muted">How this listing appears in search results.</p>
        <div className="max-w-sm">
          <ListingPreview f={f} cities={cities ?? []} id={property?.id} isDemo={property?.isDemo} />
        </div>
      </Group>

      <Group title="Search engine listing (optional)">
        <div className="grid gap-4">
          <Field
            error={err('slug')}
            id="slug"
            label="URL slug"
            hint={
              property
                ? 'Changing this keeps the old URL redirecting here.'
                : 'Leave empty to generate from the title.'
            }
          >
            <input
              id="slug"
              className="field"
              value={f.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
              aria-invalid={!!err('slug')}
            />
          </Field>
          <Field
            error={err('seoTitle')}
            id="seoTitle"
            label={`SEO title (${f.seoTitle.length}/70)`}
          >
            <input
              id="seoTitle"
              className="field"
              maxLength={70}
              value={f.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
            />
          </Field>
          <Field
            error={err('seoDescription')}
            id="seoDescription"
            label={`Meta description (${f.seoDescription.length}/170)`}
          >
            <textarea
              id="seoDescription"
              className="field min-h-20"
              maxLength={170}
              value={f.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
          </Field>
        </div>
      </Group>

      <Group title="Private (never shown publicly)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={err('ownerReference')} id="ownerReference" label="Owner / lead reference">
            <input
              id="ownerReference"
              className="field"
              maxLength={200}
              value={f.ownerReference}
              onChange={(e) => set('ownerReference', e.target.value)}
            />
          </Field>
          <Field error={err('internalNotes')} id="internalNotes" label="Internal notes">
            <textarea
              id="internalNotes"
              className="field"
              maxLength={4000}
              value={f.internalNotes}
              onChange={(e) => set('internalNotes', e.target.value)}
            />
          </Field>
        </div>
      </Group>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-ink-muted">
            {Number(f.price) > 0 ? formatPrice(Number(f.price), f.listingType) : 'No price set'} ·{' '}
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-outline" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {f.status !== 'published' && !(userListing && property?.status === 'pending') && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => save('published')}
              >
                Save &amp; publish
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

/** Approve or reject a listing submitted by a user. Rejections need a note for the poster. */
export function ModerationBar({
  property,
  onDone,
}: {
  property: Pick<AdminProperty, 'id' | 'title'>;
  onDone?: () => void;
}) {
  const { toast } = useAdmin();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function decide(status: 'published' | 'rejected') {
    if (status === 'rejected' && note.trim().length < 5) {
      toast('Add a short note so the poster knows what to fix', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/admin/properties/${property.id}/status`, {
        method: 'POST',
        body: { status, note: status === 'rejected' ? note.trim() : undefined },
      });
      toast(status === 'published' ? 'Approved and published' : 'Rejected — poster notified');
      setRejecting(false);
      setNote('');
      // The editor holds its own form state, so reload it to pick up the new status.
      if (onDone) onDone();
      else window.location.reload();
    } catch (e) {
      toast(e instanceof ApiClientError ? e.message : 'Could not update', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-accent-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-brand-900">Waiting for review</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() => setRejecting((r) => !r)}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => void decide('published')}
          >
            Approve &amp; publish
          </button>
        </div>
      </div>
      {rejecting && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`note-${property.id}`} className="field-label">
            What should the poster fix? (sent to them)
          </label>
          <textarea
            id={`note-${property.id}`}
            className="field min-h-20"
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Photos are blurry; please add at least three clear photos of the rooms."
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => void decide('rejected')}
            >
              Reject listing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
