'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  AREA_UNITS,
  AREA_UNIT_LABELS,
  FURNISHING_LABELS,
  FURNISHING_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type City,
} from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { CheckIcon } from '../icons';

type Errors = Record<string, string[] | undefined>;

export function ListPropertyForm({ cities }: { cities: City[] }) {
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const [city, setCity] = useState(cities[0]?.name ?? 'Jaipur');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const opened = useRef(0);
  useEffect(() => {
    opened.current = Date.now();
  }, []);
  const localities = cities.find((c) => c.name === city)?.localities ?? [];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? '').trim();
    const n = (k: string) => (s(k) ? Number(s(k).replace(/[,\s₹]/g, '')) : undefined);
    setErrors({});
    setFormError(null);
    if (!fd.get('consent')) {
      setErrors({ consent: ['Please agree to be contacted'] });
      return;
    }
    setState('sending');
    try {
      const { data } = await apiFetch<{ leadId: string }>('/property-submissions', {
        method: 'POST',
        body: {
          ownerName: s('ownerName'),
          phone: s('phone'),
          email: s('email'),
          relationship: s('relationship') || 'owner',
          category,
          propertyType: s('propertyType'),
          city,
          locality: s('locality'),
          expectedRent: n('expectedRent'),
          areaValue: n('areaValue'),
          areaUnit: s('areaUnit') || 'sqft',
          bedrooms: category === 'residential' ? n('bedrooms') : undefined,
          furnishingStatus: s('furnishingStatus') || undefined,
          availableFrom: s('availableFrom') || undefined,
          description: s('description'),
          consent: true,
          website: s('website'),
          elapsedMs: Date.now() - opened.current,
        },
      });
      setLeadId(data.leadId);
      setState('done');
    } catch (err) {
      setState('idle');
      if (err instanceof ApiClientError) {
        if (err.details) setErrors(err.details);
        setFormError(err.message);
      } else setFormError('Something went wrong. Please try again or call us.');
    }
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-success/30 bg-success-50 p-8"
      >
        <p className="flex items-center gap-2 text-lg font-semibold text-success">
          <CheckIcon /> Thank you — we have your details
        </p>
        <p className="mt-2 text-ink-soft">
          Our team will call you to discuss your property. Nothing is published until you approve
          it.
        </p>
        {leadId && (
          <p className="mt-2 text-sm text-ink-muted">
            Reference: <strong className="text-ink">{leadId}</strong>
          </p>
        )}
        <Link href="/" className="btn btn-outline mt-6">
          Back to home
        </Link>
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];
  const fieldErr = (k: string) => err(k) && <p className="field-error">{err(k)}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lp-name" className="field-label">
              Full name
            </label>
            <input
              id="lp-name"
              name="ownerName"
              required
              autoComplete="name"
              className="field"
              aria-invalid={!!err('ownerName')}
            />
            {fieldErr('ownerName')}
          </div>
          <div>
            <label htmlFor="lp-phone" className="field-label">
              Mobile number
            </label>
            <input
              id="lp-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              className="field"
              aria-invalid={!!err('phone')}
            />
            {fieldErr('phone')}
          </div>
          <div>
            <label htmlFor="lp-email" className="field-label">
              Email <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="lp-email"
              name="email"
              type="email"
              autoComplete="email"
              className="field"
              aria-invalid={!!err('email')}
            />
            {fieldErr('email')}
          </div>
          <div>
            <label htmlFor="lp-rel" className="field-label">
              You are the
            </label>
            <select id="lp-rel" name="relationship" className="field" defaultValue="owner">
              <option value="owner">Owner</option>
              <option value="family">Owner’s family member</option>
              <option value="authorised-agent">Authorised representative</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Property</legend>
        <div
          role="radiogroup"
          aria-label="Category"
          className="inline-flex rounded-lg bg-surface p-1"
        >
          {(['residential', 'commercial'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${category === c ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-muted'}`}
            >
              {c === 'residential' ? 'Residential' : 'Commercial'}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lp-type" className="field-label">
              Property type
            </label>
            <select
              id="lp-type"
              name="propertyType"
              required
              className="field"
              key={category}
              defaultValue={PROPERTY_TYPES[category][0]}
            >
              {PROPERTY_TYPES[category].map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lp-city" className="field-label">
              City
            </label>
            <select
              id="lp-city"
              name="city"
              className="field"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities.length === 0 && <option>Jaipur</option>}
              {cities.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lp-loc" className="field-label">
              Locality
            </label>
            <input
              id="lp-loc"
              name="locality"
              list="lp-loc-list"
              required
              className="field"
              placeholder="e.g. Vaishali Nagar"
              aria-invalid={!!err('locality')}
            />
            <datalist id="lp-loc-list">
              {localities.map((l) => (
                <option key={l.slug} value={l.name} />
              ))}
            </datalist>
            {fieldErr('locality')}
          </div>
          <div>
            <label htmlFor="lp-rent" className="field-label">
              Expected monthly rent (₹)
            </label>
            <input
              id="lp-rent"
              name="expectedRent"
              inputMode="numeric"
              className="field"
              placeholder="e.g. 25000"
              aria-invalid={!!err('expectedRent')}
            />
            {fieldErr('expectedRent')}
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <div>
              <label htmlFor="lp-area" className="field-label">
                Area
              </label>
              <input
                id="lp-area"
                name="areaValue"
                inputMode="decimal"
                className="field"
                aria-invalid={!!err('areaValue')}
              />
            </div>
            <div>
              <label htmlFor="lp-unit" className="field-label">
                Unit
              </label>
              <select id="lp-unit" name="areaUnit" className="field" defaultValue="sqft">
                {AREA_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {AREA_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {category === 'residential' && (
            <div>
              <label htmlFor="lp-bed" className="field-label">
                Bedrooms
              </label>
              <select id="lp-bed" name="bedrooms" className="field" defaultValue="">
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6].map((b) => (
                  <option key={b} value={b}>
                    {b} BHK
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="lp-furn" className="field-label">
              Furnishing
            </label>
            <select id="lp-furn" name="furnishingStatus" className="field" defaultValue="">
              <option value="">Select</option>
              {FURNISHING_STATUSES.map((f) => (
                <option key={f} value={f}>
                  {FURNISHING_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lp-avail" className="field-label">
              Available from
            </label>
            <input id="lp-avail" name="availableFrom" type="date" className="field" />
          </div>
        </div>
        <div>
          <label htmlFor="lp-desc" className="field-label">
            Anything else we should know?
          </label>
          <textarea
            id="lp-desc"
            name="description"
            maxLength={3000}
            className="field"
            placeholder="Floor, parking, preferred tenants, nearby landmarks…"
          />
        </div>
      </fieldset>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lp-website">Website</label>
        <input id="lp-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="consent"
            value="true"
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
          />
          <span>
            I agree to be contacted by NEXUS Estate about listing this property and accept the{' '}
            <Link href="/privacy-policy" className="text-brand underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {fieldErr('consent')}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full sm:w-auto sm:px-8"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Submitting…' : 'Submit property details'}
      </button>
    </form>
  );
}
