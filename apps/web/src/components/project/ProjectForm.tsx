'use client';

import { useEffect, useState } from 'react';
import {
  AMENITIES,
  AMENITY_LABELS,
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_UNIT_TYPES,
  PROPERTY_TYPE_LABELS,
  formatINRShort,
  type AdminProject,
  type City,
  type GeoPointValue,
  type OwnProject,
  type ProjectStage,
  type ProjectUnitType,
  type PropertyImage,
  coverFirst,
} from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { ImageManager } from '../admin/ImageManager';
import { Check, Field, Group } from '../listing/ListingForm';
import { PinPicker } from '../map/Map';
import { CheckIcon, PlusIcon, TrashIcon } from '../icons';

/** Numbers are strings while typing; converted in projectPayload. */
type ConfigState = {
  unitType: ProjectUnitType;
  bedrooms: string;
  minAreaSqft: string;
  maxAreaSqft: string;
  minPrice: string;
  maxPrice: string;
  floorPlanUrl: string;
};

export type ProjectFormState = {
  name: string;
  description: string;
  highlights: string;
  citySlug: string;
  localitySlug: string;
  address: string;
  location: GeoPointValue | null;
  stage: ProjectStage;
  launchDate: string;
  possessionDate: string;
  reraId: string;
  totalUnits: string;
  totalTowers: string;
  landAreaAcres: string;
  configurations: ConfigState[];
  amenities: string[];
  images: PropertyImage[];
  coverImageIndex: number;
  brochureUrl: string;
  videoUrl: string;
  // Staff only
  featured: boolean;
  slug: string;
  seoTitle: string;
  seoDescription: string;
};

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[,\s₹]/g, '')));
const opt = (s: string) => s.trim();

const emptyConfig = (): ConfigState => ({
  unitType: 'apartment',
  bedrooms: '2',
  minAreaSqft: '',
  maxAreaSqft: '',
  minPrice: '',
  maxPrice: '',
  floorPlanUrl: '',
});

export function formFromProject(p?: OwnProject | AdminProject): ProjectFormState {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    highlights: p?.highlights.join('\n') ?? '',
    citySlug: p?.citySlug ?? '',
    localitySlug: p?.localitySlug ?? '',
    address: p?.address ?? '',
    location: p?.location ?? null,
    stage: p?.stage ?? 'under-construction',
    launchDate: p?.launchDate?.slice(0, 10) ?? '',
    possessionDate: p?.possessionDate?.slice(0, 10) ?? '',
    reraId: p?.reraId ?? '',
    totalUnits: str(p?.totalUnits),
    totalTowers: str(p?.totalTowers),
    landAreaAcres: str(p?.landAreaAcres),
    configurations: p?.configurations.length
      ? p.configurations.map((c) => ({
          unitType: c.unitType,
          bedrooms: str(c.bedrooms),
          minAreaSqft: str(c.minAreaSqft),
          maxAreaSqft: str(c.maxAreaSqft),
          minPrice: str(c.minPrice),
          maxPrice: str(c.maxPrice),
          floorPlanUrl: c.floorPlanUrl ?? '',
        }))
      : [emptyConfig()],
    amenities: p?.amenities ?? [],
    // The first photo is the cover; older records may point at another one.
    images: coverFirst(p?.images ?? [], p?.coverImageIndex),
    coverImageIndex: 0,
    brochureUrl: p?.brochureUrl ?? '',
    videoUrl: p?.videoUrl ?? '',
    featured: p?.featured ?? false,
    slug: p?.slug ?? '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
  };
}

const hasRooms = (t: ProjectUnitType) => !['plot', 'office', 'shop'].includes(t);

