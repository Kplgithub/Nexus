'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { CheckIcon, ShieldIcon } from '../icons';
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
  const params = useSearchParams();
  // New listings keep an in-browser copy so a refresh doesn't lose work.
  const [f, setF] = useState<ListingFormState>(() => {
    if (listing) return formFromListing(listing);
    const start = readDraft() ?? formFromListing();
    // Coming from the Post Property page with "Sell" or "Rent out" already picked.
    const t = params.get('type');
    return t === 'sale' || t === 'rent' ? { ...start, listingType: t } : start;
  });
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
      // All plan places are taken: keep a new listing as a draft so nothing is lost.
      if (err instanceof ApiClientError && err.code === 'LISTING_LIMIT' && intent === 'pending') {
        try {
          const draft = { ...body, status: 'draft' as const };
          if (listing) {
            await apiFetch(`/me/properties/${listing.id}`, { method: 'PATCH', body: draft });
          } else {
            await apiFetch('/me/properties', { method: 'POST', body: draft });
            writeDraft(null);
          }
          router.push('/dashboard/listings?status=draft&full=1');
          router.refresh();
          return;
        } catch {
          // Fall through and show the limit message on the form.
        }
      }
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

  const strength = listingStrength(f);
  const stepMeta = STEPS.find((x) => x.id === step);
  const stepTitle = stepMeta?.title ?? 'Review and submit';
  const stepHint = stepMeta?.hint ?? 'Check everything once, then send it to our team.';

  return (
    <div ref={top} className="scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-muted">
            {listing ? 'Edit listing' : 'Post a property'} · Step {idx + 1} of {ORDER.length}
          </p>
          <h1 className="text-[1.7rem] leading-tight sm:text-[2.1rem]">{stepTitle}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">{stepHint}</p>
          {listing && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <Pill status={listing.status} label={PROPERTY_STATUS_LABELS[listing.status]} />
              {live && 'Changes to a live listing are reviewed again before they appear.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!listing && (
            <span className="hidden text-[13px] text-ink-muted sm:inline">
              Saved on this device as you type
            </span>
          )}
          <Link href="/dashboard/listings" className="btn btn-outline btn-sm bg-white">
            {listing ? 'Cancel' : 'Exit'}
          </Link>
        </div>
      </div>

      {/* Phone and tablet: a step bar instead of the side list. */}
      <div className="mb-4 xl:hidden">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-bold">
            Step {idx + 1} of {ORDER.length}
          </span>
          <span className="text-ink-muted">
            Listing strength{' '}
            <b className={strength >= 80 ? 'text-success' : 'text-accent-700'}>{strength}%</b>
          </span>
        </div>
        <ol aria-label="Steps" className="mt-2 flex gap-1">
          {ORDER.map((s, i) => (
            <li key={s} className="flex-1">
              <button
                type="button"
                onClick={() => go(s)}
                aria-label={`Step ${i + 1}: ${STEPS.find((x) => x.id === s)?.title ?? 'Review'}`}
                aria-current={s === step ? 'step' : undefined}
                className={`block h-1.5 w-full rounded-full ${
                  stepHasError(s) ? 'bg-danger' : i <= idx ? 'bg-brand' : 'bg-[#e6eaf2]'
                }`}
              />
            </li>
          ))}
        </ol>
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

      <div className="grid items-start gap-5 xl:grid-cols-[16.5rem_1fr_19rem]">
        <aside className="hidden rounded-[18px] border border-[#e6eaf2] bg-white p-5 xl:sticky xl:top-24 xl:block">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Listing strength</p>
            <b className={`tabular ${strength >= 80 ? 'text-success' : 'text-accent'}`}>
              {strength}%
            </b>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef1f6]">
            <i
              className={`block h-full rounded-full ${strength >= 80 ? 'bg-success' : 'bg-gradient-to-r from-accent to-orange-400'}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Complete listings with photos get more enquiries.
          </p>
          <ol aria-label="Steps" className="mt-4">
            {ORDER.map((s, i) => {
              const meta = STEPS.find((x) => x.id === s);
              const done = i < idx;
              const current = s === step;
              const err = stepHasError(s);
              return (
                <li key={s} className="relative">
                  {i < ORDER.length - 1 && (
                    <i
                      aria-hidden
                      className={`absolute bottom-[-6px] left-[13px] top-[38px] w-0.5 ${done ? 'bg-brand' : 'bg-[#e6eaf2]'}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => go(s)}
                    aria-current={current ? 'step' : undefined}
                    className="flex w-full items-start gap-3 py-2.5 text-left"
                  >
                    <span
                      className={`tabular relative z-[1] grid size-7 shrink-0 place-items-center rounded-full text-[12.5px] font-extrabold ${
                        err
                          ? 'bg-danger text-white'
                          : done
                            ? 'bg-brand text-white'
                            : current
                              ? 'border-2 border-brand bg-white text-brand shadow-[0_0_0_4px_#dbe5ff]'
                              : 'border border-[#e6eaf2] bg-[#f4f6fb] text-ink-muted'
                      }`}
                    >
                      {done && !err ? <CheckIcon size={14} /> : i + 1}
                    </span>
                    <span>
                      <span
                        className={`block text-sm ${current || done ? 'font-extrabold text-ink' : 'font-semibold text-ink-muted'}`}
                      >
                        {meta?.title ?? 'Review & submit'}
                      </span>
                      {meta?.hint && (
                        <span className="block text-xs text-ink-muted">{meta.hint}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="min-w-0 rounded-[18px] border border-[#e6eaf2] bg-white p-4 sm:p-7">
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
              <div className="grid gap-8 lg:grid-cols-[1fr_18rem] xl:grid-cols-1">
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
                <div className="xl:hidden">
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

          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-b-[18px] border-t border-[#eef1f6] bg-white px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:px-0 sm:pb-0 sm:pt-5">
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
                  <span className="-ml-1 hidden sm:inline">
                    to{' '}
                    {(STEPS.find((x) => x.id === ORDER[idx + 1])?.title ?? 'review').toLowerCase()}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden xl:sticky xl:top-24 xl:block">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted/80">
            How buyers will see it
          </p>
          <ListingPreview f={f} cities={cities} id={listing?.id} />
          <div className="mt-3.5 flex items-start gap-2.5 rounded-[18px] border border-[#e6eaf2] bg-white p-4">
            <ShieldIcon size={20} className="shrink-0 text-brand" />
            <p className="text-[12.5px] text-ink-soft">
              Our team checks every listing before it goes live. Your full address is never shown.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Rough completeness score shown while posting; photos and a real description count most. */
export function listingStrength(f: ListingFormState): number {
  const residential = f.category === 'residential' && f.propertyType !== 'plot';
  const checks: [boolean, number][] = [
    [!!f.localitySlug, 15],
    [Number(f.price) > 0, 15],
    [Number(f.areaValue) > 0, 15],
    [!residential || Number(f.bedrooms) > 0, 5],
    [f.images.length > 0, 15],
    [f.images.length >= 5, 10],
    [f.title.trim().length >= 8, 10],
    [f.description.trim().length >= 100, 15],
  ];
  return checks.reduce((a, [ok, w]) => a + (ok ? w : 0), 0);
}
