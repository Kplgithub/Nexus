'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatPrice,
  type City,
  type OwnListing,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import {
  ListingFields,
  ListingPreview,
  STEPS,
  formFromListing,
  stepForField,
  userPayload,
  type ListingFormState,
  type StepId,
} from '../listing/ListingForm';
import { useSession } from '../session/SessionProvider';
import { CheckIcon } from '../icons';
import { Pill } from './DashboardShell';

type WizardStep = StepId | 'review';
const ORDER: WizardStep[] = [...STEPS.map((s) => s.id), 'review'];
const DRAFT_KEY = 'nexus:new-listing';

function readDraft(): ListingFormState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    // Merge over defaults so drafts saved before new fields existed still load.
    return raw ? { ...formFromListing(), ...(JSON.parse(raw) as Partial<ListingFormState>) } : null;
  } catch {
    return null;
  }
}
function writeDraft(f: ListingFormState | null) {
  try {
    if (f) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(f));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable — the form still works */
  }
}

/** Step-by-step posting form for owners, agents and builders. */
export function ListingWizard({ listing }: { listing?: OwnListing }) {
  const router = useRouter();
  const { user } = useSession();
  // New listings keep an in-browser copy so a refresh doesn't lose work.
  const [f, setF] = useState<ListingFormState>(() =>
    listing ? formFromListing(listing) : (readDraft() ?? formFromListing()),
  );
  const [step, setStep] = useState<WizardStep>('basics');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [restored, setRestored] = useState(() => !listing && readDraft() !== null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<City[]>('/locations')
      .then(({ data }) => {
        setCities(data);
        // One city (launch): pre-select it for new listings.
        if (!listing && data.length === 1)
          setF((s) => (s.citySlug ? s : { ...s, citySlug: data[0]!.slug }));
      })
      .catch(() => setCities([]));
  }, [listing]);

  useEffect(() => {
    if (!listing) writeDraft(f);
  }, [f, listing]);

  const idx = ORDER.indexOf(step);
  const go = (s: WizardStep) => {
    setStep(s);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const live = listing?.status === 'published';
  const stepHasError = (s: WizardStep) => Object.keys(errors).some((k) => stepForField(k) === s);

  async function save(intent: 'draft' | 'pending') {
    setBusy(true);
    setErrors({});
    setFormError(null);
    const body = { ...userPayload(f), status: intent };
    try {
      const { data: saved } = listing
        ? await apiFetch<OwnListing>(`/me/properties/${listing.id}`, { method: 'PATCH', body })
        : await apiFetch<OwnListing>('/me/properties', { method: 'POST', body });
      if (!listing) writeDraft(null);
      // No free listing left and no plan: it is saved, and the plan page takes over.
      if (saved.awaitingPlan) router.push(`/dashboard/plans?saved=${saved.id}`);
      else router.push(`/dashboard/listings?status=${intent}`);
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.details) {
          setErrors(err.details);
          const first = Object.keys(err.details)[0];
          if (first) go(stepForField(first));
        }
      } else setFormError('Could not save. Check your connection and try again.');
    }
  }

  const city = cities.find((c) => c.slug === f.citySlug);
  const summary: [string, string][] = [
    ['Deal', f.listingType === 'sale' ? 'For sale' : 'For rent'],
    ['Type', PROPERTY_TYPE_LABELS[f.propertyType]],
    [
      'Location',
      [city?.localities.find((l) => l.slug === f.localitySlug)?.name, city?.name]
        .filter(Boolean)
        .join(', ') || '—',
    ],
    ['Price', Number(f.price) > 0 ? formatPrice(Number(f.price), f.listingType) : '—'],
    ['Area', Number(f.areaValue) > 0 ? formatArea(Number(f.areaValue), f.areaUnit) : '—'],
    ['Photos', String(f.images.length)],
  ];
  const missing = [
    !f.citySlug || !f.localitySlug ? 'Choose the city and locality' : null,
    !(Number(f.price) > 0) ? 'Add the price' : null,
    !(Number(f.areaValue) > 0) ? 'Add the area' : null,
    f.images.length === 0 ? 'Add at least one photo' : null,
    f.title.trim().length < 8 ? 'Write a title (8+ characters)' : null,
    f.description.trim().length < 30 ? 'Write a description (30+ characters)' : null,
  ].filter(Boolean) as string[];

  return (
    <div ref={top} className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.6rem] leading-tight">
            {listing ? 'Edit listing' : 'Post a property'}
          </h2>
          {listing && (
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
              <Pill status={listing.status} label={PROPERTY_STATUS_LABELS[listing.status]} />
              {live && 'Changes to a live listing are reviewed again before they appear.'}
            </p>
          )}
        </div>
        <Link href="/dashboard/listings" className="btn btn-ghost btn-sm">
          Cancel
        </Link>
      </div>

      {restored && !listing && (
        <p className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3 text-sm text-ink-soft">
          We restored the listing you were working on.
          <button
            type="button"
            className="font-semibold text-brand hover:underline"
            onClick={() => {
              writeDraft(null);
              setF(formFromListing());
              setRestored(false);
            }}
          >
            Start over
          </button>
        </p>
      )}

      {listing?.status === 'rejected' && listing.moderationNote && (
        <p className="mb-5 rounded-lg bg-danger-50 p-3 text-sm text-danger">
          <strong>Requested changes:</strong> {listing.moderationNote}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[13rem_1fr]">
        <ol aria-label="Steps" className="flex gap-1 overflow-x-auto xl:flex-col">
          {ORDER.map((s, i) => {
            const meta = STEPS.find((x) => x.id === s);
            const done = i < idx;
            const current = s === step;
            return (
              <li key={s} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(s)}
                  aria-current={current ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${current ? 'bg-brand-50 font-semibold text-brand-900' : 'text-ink-soft hover:bg-surface'}`}
                >
                  <span
                    className={`tabular grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                      stepHasError(s)
                        ? 'bg-danger text-white'
                        : done
                          ? 'bg-brand text-white'
                          : current
                            ? 'border-2 border-brand text-brand'
                            : 'border border-line-strong text-ink-muted'
                    }`}
                  >
                    {done && !stepHasError(s) ? <CheckIcon size={12} /> : i + 1}
                  </span>
                  {meta?.title ?? 'Review'}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-8">
          {step !== 'review' ? (
            <ListingFields
              f={f}
              setF={setF}
              errors={errors}
              cities={cities}
              step={step}
              uploadPath="/me/uploads"
              showBusinessHints={user?.role === 'builder'}
            />
          ) : (
            <section>
              <h2 className="mb-6 text-[1.6rem] leading-tight">Review and submit</h2>
              <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
                <div>
                  <dl className="divide-y divide-line border-y border-line">
                    {summary.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                        <dt className="text-ink-muted">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {missing.length > 0 ? (
                    <div className="mt-5 rounded-xl bg-warn-50 p-4 text-sm text-warn">
                      <p className="font-semibold">Before you submit</p>
                      <ul className="mt-1 list-disc pl-5">
                        {missing.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                      <p className="mt-2">You can still save it as a draft.</p>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-xl bg-success-50 p-4 text-sm text-success">
                      Looks complete. Submit it and our team will review it before it goes live.
                    </p>
                  )}
                  {user && !user.phoneVerified && (
                    <p className="mt-4 text-sm text-ink-muted">
                      You’ll need to{' '}
                      <Link
                        href="/dashboard/profile#phone"
                        className="font-semibold text-brand underline"
                      >
                        verify your mobile number
                      </Link>{' '}
                      before submitting.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-3 text-sm text-ink-muted">How it will look in search</p>
                  <ListingPreview f={f} cities={cities} id={listing?.id} />
                </div>
              </div>
            </section>
          )}

          {formError && (
            <p role="alert" className="mt-6 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={idx === 0}
              onClick={() => go(ORDER[idx - 1]!)}
            >
              Back
            </button>
            <div className="flex flex-wrap gap-2">
              {!live && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void save('draft')}
                >
                  {busy ? 'Saving…' : 'Save draft'}
                </button>
              )}
              {step === 'review' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void save('pending')}
                >
                  {busy ? 'Submitting…' : live ? 'Submit changes for review' : 'Submit for review'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => go(ORDER[idx + 1]!)}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