export function projectPayload(f: ProjectFormState) {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    highlights: f.highlights
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean),
    citySlug: f.citySlug,
    localitySlug: f.localitySlug,
    address: opt(f.address),
    location: f.location,
    stage: f.stage,
    launchDate: f.launchDate || null,
    possessionDate: f.possessionDate || null,
    reraId: opt(f.reraId),
    totalUnits: num(f.totalUnits),
    totalTowers: num(f.totalTowers),
    landAreaAcres: num(f.landAreaAcres),
    configurations: f.configurations.map((c) => {
      const minA = num(c.minAreaSqft) ?? 0;
      const minP = num(c.minPrice) ?? 0;
      return {
        unitType: c.unitType,
        bedrooms: hasRooms(c.unitType) ? num(c.bedrooms) : null,
        minAreaSqft: minA,
        maxAreaSqft: num(c.maxAreaSqft) ?? minA,
        minPrice: minP,
        maxPrice: num(c.maxPrice) ?? minP,
        floorPlanUrl: c.floorPlanUrl.trim(),
      };
    }),
    amenities: f.amenities,
    images: f.images,
    coverImageIndex: f.coverImageIndex,
    brochureUrl: f.brochureUrl.trim(),
    videoUrl: f.videoUrl.trim(),
  };
}

export function adminProjectPayload(f: ProjectFormState) {
  return {
    ...projectPayload(f),
    featured: f.featured,
    ...(f.slug ? { slug: f.slug } : {}),
    seoTitle: f.seoTitle.trim(),
    seoDescription: f.seoDescription.trim(),
  };
}

type Errors = Record<string, string[] | undefined>;

/** Every project field, used by the builder's dashboard and the staff editor. */
export function ProjectFields({
  f,
  setF,
  errors,
  uploadPath,
  staff,
}: {
  f: ProjectFormState;
  setF: (fn: (s: ProjectFormState) => ProjectFormState) => void;
  errors: Errors;
  uploadPath: string;
  staff?: boolean;
}) {
  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    apiFetch<City[]>(staff ? '/admin/locations' : '/locations')
      .then(({ data }) => {
        setCities(data);
        if (data.length === 1) setF((s) => (s.citySlug ? s : { ...s, citySlug: data[0]!.slug }));
      })
      .catch(() => setCities([]));
  }, [staff, setF]);

  const set = <K extends keyof ProjectFormState>(k: K, v: ProjectFormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));
  const setConfig = (i: number, patch: Partial<ConfigState>) =>
    setF((s) => ({
      ...s,
      configurations: s.configurations.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    }));
  const err = (k: string) => errors[k]?.[0];
  const city = cities.find((c) => c.slug === f.citySlug);
  const locality = city?.localities.find((l) => l.slug === f.localitySlug);
  const digits = (v: string) => v.replace(/[^\d]/g, '');

  return (
    <div className="space-y-6">
      <Group title="Project">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="name" label="Project name" error={err('name')}>
            <input
              id="name"
              className="field"
              maxLength={100}
              value={f.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field id="stage" label="Stage" error={err('stage')}>
            <select
              id="stage"
              className="field"
              value={f.stage}
              onChange={(e) => set('stage', e.target.value as ProjectStage)}
            >
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="reraId"
            label="RERA registration number"
            hint="Rajasthan RERA number, e.g. RAJ/P/2024/1234. Required for most projects."
            error={err('reraId')}
          >
            <input
              id="reraId"
              className="field"
              maxLength={60}
              value={f.reraId}
              onChange={(e) => set('reraId', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="launchDate" label="Launched" error={err('launchDate')}>
              <input
                id="launchDate"
                type="date"
                className="field"
                value={f.launchDate}
                onChange={(e) => set('launchDate', e.target.value)}
              />
            </Field>
            <Field id="possessionDate" label="Possession" error={err('possessionDate')}>
              <input
                id="possessionDate"
                type="date"
                className="field"
                value={f.possessionDate}
                onChange={(e) => set('possessionDate', e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <Field id="totalUnits" label="Total units" error={err('totalUnits')}>
              <input
                id="totalUnits"
                className="field tabular"
                inputMode="numeric"
                value={f.totalUnits}
                onChange={(e) => set('totalUnits', digits(e.target.value))}
              />
            </Field>
            <Field id="totalTowers" label="Towers / blocks" error={err('totalTowers')}>
              <input
                id="totalTowers"
                className="field tabular"
                inputMode="numeric"
                value={f.totalTowers}
                onChange={(e) => set('totalTowers', digits(e.target.value))}
              />
            </Field>
            <Field id="landAreaAcres" label="Land (acres)" error={err('landAreaAcres')}>
              <input
                id="landAreaAcres"
                className="field tabular"
                inputMode="decimal"
                value={f.landAreaAcres}
                onChange={(e) => set('landAreaAcres', e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
          </div>
        </div>
      </Group>

      <Group title="Location">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="citySlug" label="City" error={err('citySlug')}>
            <select
              id="citySlug"
              className="field"
              value={f.citySlug}
              onChange={(e) => setF((s) => ({ ...s, citySlug: e.target.value, localitySlug: '' }))}
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="localitySlug" label="Locality" error={err('localitySlug')}>
            <select
              id="localitySlug"
              className="field"
              value={f.localitySlug}
              disabled={!city}
              onChange={(e) => set('localitySlug', e.target.value)}
            >
              <option value="">Select locality</option>
              {[...(city?.localities ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field id="address" label="Address or landmark" error={err('address')}>
            <input
              id="address"
              className="field"
              maxLength={200}
              value={f.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="e.g. Near 200 ft bypass, Ajmer Road"
            />
          </Field>
        </div>
        <div className="mt-5">
          <PinPicker
            value={f.location}
            onChange={(v) => set('location', v)}
            fallbackCenter={locality?.center ?? null}
            label="Project location on the map"
          />
          {err('location') && <p className="field-error">{err('location')}</p>}
        </div>
      </Group>

      <Group title="Unit types and prices">
        {err('configurations') && <p className="field-error mb-3">{err('configurations')}</p>}
        <ul className="space-y-4">
          {f.configurations.map((c, i) => {
            const e = (k: string) => err(`configurations.${i}.${k}`);
            return (
              <li key={i} className="rounded-xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field id={`c${i}-type`} label="Type" error={e('unitType')}>
                    <select
                      id={`c${i}-type`}
                      className="field"
                      value={c.unitType}
                      onChange={(ev) =>
                        setConfig(i, { unitType: ev.target.value as ProjectUnitType })
                      }
                    >
                      {PROJECT_UNIT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {PROPERTY_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {hasRooms(c.unitType) ? (
                    <Field id={`c${i}-bhk`} label="BHK" error={e('bedrooms')}>
                      <select
                        id={`c${i}-bhk`}
                        className="field"
                        value={c.bedrooms}
                        onChange={(ev) => setConfig(i, { bedrooms: ev.target.value })}
                      >
                        {[1, 2, 3, 4, 5, 6].map((b) => (
                          <option key={b} value={b}>
                            {b} BHK
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <span />
                  )}
                  <Field id={`c${i}-amin`} label="Smallest (sq ft)" error={e('minAreaSqft')}>
                    <input
                      id={`c${i}-amin`}
                      className="field tabular"
                      inputMode="numeric"
                      value={c.minAreaSqft}
                      onChange={(ev) => setConfig(i, { minAreaSqft: digits(ev.target.value) })}
                    />
                  </Field>
                  <Field id={`c${i}-amax`} label="Largest (sq ft)" error={e('maxAreaSqft')}>
                    <input
                      id={`c${i}-amax`}
                      className="field tabular"
                      inputMode="numeric"
                      value={c.maxAreaSqft}
                      onChange={(ev) => setConfig(i, { maxAreaSqft: digits(ev.target.value) })}
                    />
                  </Field>
                  <Field
                    id={`c${i}-pmin`}
                    label="Lowest price (₹)"
                    error={e('minPrice')}
                    hint={num(c.minPrice) ? formatINRShort(num(c.minPrice)!) : undefined}
                  >
                    <input
                      id={`c${i}-pmin`}
                      className="field tabular"
                      inputMode="numeric"
                      value={c.minPrice}
                      onChange={(ev) => setConfig(i, { minPrice: digits(ev.target.value) })}
                    />
                  </Field>
                  <Field
                    id={`c${i}-pmax`}
                    label="Highest price (₹)"
                    error={e('maxPrice')}
                    hint={num(c.maxPrice) ? formatINRShort(num(c.maxPrice)!) : undefined}
                  >
                    <input
                      id={`c${i}-pmax`}
                      className="field tabular"
                      inputMode="numeric"
                      value={c.maxPrice}
                      onChange={(ev) => setConfig(i, { maxPrice: digits(ev.target.value) })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field
                      id={`c${i}-plan`}
                      label="Floor plan image (optional)"
                      error={e('floorPlanUrl')}
                    >
                      <FloorPlanUpload
                        id={`c${i}-plan`}
                        value={c.floorPlanUrl}
                        uploadPath={uploadPath}
                        onChange={(url) => setConfig(i, { floorPlanUrl: url })}
                      />
                    </Field>
                  </div>
                </div>
                {f.configurations.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm mt-3 text-danger"
                    onClick={() =>
                      setF((s) => ({
                        ...s,
                        configurations: s.configurations.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <TrashIcon size={15} /> Remove this unit type
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {f.configurations.length < 20 && (
          <button
            type="button"
            className="btn btn-outline btn-sm mt-4"
            onClick={() =>
              setF((s) => ({ ...s, configurations: [...s.configurations, emptyConfig()] }))
            }
          >
            <PlusIcon size={15} /> Add unit type
          </button>
        )}
      </Group>

      <Group title="Amenities">
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const on = f.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set('amenities', on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])
                }
                className={`chip ${on ? 'chip-active' : ''}`}
              >
                {on && <CheckIcon size={14} />} {AMENITY_LABELS[a]}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Photos, description and documents">
        <ImageManager
          images={f.images}
          title={f.name}
          uploadPath={uploadPath}
          onChange={(images, cover) => setF((s) => ({ ...s, images, coverImageIndex: cover }))}
        />
        {err('images') && <p className="field-error">{err('images')}</p>}
        <div className="mt-6 space-y-4">
          <Field
            id="description"
            label="Description"
            hint="At least 30 characters: the builder, construction quality, layout and what is nearby."
            error={err('description')}
          >
            <textarea
              id="description"
              className="field min-h-44"
              maxLength={6000}
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <Field
            id="highlights"
            label="Highlights (optional)"
            hint="One per line, up to 12."
            error={err('highlights')}
          >
            <textarea
              id="highlights"
              className="field"
              value={f.highlights}
              onChange={(e) => set('highlights', e.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="brochureUrl"
              label="Brochure link (optional)"
              hint="An HTTPS link to a PDF, e.g. on Google Drive."
              error={err('brochureUrl')}
            >
              <input
                id="brochureUrl"
                type="url"
                className="field"
                value={f.brochureUrl}
                onChange={(e) => set('brochureUrl', e.target.value)}
              />
            </Field>
            <Field
              id="videoUrl"
              label="Video (optional)"
              hint="A YouTube link."
              error={err('videoUrl')}
            >
              <input
                id="videoUrl"
                type="url"
                className="field"
                value={f.videoUrl}
                onChange={(e) => set('videoUrl', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Group>

      {staff && (
        <Group title="Staff settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="slug"
              label="URL slug"
              hint="Changing it breaks old links."
              error={err('slug')}
            >
              <input
                id="slug"
                className="field"
                value={f.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
              />
            </Field>
            <Check checked={f.featured} onChange={(v) => set('featured', v)} label="Featured" />
            <Field id="seoTitle" label="SEO title" error={err('seoTitle')}>
              <input
                id="seoTitle"
                className="field"
                maxLength={70}
                value={f.seoTitle}
                onChange={(e) => set('seoTitle', e.target.value)}
              />
            </Field>
            <Field id="seoDescription" label="SEO description" error={err('seoDescription')}>
              <input
                id="seoDescription"
                className="field"
                maxLength={170}
                value={f.seoDescription}
                onChange={(e) => set('seoDescription', e.target.value)}
              />
            </Field>
          </div>
        </Group>
      )}
    </div>
  );
}

/** One image: upload a file, or keep the current one. */
function FloorPlanUpload({
  id,
  value,
  uploadPath,
  onChange,
}: {
  id: string;
  value: string;
  uploadPath: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('files', file);
    try {
      const { data } = await apiFetch<{ ok: boolean; image?: { url: string }; error?: string }[]>(
        uploadPath,
        { method: 'POST', form },
      );
      const first = data[0];
      if (first?.ok && first.image) onChange(first.image.url);
      else setError(first?.error ?? 'Upload failed');
    } catch {
      setError('Upload failed. Try a smaller JPG or PNG.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        <>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand hover:underline"
          >
            View current plan
          </a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
            Remove
          </button>
        </>
      ) : (
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      )}
      {busy && <span className="text-sm text-ink-muted">Uploading…</span>}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
